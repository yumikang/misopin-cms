import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
  // Server Component에서 직접 데이터베이스 조회
  const { db } = await import("@/lib/db");

  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "10");
  const search = params.search || "";
  const published = params.published;

  const skip = (page - 1) * limit;

  try {
    // API route와 동일한 where 조건
    const where = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(published !== null && published !== undefined && published !== "all" && {
        isPublished: published === "true",
      }),
    };

    // API route와 동일한 쿼리
    const [pages, total] = await Promise.all([
      db.page.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          isPublished: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.page.count({ where }),
    ]);

    // API route와 동일한 pagination 구조
    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    };

    return { pages, pagination };
  } catch (error) {
    console.error("페이지 조회 오류:", error);
    throw new Error("페이지를 불러오는데 실패했습니다.");
  }
}

export async function PageList({ searchParams }: PageListProps) {
  const resolvedSearchParams = await searchParams;

  try {
    const [data, session] = await Promise.all([
      getPages(resolvedSearchParams),
      getServerSession(authOptions)
    ]);

    // 인증 체크
    if (!session) {
      return (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>접근 권한이 없습니다.</p>
              <p className="text-sm mt-2">로그인이 필요합니다.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

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
                        {format(page.updatedAt, "MM월 dd일", { locale: ko })}
                      </span>
                    </div>
                  </div>

                  {/* 생성일 */}
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    <p>
                      생성일: {format(page.createdAt, "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                    </p>
                    {page.updatedAt !== page.createdAt && (
                      <p>
                        수정일: {format(page.updatedAt, "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
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
  } catch (error) {
    console.error("페이지 목록 로드 오류:", error);
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-red-500">페이지를 불러오는 중 오류가 발생했습니다.</p>
            <p className="text-sm mt-2">잠시 후 다시 시도해주세요.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
}