import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hash } from "bcryptjs";

// Complete initialization - checks and creates everything needed
export async function POST() {
  try {
    const steps = [];

    // Step 1: Check if users table exists
    const { data: tables, error: tableCheckError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (tableCheckError && tableCheckError.code === '42P01') {
      // Table doesn't exist
      steps.push({
        step: 'table_check',
        status: 'missing',
        message: 'Users table does not exist. Please create it using the SQL script.'
      });

      // Return SQL script for easy copy-paste
      return NextResponse.json({
        success: false,
        error: 'Table not found',
        message: 'Please run the following SQL in Supabase SQL Editor:',
        sql: `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow Service Role to bypass RLS
CREATE POLICY "Service role can do everything" ON users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
        `,
        next_step: 'After creating the table, run this API again to add test accounts.'
      }, { status: 400 });
    }

    steps.push({
      step: 'table_check',
      status: 'exists',
      message: 'Users table found'
    });

    // Step 2: Check if any users exist
    const { data: existingUsers, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('email')
      .limit(10);

    if (userCheckError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to check users',
        details: userCheckError.message
      }, { status: 500 });
    }

    if (existingUsers && existingUsers.length > 0) {
      steps.push({
        step: 'user_check',
        status: 'exists',
        message: `Found ${existingUsers.length} existing users`,
        users: existingUsers.map(u => u.email)
      });
    }

    // Step 3: Create test accounts
    const adminPassword = await hash("admin123", 12);
    const editorPassword = await hash("editor123", 12);

    const accounts = [
      {
        email: "admin@misopin.com",
        name: "슈퍼 관리자",
        password: adminPassword,
        role: "SUPER_ADMIN",
        isActive: true,
      },
      {
        email: "manager@misopin.com",
        name: "일반 관리자",
        password: adminPassword,
        role: "ADMIN",
        isActive: true,
      },
      {
        email: "editor@misopin.com",
        name: "편집자",
        password: editorPassword,
        role: "EDITOR",
        isActive: true,
      }
    ];

    const results = [];

    for (const account of accounts) {
      // Use upsert to handle existing users
      const { data, error } = await supabaseAdmin
        .from('users')
        .upsert(account, {
          onConflict: 'email',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        results.push({
          email: account.email,
          status: 'error',
          error: error.message
        });
      } else {
        results.push({
          email: account.email,
          status: 'success',
          data: data
        });
      }
    }

    steps.push({
      step: 'user_creation',
      status: 'completed',
      results
    });

    // Step 4: Verify setup
    const { data: finalCheck } = await supabaseAdmin
      .from('users')
      .select('email, role, isActive')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      message: "✅ Database initialization completed!",
      steps,
      current_users: finalCheck,
      test_accounts: [
        { email: "admin@misopin.com", password: "admin123", role: "SUPER_ADMIN" },
        { email: "manager@misopin.com", password: "admin123", role: "ADMIN" },
        { email: "editor@misopin.com", password: "editor123", role: "EDITOR" }
      ],
      login_url: process.env.NODE_ENV === 'production'
        ? 'https://misopin-cms.vercel.app/login'
        : 'http://localhost:3000/login'
    });

  } catch (error) {
    console.error('Init error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      hint: 'Check console for details'
    }, { status: 500 });
  }
}

// GET request for browser access
export async function GET() {
  return POST();
}