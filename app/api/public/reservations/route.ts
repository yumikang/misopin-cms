import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Gender, TreatmentType, ReservationStatus, ServiceType, Period } from '@prisma/client';
import { validateTimeSlotAvailability } from '@/lib/reservations/time-slot-calculator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'patient_name',
      'phone',
      'birth_date',
      'gender',
      'treatment_type',
      'service',
      'preferred_date',
      'preferred_time'
    ];

    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          fields: missingFields
        },
        { status: 400 }
      );
    }

    // Convert dates from string to Date objects
    const birthDate = new Date(body.birth_date);
    const preferredDate = new Date(body.preferred_date);

    // Validate dates
    if (isNaN(birthDate.getTime()) || isNaN(preferredDate.getTime())) {
      return NextResponse.json(
        {
          error: 'Invalid date format',
          details: 'birth_date and preferred_date must be valid date strings'
        },
        { status: 400 }
      );
    }

    // Service type
    const serviceType = body.service as ServiceType;
    const preferredTime = body.preferred_time; // "09:00" format

    // Determine period from preferred time
    let period: Period | null = null;
    let timeSlotStart: string | null = null;
    let timeSlotEnd: string | null = null;
    let serviceId: string | null = null;
    let serviceName: string | null = null;
    let estimatedDuration: number | null = null;

    // Parse time to determine period
    const timeMatch = preferredTime.match(/^(\d{2}):(\d{2})$/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1], 10);
      period = hour < 12 ? Period.MORNING : Period.AFTERNOON;
      timeSlotStart = preferredTime;
    }

    // Try to fetch service info for new time-based system
    try {
      const service = await prisma.services.findUnique({
        where: { code: serviceType },
        select: {
          id: true,
          name: true,
          durationMinutes: true,
          bufferMinutes: true
        }
      });

      if (service) {
        serviceId = service.id;
        serviceName = service.name;
        estimatedDuration = service.durationMinutes;

        // Calculate timeSlotEnd
        if (timeSlotStart) {
          const [hours, minutes] = timeSlotStart.split(':').map(Number);
          const totalMinutes = hours * 60 + minutes + service.durationMinutes;
          const endHours = Math.floor(totalMinutes / 60);
          const endMinutes = totalMinutes % 60;
          timeSlotEnd = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
        }

        // Validate time slot availability (TIME-BASED SYSTEM - MANDATORY)
        if (!period || !timeSlotStart || !serviceId) {
          throw new Error('SERVICE_NOT_CONFIGURED');
        }

        await validateTimeSlotAvailability(
          serviceType,
          preferredDate.toISOString().split('T')[0],
          timeSlotStart,
          period
        );
      }
    } catch (serviceError: any) {
      // Service not found or validation failed
      if (serviceError.code === 'TIME_SLOT_FULL') {
        return NextResponse.json(
          {
            error: 'Time slot not available',
            message: serviceError.message,
            code: serviceError.code,
            suggestedTimes: serviceError.metadata?.suggestedTimes || []
          },
          {
            status: 409,
            headers: {
              'Access-Control-Allow-Origin': '*',
            }
          }
        );
      }
      throw serviceError;
    }

    // Create reservation (TIME-BASED SYSTEM)
    const reservation = await prisma.reservations.create({
      data: {
        id: crypto.randomUUID(),
        patientName: body.patient_name,
        phone: body.phone,
        email: body.email || null,
        birthDate: birthDate,
        gender: body.gender as Gender,
        treatmentType: body.treatment_type as TreatmentType,
        // LEGACY FIELDS (for backward compatibility)
        service: serviceType,
        preferredDate: preferredDate,
        preferredTime: body.preferred_time,
        // NEW TIME-BASED FIELDS
        serviceId: serviceId,
        serviceName: serviceName,
        estimatedDuration: estimatedDuration,
        period: period,
        timeSlotStart: timeSlotStart,
        timeSlotEnd: timeSlotEnd,
        // STATUS FIELDS
        status: 'PENDING' as ReservationStatus,
        notes: body.notes || null,
        adminNotes: null,
        statusChangedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Send success response
    return NextResponse.json(
      {
        success: true,
        reservation: {
          id: reservation.id,
          status: reservation.status,
          preferred_date: reservation.preferredDate.toISOString().split('T')[0],
          preferred_time: reservation.preferredTime
        },
        message: '예약이 성공적으로 접수되었습니다. 확인 후 연락드리겠습니다.'
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  } catch (error) {
    console.error('Reservation error:', error);

    // Handle specific error: service not configured
    if (error instanceof Error && error.message === 'SERVICE_NOT_CONFIGURED') {
      return NextResponse.json(
        {
          error: 'Service configuration error',
          message: '해당 시술이 시스템에 등록되지 않았습니다. 관리자에게 문의하세요.'
        },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}