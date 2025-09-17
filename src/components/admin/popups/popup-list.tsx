import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PopupPagination } from "./popup-pagination";
import { PopupStatusBadge } from "./popup-status-badge";
import { DeletePopupButton } from "./delete-popup-button";
import {
  Eye,
  Calendar,
  Image,
  ExternalLink,
  Layers,
  Monitor,
  Smartphone,
  Edit2
} from "lucide-react";

interface PopupListProps {
  searchParams: Promise<{
    page?: string;
    active?: string;
    search?: string;
  }>;
}

async function getPopups(params: any) {
  // Server Component에서 직접 데이터베이스 조회
  const { db } = await import("@/lib/db");

  const page = parseInt(params.page || "1");
  const limit = parseInt(params.limit || "10");
  const active = params.active;
  const search = params.search;

  const skip = (page - 1) * limit;

  // 필터링 조건 구성
  const where: any = {};

  if (active && active !== "all") {
    where.isActive = active === "true";
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  // 팝업 목록 조회
  const [popups, total] = await Promise.all([
    db.popup.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { priority: "desc" }, // 우선순위 높은 순
        { createdAt: "desc" },
      ],
    }),
    db.popup.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    popups,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
    },
  };
}

function getDisplayTypeLabel(displayType: string) {
  switch (displayType) {
    case "MODAL": return "모달";
    case "BANNER": return "배너";
    case "SLIDE_IN": return "슬라이드";
    default: return displayType;
  }
}

function getDisplayTypeIcon(displayType: string) {
  switch (displayType) {
    case "MODAL": return Monitor;
    case "BANNER": return Layers;
    case "SLIDE_IN": return Smartphone;
    default: return Monitor;
  }
}

export async function PopupList({ searchParams }: PopupListProps) {
  const resolvedSearchParams = await searchParams;
  const [data, session] = await Promise.all([
    getPopups(resolvedSearchParams),
    getServerSession(authOptions)
  ]);
  const { popups, pagination } = data;
  const isSuperAdmin = session?.user?.role === UserRole.SUPER_ADMIN;

  if (!popups || popups.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>등록된 팝업이 없습니다.</p>
            <p className="text-sm mt-2">새 팝업을 추가해보세요.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {popups.map((popup: any) => {
          const DisplayIcon = getDisplayTypeIcon(popup.displayType);
          const isActive = popup.isActive &&
            new Date(popup.startDate) <= new Date() &&
            new Date(popup.endDate) >= new Date();

          return (
            <Card key={popup.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-lg">{popup.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      <DisplayIcon className="h-3 w-3 mr-1" />
                      {getDisplayTypeLabel(popup.displayType)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      우선순위: {popup.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <PopupStatusBadge isActive={isActive} popup={popup} />
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/popups/${popup.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        상세
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/popups/${popup.id}/edit`}>
                        <Edit2 className="h-4 w-4" />
                      </Link>
                    </Button>
                    <DeletePopupButton
                      popupId={popup.id}
                      popupTitle={popup.title}
                      isSuperAdmin={isSuperAdmin}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 팝업 내용 */}
                  <div className="text-sm line-clamp-2">
                    {popup.content}
                  </div>

                  {/* 기간 및 추가 정보 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(popup.startDate), "MM/dd", { locale: ko })} - {format(new Date(popup.endDate), "MM/dd", { locale: ko })}
                      </span>
                    </div>

                    {popup.imageUrl && (
                      <div className="flex items-center space-x-2">
                        <Image className="h-4 w-4 text-muted-foreground" />
                        <span>이미지 첨부</span>
                      </div>
                    )}

                    {popup.linkUrl && (
                      <div className="flex items-center space-x-2">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <span>링크 연결</span>
                      </div>
                    )}

                    {popup.showOnPages && popup.showOnPages.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span>{popup.showOnPages.length}개 페이지</span>
                      </div>
                    )}
                  </div>

                  {/* 생성일 */}
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    <p>
                      생성일: {format(new Date(popup.createdAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PopupPagination pagination={pagination} />
    </div>
  );
}