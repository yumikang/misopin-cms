/**
 * Service Reorder API
 *
 * PUT /api/admin/services/reorder - Batch update display order
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { ServiceReorderSchema, type ServiceReorderInput } from '../validation';

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
 * PUT /api/admin/services/reorder
 *
 * Batch update display order for multiple services
 *
 * Required role: ADMIN or SUPER_ADMIN
 *
 * Request Body:
 * {
 *   services: [
 *     { id: string, displayOrder: number },
 *     { id: string, displayOrder: number },
 *     ...
 *   ]
 * }
 *
 * This endpoint allows reordering services in a single transaction
 * Useful for drag-and-drop reordering functionality
 */
export async function PUT(request: NextRequest) {
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
    const validationResult = ServiceReorderSchema.safeParse(body);

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

    const { services } = validationResult.data;

    // Verify all service IDs exist
    const serviceIds = services.map(s => s.id);
    const existingServices = await prisma.services.findMany({
      where: {
        id: {
          in: serviceIds
        }
      },
      select: {
        id: true
      }
    });

    const existingIds = new Set(existingServices.map(s => s.id));
    const missingIds = serviceIds.filter(id => !existingIds.has(id));

    if (missingIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid service IDs',
          details: `The following service IDs do not exist: ${missingIds.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Perform batch update in a transaction
    const updatePromises = services.map(service =>
      prisma.services.update({
        where: { id: service.id },
        data: {
          displayOrder: service.displayOrder,
          updatedAt: new Date()
        }
      })
    );

    await prisma.$transaction(updatePromises);

    return NextResponse.json({
      success: true,
      message: 'Display order updated successfully',
      count: services.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error reordering services:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reorder services',
        details: error.message
      },
      { status: 500 }
    );
  }
}
