import { NextResponse } from 'next/server';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'USER';
  department?: string;
  phone?: string;
  is_active: boolean;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// Mock data for users
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@misopin.com',
    name: '김관리자',
    role: 'SUPER_ADMIN',
    department: '경영지원부',
    phone: '010-1234-5678',
    is_active: true,
    email_verified: true,
    last_login: '2025-01-17T10:30:00',
    created_at: '2024-01-01T00:00:00',
    updated_at: '2025-01-17T10:30:00'
  },
  {
    id: '2',
    email: 'doctor.lee@misopin.com',
    name: '이의사',
    role: 'ADMIN',
    department: '진료부',
    phone: '010-2345-6789',
    is_active: true,
    email_verified: true,
    last_login: '2025-01-17T09:15:00',
    created_at: '2024-02-15T00:00:00',
    updated_at: '2025-01-17T09:15:00'
  },
  {
    id: '3',
    email: 'nurse.park@misopin.com',
    name: '박간호사',
    role: 'EDITOR',
    department: '간호부',
    phone: '010-3456-7890',
    is_active: true,
    email_verified: true,
    last_login: '2025-01-16T14:20:00',
    created_at: '2024-03-10T00:00:00',
    updated_at: '2025-01-16T14:20:00'
  },
  {
    id: '4',
    email: 'staff.kim@misopin.com',
    name: '김직원',
    role: 'EDITOR',
    department: '원무부',
    phone: '010-4567-8901',
    is_active: true,
    email_verified: true,
    last_login: '2025-01-17T08:00:00',
    created_at: '2024-04-20T00:00:00',
    updated_at: '2025-01-17T08:00:00'
  },
  {
    id: '5',
    email: 'inactive@misopin.com',
    name: '최퇴사',
    role: 'USER',
    department: '경영지원부',
    phone: '010-5678-9012',
    is_active: false,
    email_verified: true,
    last_login: '2024-12-31T17:30:00',
    created_at: '2024-01-15T00:00:00',
    updated_at: '2024-12-31T17:30:00'
  },
  {
    id: '6',
    email: 'new.staff@misopin.com',
    name: '신입직원',
    role: 'USER',
    department: '마케팅부',
    phone: '010-6789-0123',
    is_active: true,
    email_verified: false,
    last_login: undefined,
    created_at: '2025-01-15T00:00:00',
    updated_at: '2025-01-15T00:00:00'
  }
];

// Helper to generate temporary password
function generateTempPassword(): string {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const isActive = searchParams.get('is_active');
  const search = searchParams.get('search');

  let filtered = [...mockUsers];

  // Filter by role
  if (role && role !== 'all') {
    filtered = filtered.filter(user => user.role === role);
  }

  // Filter by active status
  if (isActive !== null) {
    filtered = filtered.filter(user => user.is_active === (isActive === 'true'));
  }

  // Search by name or email
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(user =>
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      user.department?.toLowerCase().includes(searchLower)
    );
  }

  // Sort by last login (most recent first)
  filtered.sort((a, b) => {
    if (!a.last_login) return 1;
    if (!b.last_login) return -1;
    return new Date(b.last_login).getTime() - new Date(a.last_login).getTime();
  });

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const body = await request.json();

  // Check if email already exists
  if (mockUsers.some(u => u.email === body.email)) {
    return NextResponse.json(
      { error: 'Email already exists' },
      { status: 400 }
    );
  }

  const newUser: User = {
    id: Date.now().toString(),
    email: body.email,
    name: body.name,
    role: body.role || 'USER',
    department: body.department,
    phone: body.phone,
    is_active: body.is_active !== false,
    email_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  mockUsers.push(newUser);

  // Return user with temporary password
  return NextResponse.json({
    user: newUser,
    tempPassword: generateTempPassword(),
    message: '사용자가 생성되었습니다. 임시 비밀번호가 이메일로 전송됩니다.'
  }, { status: 201 });
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const index = mockUsers.findIndex(u => u.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // Handle password reset
  if (body.resetPassword) {
    const tempPassword = generateTempPassword();
    return NextResponse.json({
      message: '비밀번호가 재설정되었습니다.',
      tempPassword,
      email: mockUsers[index].email
    });
  }

  // Update user data
  mockUsers[index] = {
    ...mockUsers[index],
    ...body,
    updated_at: new Date().toISOString()
  };

  return NextResponse.json(mockUsers[index]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  const index = mockUsers.findIndex(u => u.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // Don't actually delete, just deactivate
  mockUsers[index].is_active = false;
  mockUsers[index].updated_at = new Date().toISOString();

  return NextResponse.json({
    success: true,
    message: '사용자가 비활성화되었습니다.'
  });
}