import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PagesResponse, PageWhereInput, CreatePageRequest, PageCreate } from "@/types/api";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const search = url.searchParams.get("search") || "";
  const published = url.searchParams.get("published");

  const skip = (page - 1) * limit;

  try {
    const where: PageWhereInput = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { slug: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(published !== null && published !== undefined && published !== "all" && {
        isPublished: published === "true",
      }),
    };

    const [pages, total] = await Promise.all([
      db.page.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          isPublished: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.page.count({ where }),
    ]);

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };

    return NextResponse.json({ pages, pagination });
  } catch (error) {
    console.error("페이지 조회 오류:", error);
    return NextResponse.json(
      { error: "페이지를 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body: CreatePageRequest = await request.json();
    const { slug, title, content, metadata, isPublished } = body;

    // 슬러그 중복 체크
    const existingPage = await db.page.findUnique({
      where: { slug },
    });

    if (existingPage) {
      return NextResponse.json(
        { error: "이미 존재하는 슬러그입니다." },
        { status: 400 }
      );
    }

    const page = await db.page.create({
      data: {
        slug,
        title,
        content,
        metadata: metadata || {},
        isPublished: isPublished || false,
      },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("페이지 생성 오류:", error);
    return NextResponse.json(
      { error: "페이지 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}