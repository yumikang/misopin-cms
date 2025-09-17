import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hash } from "bcryptjs";

// Complete setup API that creates table and seeds data
export async function POST() {
  try {
    // Service Role Key is now hardcoded in supabase-admin.ts as fallback
    console.log('Starting database setup...');

    // Create admin users (table should already exist in Supabase)
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
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', account.email)
        .single();

      if (existingUser) {
        // Update existing user
        const { data, error } = await supabaseAdmin
          .from('users')
          .update(account)
          .eq('email', account.email)
          .select()
          .single();

        if (error) {
          console.error(`Error updating ${account.email}:`, error);
          results.push({ action: 'error', email: account.email, error: error.message });
        } else {
          results.push({ action: 'updated', user: data });
        }
      } else {
        // Create new user
        const { data, error } = await supabaseAdmin
          .from('users')
          .insert(account)
          .select()
          .single();

        if (error) {
          console.error(`Error creating ${account.email}:`, error);
          results.push({ action: 'error', email: account.email, error: error.message });
        } else {
          results.push({ action: 'created', user: data });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database setup completed!",
      results,
      accounts: [
        { email: "admin@misopin.com", password: "admin123", role: "SUPER_ADMIN" },
        { email: "manager@misopin.com", password: "admin123", role: "ADMIN" },
        { email: "editor@misopin.com", password: "editor123", role: "EDITOR" }
      ]
    });

  } catch (error) {
    console.error('Setup error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      hint: 'Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env file'
    }, { status: 500 });
  }
}

// GET 요청으로도 실행 가능하도록 (브라우저에서 직접 접속)
export async function GET() {
  return POST();
}