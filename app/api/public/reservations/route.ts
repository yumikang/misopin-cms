import { NextRequest, NextResponse } from 'next/server';

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

    // For now, return mock success response
    // TODO: Implement proper database integration when Supabase types are fixed
    const mockReservation = {
      id: `res_${Date.now()}`,
      status: 'PENDING',
      preferred_date: body.preferred_date,
      preferred_time: body.preferred_time
    };

    // Send success response
    return NextResponse.json(
      {
        success: true,
        reservation: mockReservation,
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
      { error: 'Internal server error' },
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