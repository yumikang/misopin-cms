"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { File as FileType } from "@/lib/types/database";

// 파일 타입별 아이콘 매핑
function getFileIcon(mimeType: string | null) {
  if (!mimeType) return "📄";

  if (mimeType.includes("image")) return "🖼️";
  if (mimeType.includes("pdf")) return "📑";
  if (mimeType.includes("video")) return "🎥";
  if (mimeType.includes("audio")) return "🎵";
  if (mimeType.includes("text")) return "📝";
  if (mimeType.includes("zip") || mimeType.includes("rar")) return "📦";

  return "📄";
}

// 파일 타입별 배지 색상
function getFileTypeBadge(mimeType: string | null) {
  if (!mimeType) return <Badge variant="secondary">기타</Badge>;

  if (mimeType.includes("image/webp")) return <Badge className="bg-green-500">WebP</Badge>;
  if (mimeType.includes("image")) return <Badge className="bg-blue-500">이미지</Badge>;
  if (mimeType.includes("pdf")) return <Badge className="bg-red-500">PDF</Badge>;
  if (mimeType.includes("video")) return <Badge className="bg-purple-500">비디오</Badge>;
  if (mimeType.includes("audio")) return <Badge className="bg-yellow-500">오디오</Badge>;

  return <Badge variant="secondary">기타</Badge>;
}

interface ExtendedFile extends FileType {
  formattedSize?: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<ExtendedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [filterFolder, setFilterFolder] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterFolder !== "all") params.append("folder", filterFolder);
      if (filterType !== "all") params.append("mime_type", filterType);

      const response = await fetch(`/api/files?${params}`);
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [filterFolder, filterType]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        // 파일 타입에 따라 폴더 자동 설정
        let folder = "uploads";
        if (file.type.includes("image")) folder = "images";
        else if (file.type.includes("pdf")) folder = "documents";
        else if (file.type.includes("video")) folder = "videos";

        formData.append("folder", folder);

        const response = await fetch("/api/files", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error(`Failed to upload ${file.name}`);
      }

      await fetchFiles();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return;

    if (!confirm(`정말 선택한 ${selectedFiles.length}개 파일을 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch("/api/files", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedFiles }),
      });

      if (!response.ok) throw new Error("Failed to delete files");

      const result = await response.json();
      alert(result.message);

      setSelectedFiles([]);
      await fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete files");
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm("정말 이 파일을 삭제하시겠습니까?")) return;

    try {
      // Find the file to get filename and folder for storage deletion
      const file = files.find(f => f.id === id);
      const params = new URLSearchParams({ id });
      if (file) {
        params.append('filename', file.filename);
        params.append('folder', file.folder || 'uploads');
      }

      const response = await fetch(`/api/files?${params}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete file");

      await fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map(f => f.id));
    }
  };

  // 폴더 목록 추출
  const folders = Array.from(new Set(files.map(f => f.folder).filter(Boolean)));

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">파일 관리</h1>
          <p className="text-gray-600 mt-1">업로드된 파일을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          {selectedFiles.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
            >
              선택 삭제 ({selectedFiles.length})
            </Button>
          )}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "업로드 중..." : "파일 업로드"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,application/pdf,video/*,audio/*"
          />
        </div>
      </div>

      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex gap-4">
        <Select value={filterFolder} onValueChange={setFilterFolder}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="폴더 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 폴더</SelectItem>
            {folders.map(folder => (
              <SelectItem key={folder} value={folder || "none"}>
                {folder || "기타"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="파일 타입" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 타입</SelectItem>
            <SelectItem value="image">이미지</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="video">비디오</SelectItem>
            <SelectItem value="audio">오디오</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">업로드된 파일이 없습니다</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedFiles.length === files.length && files.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-16">타입</TableHead>
                <TableHead>파일명</TableHead>
                <TableHead>원본 파일명</TableHead>
                <TableHead>폴더</TableHead>
                <TableHead>크기</TableHead>
                <TableHead>업로드일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedFiles.includes(file.id)}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-2xl">{getFileIcon(file.mime_type)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{file.filename}</span>
                      {getFileTypeBadge(file.mime_type)}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {file.original_name || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{file.folder || "기타"}</Badge>
                  </TableCell>
                  <TableCell>{file.formattedSize}</TableCell>
                  <TableCell>
                    {new Date(file.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {file.mime_type?.includes("image") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(file.url, "_blank")}
                        >
                          보기
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Mock download - 실제로는 파일 다운로드 구현 필요
                          const link = document.createElement("a");
                          link.href = file.url;
                          link.download = file.original_name || file.filename;
                          link.click();
                        }}
                      >
                        다운로드
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSingle(file.id)}
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

      {!loading && files.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          총 {files.length}개 파일 |
          선택된 파일: {selectedFiles.length}개
        </div>
      )}
    </div>
  );
}