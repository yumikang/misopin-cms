"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface PageFormData {
  slug: string;
  title: string;
  content: any;
  metadata: any;
  isPublished: boolean;
}

interface PageFormProps {
  initialData?: Partial<PageFormData>;
  pageId?: string;
  mode: "create" | "edit";
}

export function PageForm({ initialData, pageId, mode }: PageFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<PageFormData>({
    slug: initialData?.slug || "",
    title: initialData?.title || "",
    content: initialData?.content || { sections: [] },
    metadata: initialData?.metadata || {
      title: "",
      description: "",
      keywords: ""
    },
    isPublished: initialData?.isPublished || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = mode === "create" ? "/api/pages" : `/api/pages/${pageId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "요청 처리에 실패했습니다.");
      }

      const result = await response.json();

      toast.success(
        mode === "create" ? "페이지가 생성되었습니다." : "페이지가 수정되었습니다."
      );

      router.push("/admin/pages");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentChange = (content: string) => {
    try {
      const parsedContent = JSON.parse(content);
      setFormData(prev => ({ ...prev, content: parsedContent }));
    } catch {
      // JSON이 아닌 경우 텍스트로 저장
      setFormData(prev => ({ ...prev, content: { html: content } }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          뒤로가기
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {mode === "create" ? "새 페이지 생성" : "페이지 수정"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "create"
              ? "새로운 페이지를 생성합니다."
              : "페이지 정보를 수정합니다."
            }
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 기본 정보 */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">페이지 제목 *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                      placeholder="페이지 제목을 입력하세요"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">슬러그 (URL) *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      required
                      placeholder="page-slug"
                      pattern="[a-z0-9-]+"
                      title="소문자, 숫자, 하이픈만 사용 가능합니다"
                    />
                    <p className="text-xs text-muted-foreground">
                      URL: /{formData.slug}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">페이지 컨텐츠</Label>
                  <Textarea
                    id="content"
                    value={typeof formData.content === "string" ? formData.content : JSON.stringify(formData.content, null, 2)}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="페이지 내용을 JSON 형태로 입력하거나 HTML을 입력하세요"
                    className="min-h-[300px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    구조화된 데이터는 JSON 형태로, 간단한 내용은 HTML로 입력하세요.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SEO 메타데이터 */}
            <Card>
              <CardHeader>
                <CardTitle>SEO 메타데이터</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="meta-title">메타 제목</Label>
                  <Input
                    id="meta-title"
                    value={formData.metadata.title}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, title: e.target.value }
                    }))}
                    placeholder="SEO용 페이지 제목"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta-description">메타 설명</Label>
                  <Textarea
                    id="meta-description"
                    value={formData.metadata.description}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, description: e.target.value }
                    }))}
                    placeholder="페이지 설명 (검색 결과에 표시됩니다)"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meta-keywords">키워드</Label>
                  <Input
                    id="meta-keywords"
                    value={formData.metadata.keywords}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, keywords: e.target.value }
                    }))}
                    placeholder="키워드를 쉼표로 구분하여 입력"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>게시 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, isPublished: checked }))
                    }
                  />
                  <Label htmlFor="published">
                    {formData.isPublished ? "발행됨" : "임시저장"}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  발행된 페이지만 웹사이트에서 접근할 수 있습니다.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>도움말</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p><strong>슬러그</strong>: URL에 사용되는 고유 식별자</p>
                <p><strong>컨텐츠</strong>: JSON 구조 또는 HTML 형태</p>
                <p><strong>메타데이터</strong>: SEO 최적화를 위한 정보</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>
    </div>
  );
}