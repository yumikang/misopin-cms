import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Find user in Supabase
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !users) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check password
    const validPassword = await bcrypt.compare(password, users.password);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!users.isActive) {
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      );
    }

    // Generate token
    const token = jwt.sign(
      {
        id: users.id,
        email: users.email,
        role: users.role,
        name: users.name
      },
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Update last login (ignore errors if column doesn't exist)
    try {
      await supabaseAdmin
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', users.id)
        .select()
        .single();
    } catch {
      // Ignore if column doesn't exist
    }

    return NextResponse.json({
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role
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