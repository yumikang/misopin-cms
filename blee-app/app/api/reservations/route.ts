import { NextResponse } from 'next/server';

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

// Mock data for reservations
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const department = searchParams.get('department');

  let filtered = [...mockReservations];

  // Filter by date
  if (date) {
    filtered = filtered.filter(r => r.reservation_date === date);
  }

  // Filter by status
  if (status && status !== 'all') {
    filtered = filtered.filter(r => r.status === status);
  }

  // Filter by department
  if (department && department !== 'all') {
    filtered = filtered.filter(r => r.department === department);
  }

  // Search by patient name or phone
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.patient_name.toLowerCase().includes(searchLower) ||
      r.patient_phone.includes(search)
    );
  }

  // Sort by date and time
  filtered.sort((a, b) => {
    const dateCompare = a.reservation_date.localeCompare(b.reservation_date);
    if (dateCompare !== 0) return dateCompare;
    return a.reservation_time.localeCompare(b.reservation_time);
  });

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const body = await request.json();

  // Check for time slot availability
  const existingReservation = mockReservations.find(
    r => r.reservation_date === body.reservation_date &&
        r.reservation_time === body.reservation_time &&
        r.department === body.department &&
        r.status !== 'CANCELLED'
  );

  if (existingReservation) {
    return NextResponse.json(
      { error: '해당 시간대는 이미 예약이 있습니다.' },
      { status: 400 }
    );
  }

  const newReservation: Reservation = {
    id: Date.now().toString(),
    patient_name: body.patient_name,
    patient_phone: body.patient_phone,
    patient_email: body.patient_email,
    reservation_date: body.reservation_date,
    reservation_time: body.reservation_time,
    department: body.department,
    doctor_name: body.doctor_name,
    purpose: body.purpose,
    status: 'PENDING',
    notes: body.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  mockReservations.push(newReservation);

  return NextResponse.json({
    reservation: newReservation,
    message: '예약이 접수되었습니다. 확인 후 연락드리겠습니다.'
  }, { status: 201 });
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

  const body = await request.json();
  const index = mockReservations.findIndex(r => r.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'Reservation not found' },
      { status: 404 }
    );
  }

  // Handle status updates
  if (body.status) {
    const currentStatus = mockReservations[index].status;

    // Validate status transitions
    if (currentStatus === 'COMPLETED' || currentStatus === 'CANCELLED') {
      return NextResponse.json(
        { error: '완료되거나 취소된 예약은 수정할 수 없습니다.' },
        { status: 400 }
      );
    }

    // Update status timestamps
    if (body.status === 'CONFIRMED') {
      body.confirmed_at = new Date().toISOString();
    } else if (body.status === 'CANCELLED') {
      body.cancelled_at = new Date().toISOString();
    }
  }

  // Check for time slot conflict if changing time
  if (body.reservation_date || body.reservation_time) {
    const newDate = body.reservation_date || mockReservations[index].reservation_date;
    const newTime = body.reservation_time || mockReservations[index].reservation_time;
    const department = body.department || mockReservations[index].department;

    const conflict = mockReservations.find(
      r => r.id !== id &&
          r.reservation_date === newDate &&
          r.reservation_time === newTime &&
          r.department === department &&
          r.status !== 'CANCELLED'
    );

    if (conflict) {
      return NextResponse.json(
        { error: '해당 시간대는 이미 예약이 있습니다.' },
        { status: 400 }
      );
    }
  }

  mockReservations[index] = {
    ...mockReservations[index],
    ...body,
    updated_at: new Date().toISOString()
  };

  return NextResponse.json(mockReservations[index]);
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

  const index = mockReservations.findIndex(r => r.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'Reservation not found' },
      { status: 404 }
    );
  }

  // Cancel instead of delete
  mockReservations[index].status = 'CANCELLED';
  mockReservations[index].cancelled_at = new Date().toISOString();
  mockReservations[index].updated_at = new Date().toISOString();

  return NextResponse.json({
    success: true,
    message: '예약이 취소되었습니다.'
  });
}

// Get available time slots for a specific date and department
export async function OPTIONS(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const department = searchParams.get('department');

  if (!date || !department) {
    return NextResponse.json(
      { error: 'Date and department are required' },
      { status: 400 }
    );
  }

  // Get occupied slots
  const occupiedSlots = mockReservations
    .filter(r =>
      r.reservation_date === date &&
      r.department === department &&
      r.status !== 'CANCELLED'
    )
    .map(r => r.reservation_time);

  // Return available slots
  const availableSlots = timeSlots.filter(slot => !occupiedSlots.includes(slot));

  return NextResponse.json({
    date,
    department,
    availableSlots,
    totalSlots: timeSlots.length,
    occupiedSlots: occupiedSlots.length
  });
}