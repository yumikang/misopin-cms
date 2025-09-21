import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client without Database type
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wizlegjvfapykufzrojl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpemxlZ2p2ZmFweWt1Znpyb2psIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA4MDk4OSwiZXhwIjoyMDczNjU2OTg5fQ.HRknUNazo3GE068z-VwqEOcGqmTMhu__v_RsnhV7SeI';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Define types locally
type ReservationInsert = {
  patient_name: string;
  phone: string;
  email?: string | null;
  birth_date: string;
  gender: 'MALE' | 'FEMALE';
  treatment_type: 'FIRST_VISIT' | 'FOLLOW_UP';
  service: string;
  preferred_date: string;
  preferred_time: string;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  notes?: string | null;
  admin_notes?: string | null;
};

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

    // Create properly typed reservation data
    const reservationData: ReservationInsert = {
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
      admin_notes: null
    };

    // Insert into database
    const { data, error } = await supabaseAdmin
      .from('reservations')
      .insert([reservationData])
      .select()
      .single();

    if (error) {
      console.error('Error creating reservation:', error);
      return NextResponse.json(
        {
          error: 'Failed to create reservation',
          details: error.message,
          code: error.code
        },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No data returned from database' },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        }
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