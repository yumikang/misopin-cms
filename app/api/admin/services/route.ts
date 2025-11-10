/**
 * Service Management API - Admin CRUD Operations
 *
 * GET /api/admin/services - List all services with filtering
 * POST /api/admin/services - Create new service
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import {
  ServiceCreateSchema,
  ServiceFilterSchema,
  type ServiceCreateInput,
  type ServiceFilterInput
} from './validation';

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * JWT token verification
 */
function verifyToken(request: NextRequest): JwtPayload | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key'
    ) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Role-based authorization check
 */
function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: { [key: string]: number } = {
    'SUPER_ADMIN': 3,
    'ADMIN': 2,
    'EDITOR': 1
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * GET /api/admin/services
 *
 * Retrieve all services with optional filtering and sorting
 *
 * Query Parameters:
 * - active: boolean (filter by active status)
 * - category: string (filter by category)
 * - search: string (search in name/description)
 * - sortBy: 'name' | 'displayOrder' | 'createdAt' | 'durationMinutes'
 * - sortOrder: 'asc' | 'desc'
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const filterParams: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      filterParams[key] = value;
    });

    const validationResult = ServiceFilterSchema.safeParse(filterParams);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const filters = validationResult.data;

    // Build Prisma where clause
    const where: Prisma.servicesWhereInput = {};

    if (filters.active !== undefined) {
      where.isActive = filters.active;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // Build orderBy clause
    const orderBy: Prisma.servicesOrderByWithRelationInput = {};
    const sortBy = filters.sortBy || 'displayOrder';
    const sortOrder = filters.sortOrder || 'asc';

    orderBy[sortBy] = sortOrder;

    // Fetch services with relations
    const services = await prisma.services.findMany({
      where,
      orderBy,
      include: {
        _count: {
          select: {
            reservations: true,
            clinic_time_slots: true,
            manual_time_closures: true
          }
        },
        service_reservation_limits: {
          select: {
            id: true,
            dailyLimitMinutes: true,
            isActive: true
          }
        }
      }
    });

    // Transform response to include computed fields
    const transformedServices = services.map(service => ({
      ...service,
      totalMinutes: service.durationMinutes + service.bufferMinutes,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: transformedServices,
      count: transformedServices.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch services',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/services
 *
 * Create a new service
 *
 * Required role: ADMIN or SUPER_ADMIN
 *
 * Request Body:
 * - code: string (unique, uppercase with underscores)
 * - name: string (service name)
 * - description?: string (optional description)
 * - category?: string (optional category)
 * - durationMinutes: number (10-480)
 * - bufferMinutes?: number (0-60, default: 10)
 * - isActive?: boolean (default: true)
 * - displayOrder?: number (auto-assigned if not provided)
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication and authorization check
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasRole(user.role, 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin role required' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ServiceCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check for duplicate code
    const existingService = await prisma.services.findUnique({
      where: { code: data.code }
    });

    if (existingService) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate service code',
          details: `Service with code '${data.code}' already exists`
        },
        { status: 409 }
      );
    }

    // Auto-assign displayOrder if not provided
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await prisma.services.aggregate({
        _max: {
          displayOrder: true
        }
      });
      displayOrder = (maxOrder._max.displayOrder || 0) + 1;
    }

    // Create service
    const newService = await prisma.services.create({
      data: {
        id: `service_${nanoid(10)}`,
        code: data.code,
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        durationMinutes: data.durationMinutes,
        bufferMinutes: data.bufferMinutes,
        isActive: data.isActive,
        displayOrder: displayOrder,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            reservations: true,
            clinic_time_slots: true,
            manual_time_closures: true
          }
        },
        service_reservation_limits: {
          select: {
            id: true,
            dailyLimitMinutes: true,
            isActive: true
          }
        }
      }
    });

    // Transform response
    const transformedService = {
      ...newService,
      totalMinutes: newService.durationMinutes + newService.bufferMinutes,
      createdAt: newService.createdAt.toISOString(),
      updatedAt: newService.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Service created successfully',
      data: transformedService,
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating service:', error);

    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate entry',
          details: 'A service with this code already exists'
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create service',
        details: error.message
      },
      { status: 500 }
    );
  }
}
