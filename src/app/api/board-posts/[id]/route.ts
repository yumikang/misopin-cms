import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole, BoardType, Prisma } from "@prisma/client";
import { CreateBoardPostRequest } from "@/types/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const post = await db.boardPost.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return NextResponse.json(
        { error: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("게시글 조회 오류:", error);
    return NextResponse.json(
      { error: "게시글 정보를 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body: Partial<CreateBoardPostRequest> = await request.json();
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

    // 게시글 존재 확인
    const existingPost = await db.boardPost.findUnique({
      where: { id: params.id },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 수정할 데이터 구성
    const updateData: Prisma.BoardPostUpdateInput = {};

    if (boardType && Object.values(BoardType).includes(boardType)) {
      updateData.boardType = boardType;
    }
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (author) updateData.author = author;
    if (isPublished !== undefined) {
      updateData.isPublished = isPublished;
      // 발행 상태가 변경되면 발행일 업데이트
      if (isPublished && !existingPost.publishedAt) {
        updateData.publishedAt = new Date();
      } else if (!isPublished) {
        updateData.publishedAt = null;
      }
    }
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (tags !== undefined) updateData.tags = tags;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const updatedPost = await db.boardPost.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("게시글 수정 오류:", error);
    return NextResponse.json(
      { error: "게시글 수정에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 편집자와 일반 관리자는 게시글 삭제 권한 없음 (슈퍼 관리자만)
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "게시글 삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    const post = await db.boardPost.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return NextResponse.json(
        { error: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await db.boardPost.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "게시글이 삭제되었습니다." });
  } catch (error) {
    console.error("게시글 삭제 오류:", error);
    return NextResponse.json(
      { error: "게시글 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}