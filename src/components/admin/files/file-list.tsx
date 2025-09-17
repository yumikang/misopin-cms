"use client";

import React, { useState, useCallback, memo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MoreHorizontal,
  Download,
  Eye,
  Trash2,
  Edit,
  FileText,
  Image,
  File,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface FileData {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  category: string;
  description?: string;
  uploadedBy?: {
    name: string;
    email: string;
  };
  uploadedAt: string;
}

interface FileListProps {
  files: FileData[];
  loading?: boolean;
  onRefresh?: () => void;
  onDelete?: (fileId: string) => void;
  onEdit?: (fileId: string, data: any) => void;
}

const FileListComponent: React.FC<FileListProps> = ({
  files,
  loading = false,
  onRefresh,
  onDelete,
  onEdit,
}) => {
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<FileData | null>(null);
  const [editCategory, setEditCategory] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 파일 아이콘 선택
  const getFileIcon = useCallback((mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return Image;
    } else if (mimeType === 'application/pdf') {
      return FileText;
    } else {
      return File;
    }
  }, []);

  // 파일 크기 포맷
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }, []);

  // 카테고리 색상
  const getCategoryVariant = useCallback((category: string) => {
    switch (category) {
      case 'images':
        return 'default';
      case 'documents':
        return 'secondary';
      case 'others':
        return 'outline';
      default:
        return 'outline';
    }
  }, []);

  // 파일 삭제
  const handleDelete = useCallback(async () => {
    if (!deleteFileId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/files/${deleteFileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '파일 삭제 실패');
      }

      toast.success('파일이 삭제되었습니다.');
      if (onDelete) {
        onDelete(deleteFileId);
      }
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '파일 삭제 실패');
    } finally {
      setIsDeleting(false);
      setDeleteFileId(null);
    }
  }, [deleteFileId, onDelete, onRefresh]);

  // 파일 편집
  const handleEdit = useCallback(async () => {
    if (!editingFile) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/files/${editingFile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: editCategory,
          description: editDescription,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '파일 수정 실패');
      }

      toast.success('파일 정보가 수정되었습니다.');
      if (onEdit) {
        onEdit(editingFile.id, {
          category: editCategory,
          description: editDescription,
        });
      }
      if (onRefresh) {
        onRefresh();
      }
      setEditingFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '파일 수정 실패');
    } finally {
      setIsSaving(false);
    }
  }, [editingFile, editCategory, editDescription, onEdit, onRefresh]);

  // 편집 다이얼로그 열기
  const openEditDialog = useCallback((file: FileData) => {
    setEditingFile(file);
    setEditCategory(file.category);
    setEditDescription(file.description || '');
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-muted-foreground">업로드된 파일이 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>파일명</TableHead>
            <TableHead>카테고리</TableHead>
            <TableHead>크기</TableHead>
            <TableHead>업로드</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => {
            const IconComponent = getFileIcon(file.mimeType);

            return (
              <TableRow key={file.id}>
                <TableCell>
                  <IconComponent className="h-5 w-5 text-gray-400" />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{file.originalName}</p>
                    {file.description && (
                      <p className="text-sm text-muted-foreground">
                        {file.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getCategoryVariant(file.category)}>
                    {file.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {formatFileSize(file.size)}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{file.uploadedBy?.name || '알 수 없음'}</p>
                    <p className="text-muted-foreground">
                      {format(new Date(file.uploadedAt), 'MM월 dd일', { locale: ko })}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          미리보기
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a
                          href={file.url}
                          download={file.originalName}
                          className="flex items-center"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          다운로드
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openEditDialog(file)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        편집
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteFileId(file.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={!!deleteFileId}
        onOpenChange={(open) => !open && setDeleteFileId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>파일 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                '삭제'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 편집 다이얼로그 */}
      <Dialog
        open={!!editingFile}
        onOpenChange={(open) => !open && setEditingFile(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>파일 정보 수정</DialogTitle>
            <DialogDescription>
              파일의 카테고리와 설명을 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-category">카테고리</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">일반</SelectItem>
                  <SelectItem value="images">이미지</SelectItem>
                  <SelectItem value="documents">문서</SelectItem>
                  <SelectItem value="others">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-description">설명</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="파일에 대한 설명을 입력하세요"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setEditingFile(null)}
              disabled={isSaving}
            >
              취소
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const FileList = memo(FileListComponent);