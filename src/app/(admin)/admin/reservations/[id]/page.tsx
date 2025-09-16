import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ReservationDetail } from "@/components/admin/reservations/reservation-detail";

interface ReservationDetailPageProps {
  params: {
    id: string;
  };
}

async function getReservation(id: string) {
  const response = await fetch(
    `${process.env.NEXTAUTH_URL || "http://localhost:3001"}/api/reservations/${id}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      notFound();
    }
    throw new Error("예약 정보를 불러오는데 실패했습니다.");
  }

  return response.json();
}

export default async function ReservationDetailPage({ params }: ReservationDetailPageProps) {
  const reservation = await getReservation(params.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/reservations">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              예약 상세 정보
            </h1>
            <p className="text-muted-foreground">
              {reservation.patientName}님의 예약 정보입니다.
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<ReservationDetailSkeleton />}>
        <ReservationDetail reservation={reservation} />
      </Suspense>
    </div>
  );
}

function ReservationDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="rounded-lg border p-6">
          <div className="space-y-4">
            <div className="h-6 bg-muted animate-pulse rounded w-1/3" />
            <div className="space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-6">
          <div className="space-y-4">
            <div className="h-6 bg-muted animate-pulse rounded w-1/3" />
            <div className="space-y-3">
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-lg border p-6">
        <div className="space-y-4">
          <div className="h-6 bg-muted animate-pulse rounded w-1/3" />
          <div className="space-y-3">
            <div className="h-10 bg-muted animate-pulse rounded" />
            <div className="h-20 bg-muted animate-pulse rounded" />
            <div className="h-10 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}