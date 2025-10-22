import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Gender, TreatmentType, ReservationStatus, ServiceType } from '@prisma/client';

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

    // Create reservation in database using Prisma
    const reservation = await prisma.reservations.create({
      data: {
        id: crypto.randomUUID(),
        patientName: body.patient_name,
        phone: body.phone,
        email: body.email || null,
        birthDate: birthDate,
        gender: body.gender as Gender,
        treatmentType: body.treatment_type as TreatmentType,
        service: body.service as ServiceType,
        preferredDate: preferredDate,
        preferredTime: body.preferred_time,
        status: 'PENDING' as ReservationStatus,
        notes: body.notes || null,
        adminNotes: null,
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