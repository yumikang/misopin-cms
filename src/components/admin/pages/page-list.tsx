import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PagePagination } from "./page-pagination";
import {
  Eye,
  Calendar,
  Hash,
  FileText,
  Globe,
  Edit3
} from "lucide-react";

interface PageListProps {
  searchParams: Promise<{
    page?: string;
    published?: string;
    search?: string;
  }>;
}

async function getPages(params: any) {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page);
  if (params.published) searchParams.set("published", params.published);
  if (params.search) searchParams.set("search", params.search);

  const response = await fetch(
    `${process.env.NEXTAUTH_URL || "http://localhost:3001"}/api/pages?${searchParams.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("페이지 데이터를 불러오는데 실패했습니다.");
  }

  return response.json();
}

export async function PageList({ searchParams }: PageListProps) {
  const resolvedSearchParams = await searchParams;
  const data = await getPages(resolvedSearchParams);
  const { pages, pagination } = data;

  if (!pages || pages.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>등록된 페이지가 없습니다.</p>
            <p className="text-sm mt-2">새 페이지를 생성해보세요.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {pages.map((page: any) => (
          <Card key={page.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CardTitle className="text-lg">{page.title}</CardTitle>
                  <Badge
                    variant={page.isPublished ? "default" : "secondary"}
                    className={page.isPublished ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                  >
                    {page.isPublished ? "발행됨" : "임시저장"}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/pages/${page.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      상세
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 기본 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      /{page.slug}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Edit3 className="h-4 w-4 text-muted-foreground" />
                    <span>버전 {page.version}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(parseISO(page.updatedAt), "MM월 dd일", { locale: ko })}
                    </span>
                  </div>
                </div>

                {/* 생성일 */}
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  <p>
                    생성일: {format(parseISO(page.createdAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                  </p>
                  {page.updatedAt !== page.createdAt && (
                    <p>
                      수정일: {format(parseISO(page.updatedAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PagePagination pagination={pagination} />
    </div>
  );
}