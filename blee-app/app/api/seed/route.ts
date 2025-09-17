import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hash } from "bcryptjs";

// Vercel에서 일회성으로 seed 데이터를 실행하기 위한 API
export async function POST() {
  try {
    // Create admin users
    const adminPassword = await hash("admin123", 12);
    const editorPassword = await hash("editor123", 12);

    const accounts = [
      {
        email: "admin@misopin.com",
        name: "슈퍼 관리자",
        password: adminPassword,
        role: "SUPER_ADMIN" as const,
        isActive: true,
      },
      {
        email: "manager@misopin.com",
        name: "일반 관리자",
        password: adminPassword,
        role: "ADMIN" as const,
        isActive: true,
      },
      {
        email: "editor@misopin.com",
        name: "편집자",
        password: editorPassword,
        role: "EDITOR" as const,
        isActive: true,
      }
    ];

    const results = [];

    for (const account of accounts) {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', account.email)
        .single();

      if (existingUser) {
        // Update existing user
        const { data, error } = await supabase
          .from('users')
          .update(account)
          .eq('email', account.email)
          .select()
          .single();

        if (error) throw error;
        results.push({ action: 'updated', user: data });
      } else {
        // Create new user
        const { data, error } = await supabase
          .from('users')
          .insert(account)
          .select()
          .single();

        if (error) throw error;
        results.push({ action: 'created', user: data });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Test accounts created successfully!",
      results,
      accounts: [
        { email: "admin@misopin.com", password: "admin123", role: "SUPER_ADMIN" },
        { email: "manager@misopin.com", password: "admin123", role: "ADMIN" },
        { email: "editor@misopin.com", password: "editor123", role: "EDITOR" }
      ]
    });

  } catch (error) {
    console.error('Seed error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// GET 요청으로도 실행 가능하도록 (브라우저에서 직접 접속)
export async function GET() {
  return POST();
}