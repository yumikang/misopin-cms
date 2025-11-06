import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma, Period } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Build dynamic where clause based on query parameters
    const where: Prisma.reservationsWhereInput = {};

    // Date filter
    const date = searchParams.get('date');
    if (date) {
      const targetDate = new Date(date);
      where.preferredDate = {
        gte: new Date(targetDate.setHours(0, 0, 0, 0)),
        lt: new Date(targetDate.setHours(23, 59, 59, 999))
      };
    }

    // Status filter
    const status = searchParams.get('status');
    if (status && status !== 'all') {
      where.status = status as any;
    }

    // Department/Service filter
    const department = searchParams.get('department');
    if (department && department !== 'all') {
      where.service = department as any;
    }

    // Search filter (name or phone)
    const search = searchParams.get('search');
    if (search) {
      where.OR = [
        { patientName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ];
    }

    // Period filter (for time-slot based view)
    const period = searchParams.get('period');
    if (period && period !== 'all') {
      where.period = period as any;
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await prisma.reservations.count({ where });

    // Get reservations from database with filters
    const reservations = await prisma.reservations.findMany({
      where,
      orderBy: [
        { preferredDate: 'desc' },
        { preferredTime: 'asc' }
      ],
      take: limit,
      skip
    });

    // Transform data to match frontend expectations
    const transformedData = reservations.map(reservation => ({
      id: reservation.id,
      patient_name: reservation.patientName,
      patient_phone: reservation.phone,
      patient_email: reservation.email,
      reservation_date: reservation.preferredDate.toISOString().split('T')[0],
      reservation_time: reservation.preferredTime,
      department: reservation.service,
      doctor_name: '',
      purpose: reservation.treatmentType === 'FIRST_VISIT' ? '초진' : '재진',
      status: reservation.status,
      notes: reservation.notes,
      admin_notes: reservation.adminNotes,
      created_at: reservation.createdAt.toISOString(),
      updated_at: reservation.updatedAt.toISOString(),
      // Include time slot fields for new admin UI
      period: reservation.period,
      timeSlotStart: reservation.timeSlotStart,
      timeSlotEnd: reservation.timeSlotEnd,
      serviceName: reservation.serviceName,
      estimatedDuration: reservation.estimatedDuration
    }));

    // Return consistent response format
    const returnPagination = searchParams.get('paginate') === 'true';

    if (returnPagination) {
      return NextResponse.json({
        success: true,
        data: transformedData,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } else {
      // Return with success flag for timeline view
      return NextResponse.json({
        success: true,
        data: transformedData,
        total
      });
    }
  } catch (error) {
    console.error('Error in reservations GET:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Keep mock data for reference
interface Reservation {
  id: string;
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  reservation_date: string;
  reservation_time: string;
  department: string;
  doctor_name?: string;
  purpose: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
}

// Mock data for reservations (kept for reference)
const mockReservations: Reservation[] = [
  {
    id: '1',
    patient_name: '김환자',
    patient_phone: '010-1111-2222',
    patient_email: 'kim@example.com',
    reservation_date: '2025-01-20',
    reservation_time: '09:00',
    department: '내과',
    doctor_name: '이의사',
    purpose: '정기 검진',
    status: 'CONFIRMED',
    notes: '고혈압 약 처방 필요',
    created_at: '2025-01-15T10:00:00',
    updated_at: '2025-01-16T14:00:00',
    confirmed_at: '2025-01-16T14:00:00'
  },
  {
    id: '2',
    patient_name: '박환자',
    patient_phone: '010-2222-3333',
    patient_email: 'park@example.com',
    reservation_date: '2025-01-20',
    reservation_time: '10:30',
    department: '정형외과',
    doctor_name: '김의사',
    purpose: '무릎 통증 상담',
    status: 'PENDING',
    created_at: '2025-01-17T08:30:00',
    updated_at: '2025-01-17T08:30:00'
  },
  {
    id: '3',
    patient_name: '이환자',
    patient_phone: '010-3333-4444',
    reservation_date: '2025-01-20',
    reservation_time: '14:00',
    department: '피부과',
    doctor_name: '최의사',
    purpose: '여드름 치료',
    status: 'CONFIRMED',
    notes: '알레르기 있음 - 페니실린',
    created_at: '2025-01-14T16:20:00',
    updated_at: '2025-01-15T09:00:00',
    confirmed_at: '2025-01-15T09:00:00'
  },
  {
    id: '4',
    patient_name: '정환자',
    patient_phone: '010-4444-5555',
    patient_email: 'jung@example.com',
    reservation_date: '2025-01-19',
    reservation_time: '11:00',
    department: '내과',
    doctor_name: '이의사',
    purpose: '감기 증상',
    status: 'COMPLETED',
    notes: '처방전 발행 완료',
    created_at: '2025-01-18T13:00:00',
    updated_at: '2025-01-19T11:30:00'
  },
  {
    id: '5',
    patient_name: '최환자',
    patient_phone: '010-5555-6666',
    reservation_date: '2025-01-21',
    reservation_time: '15:30',
    department: '이비인후과',
    doctor_name: '강의사',
    purpose: '비염 상담',
    status: 'CANCELLED',
    cancel_reason: '개인 사정',
    created_at: '2025-01-16T11:00:00',
    updated_at: '2025-01-17T10:00:00',
    cancelled_at: '2025-01-17T10:00:00'
  },
  {
    id: '6',
    patient_name: '강환자',
    patient_phone: '010-6666-7777',
    patient_email: 'kang@example.com',
    reservation_date: '2025-01-22',
    reservation_time: '09:30',
    department: '소아과',
    doctor_name: '윤의사',
    purpose: '예방 접종',
    status: 'PENDING',
    notes: '독감 예방접종',
    created_at: '2025-01-17T15:45:00',
    updated_at: '2025-01-17T15:45:00'
  },
  {
    id: '7',
    patient_name: '조환자',
    patient_phone: '010-7777-8888',
    reservation_date: '2025-01-18',
    reservation_time: '16:00',
    department: '내과',
    doctor_name: '이의사',
    purpose: '당뇨 검사',
    status: 'NO_SHOW',
    created_at: '2025-01-15T09:00:00',
    updated_at: '2025-01-18T16:30:00'
  },
  {
    id: '8',
    patient_name: '윤환자',
    patient_phone: '010-8888-9999',
    patient_email: 'yoon@example.com',
    reservation_date: '2025-01-23',
    reservation_time: '13:00',
    department: '가정의학과',
    doctor_name: '서의사',
    purpose: '종합 검진',
    status: 'CONFIRMED',
    notes: '공복 상태 유지 필요',
    created_at: '2025-01-17T14:20:00',
    updated_at: '2025-01-17T16:00:00',
    confirmed_at: '2025-01-17T16:00:00'
  }
];

// Available time slots
const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.patient_name || !body.patient_phone || !body.reservation_date || !body.reservation_time || !body.department) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Check for time slot availability in real database
    const reservationDate = new Date(body.reservation_date);
    const existingReservations = await prisma.reservations.findMany({
      where: {
        preferredDate: {
          gte: new Date(reservationDate.setHours(0, 0, 0, 0)),
          lt: new Date(reservationDate.setHours(23, 59, 59, 999))
        },
        service: body.department,
        preferredTime: body.reservation_time,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      }
    });

    if (existingReservations.length > 0) {
      return NextResponse.json(
        { error: '해당 시간대는 이미 예약이 있습니다.' },
        { status: 400 }
      );
    }

    // Create new reservation in database
    const { randomUUID } = await import('crypto');
    const newReservation = await prisma.reservations.create({
      data: {
        id: randomUUID(),
        patientName: body.patient_name,
        phone: body.patient_phone,
        email: body.patient_email || null,
        birthDate: body.birth_date ? new Date(body.birth_date) : new Date('1990-01-01'), // Default if not provided
        gender: body.gender || 'FEMALE', // Default gender
        treatmentType: body.purpose === '초진' ? 'FIRST_VISIT' : 'FOLLOW_UP',
        preferredDate: new Date(body.reservation_date),
        preferredTime: body.reservation_time,
        service: body.department,
        status: 'PENDING',
        notes: body.notes || null,
        updatedAt: new Date(),
        // Support both legacy and new time slot fields
        period: body.period || null,
        timeSlotStart: body.time_slot_start || body.reservation_time,
        timeSlotEnd: body.time_slot_end || null,
        estimatedDuration: body.service_duration || null
      }
    });

    // Transform response to match frontend expectations
    const response = {
      id: newReservation.id,
      patient_name: newReservation.patientName,
      patient_phone: newReservation.phone,
      patient_email: newReservation.email,
      reservation_date: newReservation.preferredDate.toISOString().split('T')[0],
      reservation_time: newReservation.preferredTime,
      department: newReservation.service,
      doctor_name: '',
      purpose: newReservation.treatmentType === 'FIRST_VISIT' ? '초진' : '재진',
      status: newReservation.status,
      notes: newReservation.notes,
      created_at: newReservation.createdAt.toISOString(),
      updated_at: newReservation.updatedAt.toISOString()
    };

    return NextResponse.json({
      reservation: response,
      message: '예약이 접수되었습니다. 확인 후 연락드리겠습니다.'
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/reservations:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Reservation ID is required' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    // Get existing reservation from database
    const existingReservation = await prisma.reservations.findUnique({
      where: { id }
    });

    if (!existingReservation) {
      console.error('Reservation not found');
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Validate status transitions
    if (body.status) {
      const currentStatus = existingReservation.status;

      if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
        return NextResponse.json(
          { error: '완료되거나 취소된 예약은 수정할 수 없습니다.' },
          { status: 400 }
        );
      }
    }

    // Update reservation
    // Note: No counter adjustment needed - we use real-time COUNT for availability
    const updateData: Prisma.reservationsUpdateInput = {};

    if (body.status) {
      updateData.status = body.status;
      updateData.statusChangedAt = new Date();
    }
    if (body.patient_name) updateData.patientName = body.patient_name;
    if (body.patient_phone) updateData.phone = body.patient_phone;
    if (body.patient_email !== undefined) updateData.email = body.patient_email;
    if (body.reservation_date) updateData.preferredDate = new Date(body.reservation_date);
    if (body.reservation_time) updateData.preferredTime = body.reservation_time;
    if (body.department) updateData.service = body.department;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const updatedReservation = await prisma.reservations.update({
      where: { id },
      data: updateData
    });

    // Transform response to match frontend expectations
    const response = {
      id: updatedReservation.id,
      patient_name: updatedReservation.patientName,
      patient_phone: updatedReservation.phone,
      patient_email: updatedReservation.email,
      reservation_date: updatedReservation.preferredDate.toISOString().split('T')[0],
      reservation_time: updatedReservation.preferredTime,
      department: updatedReservation.service,
      purpose: updatedReservation.treatmentType === 'FIRST_VISIT' ? '초진' : '재진',
      status: updatedReservation.status,
      notes: updatedReservation.notes,
      created_at: updatedReservation.createdAt.toISOString(),
      updated_at: updatedReservation.updatedAt.toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in PUT /api/reservations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Reservation ID is required' },
      { status: 400 }
    );
  }

  try {
    // Get existing reservation from database
    const existingReservation = await prisma.reservations.findUnique({
      where: { id }
    });

    if (!existingReservation) {
      console.error('Reservation not found');
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Cancel instead of delete
    // Note: No counter adjustment needed - we use real-time COUNT for availability
    await prisma.reservations.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        statusChangedAt: new Date(),
      }
    });

    return NextResponse.json({
      success: true,
      message: '예약이 취소되었습니다.'
    });
  } catch (error) {
    console.error('Error in DELETE /api/reservations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get available time slots for a specific date and service using real calculator
export async function OPTIONS(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const service = searchParams.get('service') || searchParams.get('department');

  if (!date || !service) {
    return NextResponse.json(
      { error: 'Date and service are required' },
      { status: 400 }
    );
  }

  try {
    console.log('[OPTIONS] Starting time slot calculation for:', { service, date });

    // Import time slot calculator dynamically
    const { calculateAvailableTimeSlots } = await import('@/lib/reservations/time-slot-calculator');

    console.log('[OPTIONS] Calculator imported, calling function...');

    // Calculate available time slots using the real calculator
    const result = await calculateAvailableTimeSlots(service, date, false);

    console.log('[OPTIONS] Calculation completed:', {
      slotsCount: result.slots.length,
      availableCount: result.slots.filter(s => s.available).length,
      serviceName: result.metadata.serviceName
    });

    // Group slots by period for easier consumption
    const slotsByPeriod = {
      MORNING: result.slots.filter(s => s.period === Period.MORNING),
      AFTERNOON: result.slots.filter(s => s.period === Period.AFTERNOON),
      EVENING: result.slots.filter(s => s.period === 'EVENING' as any)
    };

    // Get total counts
    const totalSlots = result.slots.length;
    const availableSlots = result.slots.filter(s => s.available).length;
    const occupiedSlots = totalSlots - availableSlots;

    return NextResponse.json({
      success: true,
      date,
      service,
      serviceName: result.metadata.serviceName,
      slots: result.slots,
      slotsByPeriod,
      summary: {
        totalSlots,
        availableSlots,
        occupiedSlots,
        availabilityRate: totalSlots > 0 ? (availableSlots / totalSlots * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('Error in OPTIONS /api/reservations:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}