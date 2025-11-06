"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Phone, Clock, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Reservation {
  id: string;
  patient_name: string;
  patient_phone: string;
  patient_email?: string | null;
  reservation_date: string;
  reservation_time: string;
  department: string;
  purpose: string;
  status: string;
  notes?: string | null;
  admin_notes?: string | null;
  period?: string | null;
  timeSlotStart?: string | null;
  timeSlotEnd?: string | null;
  serviceName?: string | null;
  estimatedDuration?: number | null;
}

interface ReservationCardProps {
  reservation: Reservation;
  onStatusChange?: (id: string, newStatus: string) => void;
  onView?: (reservation: Reservation) => void;
}

export default function ReservationCard({
  reservation,
  onStatusChange,
  onView
}: ReservationCardProps) {
  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: <AlertCircle className="h-3 w-3" />,
          label: '대기'
        };
      case 'CONFIRMED':
        return {
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: <CheckCircle className="h-3 w-3" />,
          label: '확정'
        };
      case 'CANCELLED':
        return {
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: <XCircle className="h-3 w-3" />,
          label: '취소'
        };
      case 'COMPLETED':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <CheckCircle className="h-3 w-3" />,
          label: '완료'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: <AlertCircle className="h-3 w-3" />,
          label: status
        };
    }
  };

  const statusInfo = getStatusInfo(reservation.status);

  // Format service name
  const getServiceName = (department: string, serviceName?: string | null) => {
    if (serviceName) return serviceName;

    const serviceMap: Record<string, string> = {
      'WRINKLE_BOTOX': '주름 보톡스',
      'VOLUME_LIFTING': '볼륨 리프팅',
      'SKIN_CARE': '피부 관리',
      'REMOVAL_PROCEDURE': '제거 시술',
      'BODY_CARE': '바디 케어',
      'OTHER_CONSULTATION': '기타 상담'
    };
    return serviceMap[department] || department;
  };

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        reservation.status === 'CANCELLED' && "opacity-60"
      )}
      onClick={() => onView?.(reservation)}
    >
      <CardContent className="p-4">
        {/* Header: Time and Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-lg">
              {reservation.timeSlotStart || reservation.reservation_time}
            </span>
            {reservation.timeSlotEnd && (
              <span className="text-sm text-muted-foreground">
                ~ {reservation.timeSlotEnd}
              </span>
            )}
            {reservation.estimatedDuration && (
              <Badge variant="outline" className="text-xs">
                {reservation.estimatedDuration}분
              </Badge>
            )}
          </div>

          <Badge
            variant="outline"
            className={cn("flex items-center gap-1", statusInfo.color)}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
        </div>

        {/* Patient Info */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{reservation.patient_name}</span>
            <span className="text-xs text-muted-foreground">({reservation.purpose})</span>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{reservation.patient_phone}</span>
          </div>
        </div>

        {/* Service */}
        <div className="mb-3">
          <Badge variant="secondary" className="text-xs">
            {getServiceName(reservation.department, reservation.serviceName)}
          </Badge>
        </div>

        {/* Notes */}
        {reservation.notes && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground mb-3 p-2 bg-muted rounded">
            <FileText className="h-3 w-3 mt-0.5" />
            <span className="line-clamp-2">{reservation.notes}</span>
          </div>
        )}

        {/* Quick Actions */}
        {onStatusChange && reservation.status === 'PENDING' && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(reservation.id, 'CONFIRMED');
              }}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              확정
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs text-red-600 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(reservation.id, 'CANCELLED');
              }}
            >
              <XCircle className="h-3 w-3 mr-1" />
              취소
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
