import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreatePageRequest } from "@/types/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const page = await db.page.findUnique({
      where: { id: params.id },
    });

    if (!page) {
      return NextResponse.json(
        { error: "페이지를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("페이지 조회 오류:", error);
    return NextResponse.json(
      { error: "페이지를 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body: CreatePageRequest = await request.json();
    const { slug, title, content, metadata, isPublished } = body;

    // 현재 페이지 찾기
    const currentPage = await db.page.findUnique({
      where: { id: params.id },
    });

    if (!currentPage) {
      return NextResponse.json(
        { error: "페이지를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 슬러그가 변경된 경우 중복 체크
    if (slug && slug !== currentPage.slug) {
      const existingPage = await db.page.findUnique({
        where: { slug },
      });

      if (existingPage) {
        return NextResponse.json(
          { error: "이미 존재하는 슬러그입니다." },
          { status: 400 }
        );
      }
    }

    const updatedPage = await db.page.update({
      where: { id: params.id },
      data: {
        ...(slug !== undefined && { slug }),
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(metadata !== undefined && { metadata }),
        ...(isPublished !== undefined && { isPublished }),
        version: { increment: 1 },
      },
    });

    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error("페이지 수정 오류:", error);
    return NextResponse.json(
      { error: "페이지 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const page = await db.page.findUnique({
      where: { id: params.id },
    });

    if (!page) {
      return NextResponse.json(
        { error: "페이지를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await db.page.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "페이지가 삭제되었습니다." });
  } catch (error) {
    console.error("페이지 삭제 오류:", error);
    return NextResponse.json(
      { error: "페이지 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}