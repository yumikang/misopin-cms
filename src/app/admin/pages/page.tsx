import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PageFilters } from "@/components/admin/pages/page-filters";
import { PageList } from "@/components/admin/pages/page-list";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    published?: string;
    search?: string;
  }>;
}

export default function PagesPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">페이지 관리</h1>
          <p className="text-muted-foreground">
            웹사이트의 정적 페이지를 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/pages/new">
            <Plus className="h-4 w-4 mr-2" />
            새 페이지
          </Link>
        </Button>
      </div>

      <PageFilters />

      <Suspense fallback={<div>페이지 목록을 불러오는 중...</div>}>
        <PageList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}