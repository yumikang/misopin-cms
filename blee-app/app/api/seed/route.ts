import { NextResponse } from 'next/server';
import { PrismaClient, UserRole, ReservationStatus, Gender, TreatmentType, PopupType, BoardType } from "@prisma/client";
import { hash } from "bcryptjs";

// Vercel에서 일회성으로 seed 데이터를 실행하기 위한 API
export async function POST() {
  const prisma = new PrismaClient();

  try {
    // Create admin users
    const adminPassword = await hash("admin123", 12);
    const editorPassword = await hash("editor123", 12);

    // Create Super Admin
    const superAdmin = await prisma.user.upsert({
      where: { email: "admin@misopin.com" },
      update: {},
      create: {
        email: "admin@misopin.com",
        name: "슈퍼 관리자",
        password: adminPassword,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      },
    });

    // Create Admin
    const admin = await prisma.user.upsert({
      where: { email: "manager@misopin.com" },
      update: {},
      create: {
        email: "manager@misopin.com",
        name: "일반 관리자",
        password: adminPassword,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    // Create Editor
    const editor = await prisma.user.upsert({
      where: { email: "editor@misopin.com" },
      update: {},
      create: {
        email: "editor@misopin.com",
        name: "편집자",
        password: editorPassword,
        role: UserRole.EDITOR,
        isActive: true,
      },
    });

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: "Test accounts created successfully!",
      accounts: [
        { email: "admin@misopin.com", password: "admin123", role: "SUPER_ADMIN" },
        { email: "manager@misopin.com", password: "admin123", role: "ADMIN" },
        { email: "editor@misopin.com", password: "editor123", role: "EDITOR" }
      ]
    });

  } catch (error) {
    await prisma.$disconnect();
    console.error('Seed error:', error);

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET 요청으로도 실행 가능하도록 (브라우저에서 직접 접속)
export async function GET() {
  return POST();
}