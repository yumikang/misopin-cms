import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Gender, TreatmentType, ReservationStatus, ServiceType } from '@prisma/client';
import { canCreateReservation } from '@/lib/reservations/daily-limit-counter';

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

    // Create reservation with limit validation using transaction
    const reservation = await prisma.$transaction(async (tx) => {
      // 1. Check if reservation can be created (uses FOR UPDATE lock)
      const canCreate = await canCreateReservation(tx, preferredDate, serviceType);

      if (!canCreate) {
        throw new Error('RESERVATION_FULL');
      }

      // 2. Create reservation
      const newReservation = await tx.reservations.create({
        data: {
          id: crypto.randomUUID(),
          patientName: body.patient_name,
          phone: body.phone,
          email: body.email || null,
          birthDate: birthDate,
          gender: body.gender as Gender,
          treatmentType: body.treatment_type as TreatmentType,
          service: serviceType,
          preferredDate: preferredDate,
          preferredTime: body.preferred_time,
          status: 'PENDING' as ReservationStatus,
          notes: body.notes || null,
          adminNotes: null,
          statusChangedAt: new Date(),
          updatedAt: new Date()
        }
      });

      return newReservation;
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

    // Handle specific error: reservation limit reached
    if (error instanceof Error && error.message === 'RESERVATION_FULL') {
      return NextResponse.json(
        {
          error: 'Reservation limit reached',
          message: '해당 날짜의 예약이 마감되었습니다. 다른 날짜를 선택해 주세요.'
        },
        {
          status: 409,
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