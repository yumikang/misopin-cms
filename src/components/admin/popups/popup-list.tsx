import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PopupPagination } from "./popup-pagination";
import { PopupStatusBadge } from "./popup-status-badge";
import {
  Eye,
  Calendar,
  Image,
  ExternalLink,
  Layers,
  Monitor,
  Smartphone
} from "lucide-react";

interface PopupListProps {
  searchParams: {
    page?: string;
    active?: string;
    search?: string;
  };
}

async function getPopups(params: any) {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", params.page);
  if (params.active) searchParams.set("active", params.active);
  if (params.search) searchParams.set("search", params.search);

  const response = await fetch(
    `${process.env.NEXTAUTH_URL || "http://localhost:3003"}/api/popups?${searchParams.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("팝업 데이터를 불러오는데 실패했습니다.");
  }

  return response.json();
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
  const data = await getPopups(searchParams);
  const { popups, pagination } = data;

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
                        {format(parseISO(popup.startDate), "MM/dd", { locale: ko })} - {format(parseISO(popup.endDate), "MM/dd", { locale: ko })}
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
                      생성일: {format(parseISO(popup.createdAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
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