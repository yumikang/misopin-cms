"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PagePaginationProps {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function PagePagination({ pagination }: PagePaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/admin/pages?${params.toString()}`);
  };

  const { page, totalPages, hasNext, hasPrev, total } = pagination;

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        총 {total}개의 페이지
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(page - 1)}
          disabled={!hasPrev}
        >
          <ChevronLeft className="h-4 w-4" />
          이전
        </Button>
        <div className="flex items-center space-x-1">
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1;
            if (
              pageNum === 1 ||
              pageNum === totalPages ||
              (pageNum >= page - 2 && pageNum <= page + 2)
            ) {
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => navigateToPage(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            } else if (pageNum === page - 3 || pageNum === page + 3) {
              return <span key={pageNum} className="px-2">...</span>;
            }
            return null;
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateToPage(page + 1)}
          disabled={!hasNext}
        >
          다음
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}