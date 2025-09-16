import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PopupList } from "@/components/admin/popups/popup-list";
import { PopupFilters } from "@/components/admin/popups/popup-filters";
import { Plus } from "lucide-react";

interface PopupsPageProps {
  searchParams: Promise<{
    page?: string;
    active?: string;
    search?: string;
  }>;
}

export default function PopupsPage({ searchParams }: PopupsPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">팝업 관리</h1>
          <p className="text-muted-foreground">
            웹사이트에 표시될 팝업을 관리할 수 있습니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/popups/create">
            <Plus className="h-4 w-4 mr-2" />
            새 팝업
          </Link>
        </Button>
      </div>

      <PopupFilters />

      <Suspense fallback={<PopupListSkeleton />}>
        <PopupList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function PopupListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="space-y-3">
          <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="space-y-3">
          <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}