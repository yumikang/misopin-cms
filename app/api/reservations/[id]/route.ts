import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/reservations/[id]
 * Update reservation status
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Validate status
    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status',
          details: `Status must be one of: ${validStatuses.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (body.status) {
      updateData.status = body.status;
      updateData.statusChangedAt = new Date();
    }

    if (body.adminNotes !== undefined) {
      updateData.adminNotes = body.adminNotes;
    }

    // Update reservation
    const updated = await prisma.reservations.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        statusChangedAt: updated.statusChangedAt,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating reservation:', error);

    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reservation not found'
        },
        { status: 404 }
      );
    }

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

/**
 * GET /api/reservations/[id]
 * Get single reservation
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const reservation = await prisma.reservations.findUnique({
      where: { id }
    });

    if (!reservation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Reservation not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: reservation.id,
        patient_name: reservation.patientName,
        patient_phone: reservation.phone,
        patient_email: reservation.email,
        reservation_date: reservation.preferredDate.toISOString().split('T')[0],
        reservation_time: reservation.preferredTime,
        department: reservation.service,
        purpose: reservation.treatmentType === 'FIRST_VISIT' ? '초진' : '재진',
        status: reservation.status,
        notes: reservation.notes,
        admin_notes: reservation.adminNotes,
        period: reservation.period,
        timeSlotStart: reservation.timeSlotStart,
        timeSlotEnd: reservation.timeSlotEnd,
        serviceName: reservation.serviceName,
        estimatedDuration: reservation.estimatedDuration,
        created_at: reservation.createdAt.toISOString(),
        updated_at: reservation.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching reservation:', error);

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
