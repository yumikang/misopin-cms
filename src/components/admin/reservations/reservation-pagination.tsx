"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ReservationPaginationProps {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function ReservationPagination({ pagination }: ReservationPaginationProps) {
  const searchParams = useSearchParams();
  const { page, pages, total } = pagination;

  if (pages <= 1) return null;

  const createPageUrl = (pageNum: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNum.toString());
    return `/admin/reservations?${params.toString()}`;
  };

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, page - delta); i <= Math.min(pages - 1, page + delta); i++) {
      range.push(i);
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (page + delta < pages - 1) {
      rangeWithDots.push("...", pages);
    } else {
      rangeWithDots.push(pages);
    }

    return rangeWithDots;
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center text-sm text-muted-foreground">
        총 {total}개의 예약 중 {((page - 1) * pagination.limit) + 1}-{Math.min(page * pagination.limit, total)}번째 표시
      </div>

      <div className="flex items-center space-x-2">
        {/* 이전 페이지 */}
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={createPageUrl(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* 페이지 번호들 */}
        {getVisiblePages().map((pageNum, index) => {
          if (pageNum === "...") {
            return (
              <span key={`dots-${index}`} className="px-2 py-1 text-muted-foreground">
                ...
              </span>
            );
          }

          const pageNumber = pageNum as number;
          const isCurrentPage = pageNumber === page;

          return isCurrentPage ? (
            <Button key={pageNumber} variant="default" size="sm" disabled>
              {pageNumber}
            </Button>
          ) : (
            <Button key={pageNumber} asChild variant="outline" size="sm">
              <Link href={createPageUrl(pageNumber)}>{pageNumber}</Link>
            </Button>
          );
        })}

        {/* 다음 페이지 */}
        {page < pages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={createPageUrl(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}