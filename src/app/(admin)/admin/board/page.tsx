import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BoardPostList } from "@/components/admin/board/board-post-list";
import { BoardFilters } from "@/components/admin/board/board-filters";
import { Plus } from "lucide-react";

interface BoardPageProps {
  searchParams: Promise<{
    page?: string;
    boardType?: string;
    published?: string;
    search?: string;
  }>;
}

export default function BoardPage({ searchParams }: BoardPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">게시판 관리</h1>
          <p className="text-muted-foreground">
            공지사항, 이벤트, FAQ, 뉴스 게시글을 관리할 수 있습니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/board/create">
            <Plus className="h-4 w-4 mr-2" />
            새 게시글
          </Link>
        </Button>
      </div>

      <BoardFilters />

      <Suspense fallback={<BoardPostListSkeleton />}>
        <BoardPostList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function BoardPostListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <div className="space-y-3">
          <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="space-y-3">
          <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
        </div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="space-y-3">
          <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}