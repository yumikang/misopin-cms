"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  Upload,
  Image as ImageIcon,
  Type,
  Palette,
  History,
} from "lucide-react";

interface Section {
  id: string;
  type: "text" | "image" | "background";
  label: string;
  selector: string;
  content?: string;
  imageUrl?: string;
  alt?: string;
  preview?: string;
}

interface StaticPage {
  id: string;
  slug: string;
  title: string;
  filePath: string;
  sections: Section[];
  isPublished: boolean;
  lastEdited: string;
  versions: {
    id: string;
    version: number;
    changedBy: string;
    changeNote: string;
    createdAt: string;
  }[];
}

export default function EditStaticPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.id as string;

  const [page, setPage] = useState<StaticPage | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 이미지 업로드 다이얼로그
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingSectionId, setUploadingSectionId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPage();
  }, [pageId]);

  const fetchPage = async () => {
    try {
      const response = await fetch(`/api/static-pages/${pageId}`);
      if (!response.ok) throw new Error("Failed to fetch page");

      const data = await response.json();
      setPage(data.page);
      setSections(data.page.sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load page");
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (sectionId: string, field: string, value: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section
      )
    );
  };

  const handleSave = async () => {
    if (!page) return;

    const changeNote = prompt("변경 사항을 간단히 설명해주세요 (선택사항):");
    if (changeNote === null) return; // 취소

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/static-pages/${pageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sections,
          changedBy: "admin", // TODO: 실제 사용자 정보
          changeNote: changeNote || "페이지 업데이트",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to save page");
      }

      const data = await response.json();
      setSuccessMessage(`✅ ${data.message} (버전 ${data.version})`);

      // 페이지 새로고침
      await fetchPage();

      // 성공 메시지 3초 후 제거
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File, category: string = "content") => {
    if (!uploadingSectionId) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      formData.append("maxWidth", "1920");
      formData.append("quality", "85");

      const response = await fetch("/api/static-pages/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload image");

      const data = await response.json();

      // 섹션 업데이트
      handleSectionChange(uploadingSectionId, "imageUrl", data.files.webp.url);

      setUploadDialogOpen(false);
      setUploadingSectionId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const openUploadDialog = (sectionId: string) => {
    setUploadingSectionId(sectionId);
    setUploadDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">로딩 중...</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            페이지를 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const textSections = sections.filter((s) => s.type === "text");
  const imageSections = sections.filter((s) => s.type === "image");
  const backgroundSections = sections.filter((s) => s.type === "background");

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{page.filePath}</p>
          </div>
          <Badge variant={page.isPublished ? "default" : "secondary"}>
            {page.isPublished ? "게시중" : "미게시"}
          </Badge>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "저장 중..." : "변경사항 저장"}
        </Button>
      </div>

      {/* 알림 */}
      {error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* 편집 탭 */}
      <Tabs defaultValue="text" className="space-y-4">
        <TabsList>
          <TabsTrigger value="text">
            <Type className="h-4 w-4 mr-2" />
            텍스트 ({textSections.length})
          </TabsTrigger>
          <TabsTrigger value="images">
            <ImageIcon className="h-4 w-4 mr-2" />
            이미지 ({imageSections.length})
          </TabsTrigger>
          <TabsTrigger value="backgrounds">
            <Palette className="h-4 w-4 mr-2" />
            배너 ({backgroundSections.length})
          </TabsTrigger>
          <TabsTrigger value="versions">
            <History className="h-4 w-4 mr-2" />
            버전 기록 ({page.versions?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* 텍스트 섹션 */}
        <TabsContent value="text" className="space-y-4">
          {textSections.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">편집 가능한 텍스트 섹션이 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            textSections.map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{section.label}</CardTitle>
                  <CardDescription>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {section.selector}
                    </code>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor={section.id}>내용</Label>
                    <Textarea
                      id={section.id}
                      value={section.content || ""}
                      onChange={(e) =>
                        handleSectionChange(section.id, "content", e.target.value)
                      }
                      rows={4}
                      placeholder="텍스트 내용을 입력하세요..."
                    />
                    {section.preview && (
                      <p className="text-xs text-gray-500 mt-1">
                        미리보기: {section.preview}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* 이미지 섹션 */}
        <TabsContent value="images" className="space-y-4">
          {imageSections.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">편집 가능한 이미지가 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            imageSections.map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{section.label}</CardTitle>
                  <CardDescription>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {section.selector}
                    </code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor={`${section.id}-url`}>이미지 URL</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id={`${section.id}-url`}
                        value={section.imageUrl || ""}
                        onChange={(e) =>
                          handleSectionChange(section.id, "imageUrl", e.target.value)
                        }
                        placeholder="/img/..."
                      />
                      <Button
                        variant="outline"
                        onClick={() => openUploadDialog(section.id)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        업로드
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`${section.id}-alt`}>대체 텍스트 (Alt)</Label>
                    <Input
                      id={`${section.id}-alt`}
                      value={section.alt || ""}
                      onChange={(e) =>
                        handleSectionChange(section.id, "alt", e.target.value)
                      }
                      placeholder="이미지 설명"
                      className="mt-2"
                    />
                  </div>
                  {section.imageUrl && (
                    <div className="mt-4">
                      <Label>미리보기</Label>
                      <img
                        src={section.imageUrl}
                        alt={section.alt || "preview"}
                        className="mt-2 max-w-md rounded border"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* 배너 이미지 섹션 */}
        <TabsContent value="backgrounds" className="space-y-4">
          {backgroundSections.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">편집 가능한 배너 이미지가 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            backgroundSections.map((section) => (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{section.label}</CardTitle>
                  <CardDescription>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {section.selector}
                    </code>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Label htmlFor={`${section.id}-bg`}>배너 이미지 URL</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id={`${section.id}-bg`}
                      value={section.imageUrl || ""}
                      onChange={(e) =>
                        handleSectionChange(section.id, "imageUrl", e.target.value)
                      }
                      placeholder="/img/..."
                    />
                    <Button
                      variant="outline"
                      onClick={() => openUploadDialog(section.id)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      업로드
                    </Button>
                  </div>
                  {section.imageUrl && (
                    <div className="mt-4">
                      <Label>미리보기</Label>
                      <img
                        src={section.imageUrl}
                        alt="background preview"
                        className="mt-2 max-w-md rounded border"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* 버전 기록 */}
        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle>버전 기록</CardTitle>
              <CardDescription>페이지 변경 이력을 확인할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              {page.versions && page.versions.length > 0 ? (
                <div className="space-y-3">
                  {page.versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">v{version.version}</Badge>
                          <span className="text-sm font-medium">{version.changeNote}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {version.changedBy} •{" "}
                          {new Date(version.createdAt).toLocaleString("ko-KR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">버전 기록이 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 이미지 업로드 다이얼로그 */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이미지 업로드</DialogTitle>
            <DialogDescription>
              이미지를 선택하면 WebP로 자동 변환되어 최적화됩니다
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(file);
                }
              }}
              disabled={uploading}
            />
            {uploading && (
              <p className="mt-2 text-sm text-gray-600">업로드 중...</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setUploadingSectionId(null);
              }}
              disabled={uploading}
            >
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
