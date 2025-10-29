"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Edit, Clock, Sparkles } from "lucide-react";

interface StaticPage {
  id: string;
  slug: string;
  title: string;
  filePath: string;
  lastEdited: string;
  createdAt: string;
  editMode: 'PARSER' | 'ATTRIBUTE';
}

export default function StaticPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const response = await fetch("/api/static-pages");
      if (!response.ok) throw new Error("Failed to fetch pages");
      const data = await response.json();

      // 이용약관과 개인정보 처리방침은 UI에서 제외
      const filteredPages = (data.pages || []).filter(
        (page: StaticPage) => page.slug !== 'stipulation' && page.slug !== 'privacy'
      );

      setPages(filteredPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pages");
    } finally {
      setLoading(false);
    }
  };

  const handleReparse = async (id: string) => {
    if (!confirm("이 페이지를 재파싱하시겠습니까? HTML 파일에서 섹션 정보를 다시 추출합니다.")) {
      return;
    }

    try {
      const response = await fetch(`/api/static-pages/${id}/reparse`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to reparse page");

      const data = await response.json();
      alert(`✅ ${data.message}\n섹션 수: ${data.sectionsCount}개`);

      await fetchPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reparse page");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`정말 "${title}" 페이지를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/static-pages/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete page");

      alert("✅ 페이지가 삭제되었습니다.");
      await fetchPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete page");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">정적 페이지 관리</h1>
            <p className="text-gray-600 mt-1">
              Misopin-renew 사이트의 HTML 페이지를 간편하게 수정합니다
            </p>
          </div>
        </div>

      </div>

      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">등록된 페이지가 없습니다</p>
            <p className="text-sm text-gray-400">
              데이터베이스 마이그레이션 후 시딩 스크립트를 실행하세요:
            </p>
            <code className="inline-block mt-2 px-4 py-2 bg-gray-100 rounded text-sm">
              npm run db:seed:static
            </code>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>슬러그</TableHead>
                <TableHead>파일 경로</TableHead>
                <TableHead>마지막 수정</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {page.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-gray-500">{page.filePath}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(page.lastEdited).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {page.editMode === 'ATTRIBUTE' ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => router.push(`/admin/static-pages/${page.slug}/edit`)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          편집
                        </Button>
                      ) : (
                        <Link href={`/admin/static-pages/${page.id}`}>
                          <Button variant="default" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            편집
                          </Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
