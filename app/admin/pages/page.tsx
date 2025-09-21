"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import type { Page, PageInput } from "@/lib/types/database";

// 슬러그 자동 생성 함수
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function PagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<PageInput>({
    title: "",
    slug: "",
    content: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    is_published: true,
    template: "default",
  });

  useEffect(() => {
    fetchPages();
  }, []);

  // 제목 변경 시 슬러그 자동 생성
  useEffect(() => {
    if (!editingPage && formData.title) {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(formData.title)
      }));
    }
  }, [formData.title, editingPage]);

  const fetchPages = async () => {
    try {
      const response = await fetch("/api/pages");
      if (!response.ok) throw new Error("Failed to fetch pages");
      const data = await response.json();
      setPages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pages");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingPage
        ? `/api/pages?id=${editingPage.id}`
        : "/api/pages";

      const method = editingPage ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save page");

      await fetchPages();
      handleCloseDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save page");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 페이지를 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/pages?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete page");

      await fetchPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete page");
    }
  };

  const handleTogglePublish = async (page: Page) => {
    try {
      const response = await fetch(`/api/pages?id=${page.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_published: !page.is_published }),
      });

      if (!response.ok) throw new Error("Failed to update page");

      await fetchPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update page");
    }
  };

  const handleOpenDialog = (page?: Page) => {
    if (page) {
      setEditingPage(page);
      setFormData({
        title: page.title,
        slug: page.slug,
        content: page.content || "",
        meta_title: page.meta_title || "",
        meta_description: page.meta_description || "",
        meta_keywords: page.meta_keywords || "",
        is_published: page.is_published,
        template: page.template as "default" | "landing" | "contact" | "about",
      });
    } else {
      setEditingPage(null);
      setFormData({
        title: "",
        slug: "",
        content: "",
        meta_title: "",
        meta_description: "",
        meta_keywords: "",
        is_published: true,
        template: "default",
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPage(null);
    setFormData({
      title: "",
      slug: "",
      content: "",
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      is_published: true,
      template: "default",
    });
  };

  const getTemplateName = (template: string) => {
    const templates: { [key: string]: string } = {
      default: "기본",
      landing: "랜딩",
      contact: "연락처",
      about: "소개",
    };
    return templates[template] || "기본";
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">페이지 관리</h1>
          <p className="text-gray-600 mt-1">웹사이트 정적 페이지를 관리합니다</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          새 페이지 추가
        </Button>
      </div>

      {error && (
        <Alert className="mb-4">
          <AlertDescription>{error}</AlertDescription>
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
            <p className="text-gray-500">등록된 페이지가 없습니다</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>슬러그</TableHead>
                <TableHead>템플릿</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>수정일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{page.title}</div>
                      {page.meta_title && (
                        <div className="text-xs text-gray-500 mt-1">
                          SEO: {page.meta_title}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      /{page.slug}
                    </code>
                  </TableCell>
                  <TableCell>{getTemplateName(page.template)}</TableCell>
                  <TableCell>
                    {page.is_published ? (
                      <Badge variant="default">게시중</Badge>
                    ) : (
                      <Badge variant="secondary">미게시</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(page.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(page)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTogglePublish(page)}
                      >
                        {page.is_published ? "미게시" : "게시"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(page.id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingPage ? "페이지 수정" : "새 페이지 추가"}
              </DialogTitle>
              <DialogDescription>
                페이지 정보를 입력하세요
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  제목 *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="slug" className="text-right">
                  슬러그 *
                </Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="col-span-3"
                  placeholder="url-friendly-name"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="template" className="text-right">
                  템플릿
                </Label>
                <Select
                  value={formData.template}
                  onValueChange={(value: "default" | "landing" | "contact" | "about") =>
                    setFormData({ ...formData, template: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">기본</SelectItem>
                    <SelectItem value="landing">랜딩</SelectItem>
                    <SelectItem value="contact">연락처</SelectItem>
                    <SelectItem value="about">소개</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="content" className="text-right">
                  내용
                </Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="col-span-3"
                  rows={10}
                  placeholder="HTML 내용을 입력하세요..."
                />
              </div>

              <div className="col-span-4">
                <h3 className="font-semibold text-lg mb-4">SEO 메타데이터</h3>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="meta_title" className="text-right">
                  메타 제목
                </Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  className="col-span-3"
                  placeholder="검색 결과에 표시될 제목"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="meta_description" className="text-right">
                  메타 설명
                </Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  className="col-span-3"
                  rows={3}
                  placeholder="검색 결과에 표시될 설명"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="meta_keywords" className="text-right">
                  키워드
                </Label>
                <Input
                  id="meta_keywords"
                  value={formData.meta_keywords}
                  onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                  className="col-span-3"
                  placeholder="쉼표로 구분된 키워드"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">옵션</Label>
                <div className="col-span-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_published"
                      checked={formData.is_published}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_published: checked as boolean })
                      }
                    />
                    <Label htmlFor="is_published">게시</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                취소
              </Button>
              <Button type="submit">
                {editingPage ? "수정" : "추가"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}