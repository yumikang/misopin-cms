import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { BoardPostsResponse, BoardPostWhereInput, CreateBoardPostRequest } from "@/types/api";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const boardType = searchParams.get("boardType");
    const published = searchParams.get("published");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // 필터링 조건 구성
    const where: BoardPostWhereInput = {};

    if (boardType && boardType !== "all") {
      where.boardType = boardType;
    }

    if (published && published !== "all") {
      where.isPublished = published === "true";
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { author: { contains: search, mode: "insensitive" } },
      ];
    }

    // 게시글 목록 조회
    const [posts, total] = await Promise.all([
      db.boardPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isPinned: "desc" }, // 고정 글을 먼저 표시
          { publishedAt: "desc" },
          { createdAt: "desc" },
        ],
      }),
      db.boardPost.count({ where }),
    ]);

    const response: BoardPostsResponse = {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("게시글 목록 조회 오류:", error);
    return NextResponse.json(
      { error: "게시글 목록을 불러오는데 실패했습니다." },
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

    const body: CreateBoardPostRequest = await request.json();
    const {
      boardType,
      title,
      content,
      excerpt,
      author,
      isPublished,
      isPinned,
      tags,
      imageUrl,
    } = body;

    // 필수 필드 검증
    if (!boardType || !title || !content || !author) {
      return NextResponse.json(
        { error: "게시판 유형, 제목, 내용, 작성자는 필수 항목입니다." },
        { status: 400 }
      );
    }

    const post = await db.boardPost.create({
      data: {
        boardType,
        title,
        content,
        excerpt: excerpt || null,
        author,
        isPublished: isPublished || false,
        isPinned: isPinned || false,
        tags: tags || [],
        imageUrl: imageUrl || null,
        publishedAt: isPublished ? new Date() : null,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("게시글 생성 오류:", error);
    return NextResponse.json(
      { error: "게시글 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}