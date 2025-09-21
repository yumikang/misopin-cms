import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Find user in Supabase with proper typing
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, password, role, is_active')
      .eq('email', email)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Type assertion for user - we know the structure from our select
    const typedUser = user as {
      id: string;
      email: string;
      name: string;
      password: string;
      role: string;
      is_active: boolean;
    };

    // Check password
    const validPassword = await bcrypt.compare(password, typedUser.password);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!typedUser.is_active) {
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      );
    }

    // Generate token
    const token = jwt.sign(
      {
        id: typedUser.id,
        email: typedUser.email,
        role: typedUser.role,
        name: typedUser.name
      },
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      user: {
        id: typedUser.id,
        email: typedUser.email,
        name: typedUser.name,
        role: typedUser.role
      },
      token,
      success: true
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}