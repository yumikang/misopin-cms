import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Find user in Supabase
    const result = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    const user = result.data;
    const fetchError = result.error;

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check password - user is guaranteed to exist here
    const validPassword = await bcrypt.compare(password, (user as any)?.password || '');
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!(user as any).is_active) {
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      );
    }

    // Generate token
    const token = jwt.sign(
      {
        id: (user as any).id,
        email: (user as any).email,
        role: (user as any).role,
        name: (user as any).name
      },
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Update last login (ignore errors if column doesn't exist)
    try {
      await supabaseAdmin
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', (user as any).id)
        .select()
        .single();
    } catch {
      // Ignore if column doesn't exist
    }

    return NextResponse.json({
      user: {
        id: (user as any).id,
        email: (user as any).email,
        name: (user as any).name,
        role: (user as any).role
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