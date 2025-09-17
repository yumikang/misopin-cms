import { Suspense } from "react";
import { ReservationList } from "@/components/admin/reservations/reservation-list";
import { ReservationFilters } from "@/components/admin/reservations/reservation-filters";

interface ReservationsPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ReservationsPage({ searchParams }: ReservationsPageProps) {
  const params = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">예약 관리</h1>
        <p className="text-muted-foreground">
          진료 예약을 관리하고 상태를 변경할 수 있습니다.
        </p>
      </div>

      <ReservationFilters />

      <Suspense fallback={<ReservationListSkeleton />}>
        <ReservationList searchParams={params} />
      </Suspense>
    </div>
  );
}

function ReservationListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="space-y-3">
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="space-y-3">
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="space-y-3">
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}