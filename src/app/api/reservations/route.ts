import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { ReservationsResponse, ReservationWhereInput } from "@/types/api";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 편집자는 예약 조회 권한 없음
    if (session.user.role === UserRole.EDITOR) {
      return NextResponse.json(
        { error: "예약 조회 권한이 없습니다." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const skip = (page - 1) * limit;

    // 필터링 조건 구성
    const where: ReservationWhereInput = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { patientName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { service: { contains: search, mode: "insensitive" } },
      ];
    }

    if (startDate || endDate) {
      where.preferredDate = {};
      if (startDate) {
        where.preferredDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.preferredDate.lte = new Date(endDate);
      }
    }

    // 예약 목록 조회
    const [reservations, total] = await Promise.all([
      db.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { status: "asc" }, // 대기중인 예약을 먼저 표시
          { preferredDate: "desc" },
          { createdAt: "desc" },
        ],
      }),
      db.reservation.count({ where }),
    ]);

    const response: ReservationsResponse = {
      reservations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("예약 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "예약 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}