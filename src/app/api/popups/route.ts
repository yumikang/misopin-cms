import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { PopupsResponse, PopupWhereInput, CreatePopupRequest } from "@/types/api";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const active = searchParams.get("active");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // 필터링 조건 구성
    const where: PopupWhereInput = {};

    if (active && active !== "all") {
      where.isActive = active === "true";
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    // 팝업 목록 조회
    const [popups, total] = await Promise.all([
      db.popup.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: "desc" }, // 우선순위 높은 순
          { createdAt: "desc" },
        ],
      }),
      db.popup.count({ where }),
    ]);

    const response: PopupsResponse = {
      popups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("팝업 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "팝업 목록을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 편집자는 팝업 생성 권한 없음
    if (session.user.role === UserRole.EDITOR) {
      return NextResponse.json(
        { error: "팝업 생성 권한이 없습니다." },
        { status: 403 }
      );
    }

    const body: CreatePopupRequest = await request.json();
    const {
      title,
      content,
      imageUrl,
      linkUrl,
      startDate,
      endDate,
      position,
      showOnPages,
      displayType,
      priority,
    } = body;

    // 필수 필드 검증
    if (!title || !content || !startDate || !endDate) {
      return NextResponse.json(
        { error: "제목, 내용, 시작일, 종료일은 필수 항목입니다." },
        { status: 400 }
      );
    }

    const popup = await db.popup.create({
      data: {
        title,
        content,
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        position: position || { x: 50, y: 50, width: 400, height: 300 },
        showOnPages: showOnPages || [],
        displayType: displayType || "MODAL",
        priority: priority || 1,
        isActive: false, // 기본적으로 비활성화 상태로 생성
      },
    });

    return NextResponse.json(popup, { status: 201 });
  } catch (error) {
    console.error("팝업 생성 오류:", error);
    return NextResponse.json(
      { error: "팝업 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}