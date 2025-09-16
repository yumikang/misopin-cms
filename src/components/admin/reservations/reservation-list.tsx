import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReservationPagination } from "./reservation-pagination";
import { ReservationStatusBadge } from "./reservation-status-badge";
import { Eye, Phone, Calendar, Clock, User, FileText } from "lucide-react";

interface ReservationListProps {
  searchParams: {
    page?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  };
}

async function getReservations(params: any) {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page);
  if (params.status) searchParams.set("status", params.status);
  if (params.search) searchParams.set("search", params.search);
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);

  const response = await fetch(
    `${process.env.NEXTAUTH_URL || "http://localhost:3003"}/api/reservations?${searchParams.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("예약 데이터를 불러오는데 실패했습니다.");
  }

  return response.json();
}

function getGenderLabel(gender: string) {
  return gender === "MALE" ? "남" : "여";
}

function getTreatmentTypeLabel(treatmentType: string) {
  return treatmentType === "FIRST_VISIT" ? "초진" : "재진";
}

export async function ReservationList({ searchParams }: ReservationListProps) {
  const data = await getReservations(searchParams);
  const { reservations, pagination } = data;

  if (!reservations || reservations.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>예약이 없습니다.</p>
            <p className="text-sm mt-2">검색 조건을 변경해보세요.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {reservations.map((reservation: any) => (
          <Card key={reservation.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CardTitle className="text-lg">{reservation.patientName}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {getGenderLabel(reservation.gender)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {getTreatmentTypeLabel(reservation.treatmentType)}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <ReservationStatusBadge status={reservation.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/reservations/${reservation.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      상세
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{reservation.phone}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(parseISO(reservation.preferredDate), "MM월 dd일 (E)", { locale: ko })}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{reservation.preferredTime}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(parseISO(reservation.birthDate), "yyyy년 MM월 dd일", { locale: ko })}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t">
                <div className="flex items-start space-x-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{reservation.service}</p>
                    {reservation.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {reservation.notes}
                      </p>
                    )}
                    {reservation.adminNotes && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-md">
                        <p className="text-xs text-blue-800">
                          <span className="font-medium">관리자 메모:</span> {reservation.adminNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
                <p>
                  접수일: {format(parseISO(reservation.createdAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ReservationPagination pagination={pagination} />
    </div>
  );
}