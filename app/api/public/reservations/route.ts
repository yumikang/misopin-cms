import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

    // Create reservation in Supabase
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .insert([{
        patient_name: body.patient_name,
        phone: body.phone,
        email: body.email || null,
        birth_date: body.birth_date,
        gender: body.gender,
        treatment_type: body.treatment_type,
        service: body.service,
        preferred_date: body.preferred_date,
        preferred_time: body.preferred_time,
        status: 'PENDING',
        notes: body.notes || null,
        admin_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating reservation:', error);
      return NextResponse.json(
        { error: 'Failed to create reservation' },
        { status: 500 }
      );
    }

    // Send success response
    return NextResponse.json(
      {
        success: true,
        reservation: {
          id: data.id,
          status: data.status,
          preferred_date: data.preferred_date,
          preferred_time: data.preferred_time
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