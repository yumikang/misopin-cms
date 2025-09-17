"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Globe,
  Hash,
  Calendar,
  Edit3,
  Eye
} from "lucide-react";
import { toast } from "sonner";

interface PageDetailProps {
  page: {
    id: string;
    slug: string;
    title: string;
    content: any;
    metadata: any;
    isPublished: boolean;
    version: number;
    createdAt: string;
    updatedAt: string;
  };
}

export function PageDetail({ page }: PageDetailProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/pages/${page.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "삭제에 실패했습니다.");
      }

      toast.success("페이지가 삭제되었습니다.");
      router.push("/admin/pages");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderContent = () => {
    if (typeof page.content === "string") {
      return <pre className="whitespace-pre-wrap text-sm">{page.content}</pre>;
    }

    return (
      <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg overflow-auto">
        {JSON.stringify(page.content, null, 2)}
      </pre>
    );
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{page.title}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge
                variant={page.isPublished ? "default" : "secondary"}
                className={page.isPublished ? "bg-green-100 text-green-800" : ""}
              >
                {page.isPublished ? "발행됨" : "임시저장"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                버전 {page.version}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {page.isPublished && (
            <Button variant="outline" asChild>
              <Link href={`/${page.slug}`} target="_blank">
                <Eye className="h-4 w-4 mr-2" />
                미리보기
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/admin/pages/${page.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              수정
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>페이지를 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  이 작업은 되돌릴 수 없습니다. 페이지가 영구적으로 삭제됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "삭제 중..." : "삭제"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 메인 컨텐츠 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>페이지 컨텐츠</CardTitle>
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
          </Card>

          {page.metadata && (
            <Card>
              <CardHeader>
                <CardTitle>SEO 메타데이터</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {page.metadata.title && (
                  <div>
                    <p className="font-medium text-sm">메타 제목</p>
                    <p className="text-sm text-muted-foreground">{page.metadata.title}</p>
                  </div>
                )}
                {page.metadata.description && (
                  <div>
                    <p className="font-medium text-sm">메타 설명</p>
                    <p className="text-sm text-muted-foreground">{page.metadata.description}</p>
                  </div>
                )}
                {page.metadata.keywords && (
                  <div>
                    <p className="font-medium text-sm">키워드</p>
                    <p className="text-sm text-muted-foreground">{page.metadata.keywords}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 사이드바 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>페이지 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                  /{page.slug}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Edit3 className="h-4 w-4 text-muted-foreground" />
                <span>버전 {page.version}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(page.createdAt, "yyyy년 MM월 dd일", { locale: ko })}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>수정 이력</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="font-medium">생성일</p>
                <p className="text-muted-foreground">
                  {format(page.createdAt, "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                </p>
              </div>
              {page.updatedAt !== page.createdAt && (
                <div>
                  <p className="font-medium">최종 수정일</p>
                  <p className="text-muted-foreground">
                    {format(page.updatedAt, "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}