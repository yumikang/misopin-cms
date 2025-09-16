import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserRole, ReservationStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const reservation = await db.reservation.findUnique({
      where: { id: params.id },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "예약을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("예약 조회 오류:", error);
    return NextResponse.json(
      { error: "예약 정보를 불러오는데 실패했습니다." },
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

    // 편집자는 예약 수정 권한 없음
    if (session.user.role === UserRole.EDITOR) {
      return NextResponse.json(
        { error: "예약 수정 권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      status,
      adminNotes,
      patientName,
      phone,
      email,
      service,
      preferredDate,
      preferredTime,
      notes,
    } = body;

    // 예약 존재 확인
    const existingReservation = await db.reservation.findUnique({
      where: { id: params.id },
    });

    if (!existingReservation) {
      return NextResponse.json(
        { error: "예약을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 수정할 데이터 구성
    const updateData: any = {};

    if (status && Object.values(ReservationStatus).includes(status)) {
      updateData.status = status;
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    if (patientName) updateData.patientName = patientName;
    if (phone) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (service) updateData.service = service;
    if (preferredDate) updateData.preferredDate = new Date(preferredDate);
    if (preferredTime) updateData.preferredTime = preferredTime;
    if (notes !== undefined) updateData.notes = notes;

    const updatedReservation = await db.reservation.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedReservation);
  } catch (error) {
    console.error("예약 수정 오류:", error);
    return NextResponse.json(
      { error: "예약 수정에 실패했습니다." },
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

    // 편집자와 일반 관리자는 예약 삭제 권한 없음 (슈퍼 관리자만)
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "예약 삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    const reservation = await db.reservation.findUnique({
      where: { id: params.id },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "예약을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await db.reservation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "예약이 삭제되었습니다." });
  } catch (error) {
    console.error("예약 삭제 오류:", error);
    return NextResponse.json(
      { error: "예약 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}