"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReservationStatusBadge } from "./reservation-status-badge";
import { ReservationEditForm } from "./reservation-edit-form";
import {
  Edit,
  Phone,
  Mail,
  Calendar,
  Clock,
  User,
  FileText,
  UserCircle,
  CalendarDays,
  MessageSquare
} from "lucide-react";

interface ReservationDetailProps {
  reservation: any;
}

function getGenderLabel(gender: string) {
  return gender === "MALE" ? "남성" : "여성";
}

function getTreatmentTypeLabel(treatmentType: string) {
  return treatmentType === "FIRST_VISIT" ? "초진" : "재진";
}

export function ReservationDetail({ reservation }: ReservationDetailProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <ReservationEditForm
        reservation={reservation}
        onCancel={() => setIsEditing(false)}
        onSave={() => {
          setIsEditing(false);
          // 페이지 새로고침으로 최신 데이터 반영
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 환자 정보 */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <UserCircle className="h-5 w-5" />
                <span>환자 정보</span>
              </CardTitle>
              <ReservationStatusBadge status={reservation.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">이름</label>
                <p className="text-lg font-semibold">{reservation.patientName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">성별</label>
                <p>{getGenderLabel(reservation.gender)}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">생년월일</label>
              <p className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{format(parseISO(reservation.birthDate), "yyyy년 MM월 dd일", { locale: ko })}</span>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">연락처</label>
              <p className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{reservation.phone}</span>
              </p>
            </div>

            {reservation.email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">이메일</label>
                <p className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{reservation.email}</span>
                </p>
              </div>
            )}

            <Separator />

            <div>
              <label className="text-sm font-medium text-muted-foreground">진료 유형</label>
              <Badge variant="outline" className="ml-2">
                {getTreatmentTypeLabel(reservation.treatmentType)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 예약 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5" />
              <span>예약 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">예약 날짜</label>
              <p className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(parseISO(reservation.preferredDate), "yyyy년 MM월 dd일 (EEEE)", { locale: ko })}
                </span>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">예약 시간</label>
              <p className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{reservation.preferredTime}</span>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">진료 내용</label>
              <p className="flex items-start space-x-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{reservation.service}</span>
              </p>
            </div>

            {reservation.notes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">환자 메모</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm">{reservation.notes}</p>
                </div>
              </div>
            )}

            <Separator />

            <div className="text-xs text-muted-foreground">
              <p>접수일: {format(reservation.createdAt, "yyyy년 MM월 dd일 HH:mm", { locale: ko })}</p>
              {reservation.updatedAt !== reservation.createdAt && (
                <p>수정일: {format(reservation.updatedAt, "yyyy년 MM월 dd일 HH:mm", { locale: ko })}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 관리자 영역 */}
      <div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>관리자 영역</span>
              </CardTitle>
              <Button onClick={() => setIsEditing(true)} size="sm">
                <Edit className="h-4 w-4 mr-2" />
                편집
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">예약 상태</label>
              <div className="mt-1">
                <ReservationStatusBadge status={reservation.status} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">관리자 메모</label>
              <div className="mt-1 p-3 border rounded-md min-h-[100px]">
                {reservation.adminNotes ? (
                  <p className="text-sm">{reservation.adminNotes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">메모가 없습니다.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                상태를 변경하거나 관리자 메모를 추가하려면 편집 버튼을 클릭하세요.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}