import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole, PopupType } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const popup = await db.popup.findUnique({
      where: { id: params.id },
    });

    if (!popup) {
      return NextResponse.json(
        { error: "팝업을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(popup);
  } catch (error) {
    console.error("팝업 조회 오류:", error);
    return NextResponse.json(
      { error: "팝업 정보를 불러오는데 실패했습니다." },
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

    // 편집자는 팝업 수정 권한 없음
    if (session.user.role === UserRole.EDITOR) {
      return NextResponse.json(
        { error: "팝업 수정 권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      content,
      imageUrl,
      linkUrl,
      isActive,
      startDate,
      endDate,
      position,
      showOnPages,
      displayType,
      priority,
    } = body;

    // 팝업 존재 확인
    const existingPopup = await db.popup.findUnique({
      where: { id: params.id },
    });

    if (!existingPopup) {
      return NextResponse.json(
        { error: "팝업을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 수정할 데이터 구성
    const updateData: any = {};

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (position) updateData.position = position;
    if (showOnPages) updateData.showOnPages = showOnPages;
    if (displayType && Object.values(PopupType).includes(displayType)) {
      updateData.displayType = displayType;
    }
    if (priority !== undefined) updateData.priority = priority;

    const updatedPopup = await db.popup.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedPopup);
  } catch (error) {
    console.error("팝업 수정 오류:", error);
    return NextResponse.json(
      { error: "팝업 수정에 실패했습니다." },
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

    // 편집자와 일반 관리자는 팝업 삭제 권한 없음 (슈퍼 관리자만)
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "팝업 삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    const popup = await db.popup.findUnique({
      where: { id: params.id },
    });

    if (!popup) {
      return NextResponse.json(
        { error: "팝업을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await db.popup.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "팝업이 삭제되었습니다." });
  } catch (error) {
    console.error("팝업 삭제 오류:", error);
    return NextResponse.json(
      { error: "팝업 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}