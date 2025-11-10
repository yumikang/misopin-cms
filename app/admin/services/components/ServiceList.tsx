"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Service } from "@/app/api/admin/services/types";
import { Clock, Edit, Trash2 } from "lucide-react";

interface ServiceListProps {
  services: Service[];
  loading: boolean;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

export function ServiceList({
  services,
  loading,
  onEdit,
  onDelete,
}: ServiceListProps) {
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}분`;
    if (mins === 0) return `${hours}시간`;
    return `${hours}시간 ${mins}분`;
  };

  const calculateMaxBookings = (service: Service) => {
    const limit = service.service_reservation_limits;
    if (!limit || !limit.dailyLimitMinutes) return null;
    return Math.floor(limit.dailyLimitMinutes / service.durationMinutes);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="text-center py-12">
          <p className="text-gray-500">시술이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">
            새 시술 추가 버튼을 눌러 시술을 등록하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[25%]">시술명</TableHead>
              <TableHead className="w-[15%]">코드</TableHead>
              <TableHead className="w-[15%]">시술시간</TableHead>
              <TableHead className="w-[15%]">일일한도</TableHead>
              <TableHead className="w-[12%] text-center">상태</TableHead>
              <TableHead className="w-[18%] text-center">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => {
              const maxBookings = calculateMaxBookings(service);
              const hasReservations =
                (service._count?.reservations || 0) > 0;

              return (
                <TableRow key={service.id}>
                  {/* Service Name */}
                  <TableCell>
                    <div>
                      <div className="font-medium">{service.name}</div>
                      {service.description && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {service.description}
                        </div>
                      )}
                      {service.category && (
                        <div className="text-xs text-blue-600 mt-0.5">
                          {service.category}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Code */}
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                      {service.code}
                    </code>
                  </TableCell>

                  {/* Duration */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {formatMinutes(service.durationMinutes)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      +{service.bufferMinutes}분 준비
                    </div>
                  </TableCell>

                  {/* Daily Limit */}
                  <TableCell>
                    {service.service_reservation_limits?.dailyLimitMinutes ? (
                      <div>
                        <div className="font-medium">
                          {formatMinutes(
                            service.service_reservation_limits.dailyLimitMinutes
                          )}
                        </div>
                        {maxBookings && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            최대 {maxBookings}건
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    <Badge variant={service.isActive ? "default" : "secondary"}>
                      {service.isActive ? "활성" : "비활성"}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(service)}
                        className="inline-flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        편집
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(service)}
                        disabled={hasReservations}
                        className="inline-flex items-center gap-1"
                        title={
                          hasReservations
                            ? "예약이 있어 삭제할 수 없습니다"
                            : "시술 삭제"
                        }
                      >
                        <Trash2 className="h-3 w-3" />
                        삭제
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
