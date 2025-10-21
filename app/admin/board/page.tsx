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
import type { Database } from "@/lib/database.types";

type BoardPost = Database['public']['Tables']['board_posts']['Row'];
type BoardPostInsert = Database['public']['Tables']['board_posts']['Insert'];

// Board type enum values
type BoardType = "NOTICE" | "EVENT";

const BOARD_TYPES: { value: BoardType; label: string }[] = [
  { value: "NOTICE", label: "공지사항" },
  { value: "EVENT", label: "이벤트" },
];

export default function BoardPage() {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BoardPost | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form data
  const [postForm, setPostForm] = useState<BoardPostInsert>({
    board_type: "NOTICE",
    title: "",
    content: "",
    excerpt: "",
    author: "",
    image_url: "",
    is_published: false,
    is_pinned: false,
    tags: null,
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/board/posts");
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = await response.json();
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  // Post handlers
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPost
        ? `/api/board/posts?id=${editingPost.id}`
        : "/api/board/posts";

      const response = await fetch(url, {
        method: editingPost ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postForm),
      });

      if (!response.ok) throw new Error("Failed to save post");

      await fetchPosts();
      handleClosePostDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("정말 이 게시글을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/board/posts?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete post");

      await fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 파일 업로드
    setUploading(true);
    setError(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('folder', 'board');

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '이미지 업로드에 실패했습니다.');
      }

      const data = await response.json();
      setPostForm({ ...postForm, image_url: data.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 업로드 중 오류가 발생했습니다.');
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPostForm({ ...postForm, image_url: "" });
    setImagePreview(null);
  };

  // Dialog handlers
  const handleOpenPostDialog = (post?: BoardPost) => {
    if (post) {
      setEditingPost(post);
      setPostForm({
        board_type: post.board_type,
        title: post.title,
        content: post.content || "",
        excerpt: post.excerpt || "",
        author: post.author || "",
        image_url: post.image_url || "",
        is_published: post.is_published,
        is_pinned: post.is_pinned || false,
        tags: post.tags || null,
      });
      setImagePreview(post.image_url || null);
    } else {
      setEditingPost(null);
      setPostForm({
        board_type: "NOTICE",
        title: "",
        content: "",
        excerpt: "",
        author: "",
        image_url: "",
        is_published: false,
        is_pinned: false,
        tags: null,
      });
      setImagePreview(null);
    }
    setPostDialogOpen(true);
  };

  const handleClosePostDialog = () => {
    setPostDialogOpen(false);
    setEditingPost(null);
    setImagePreview(null);
    setPostForm({
      board_type: "NOTICE",
      title: "",
      content: "",
      excerpt: "",
      author: "",
      image_url: "",
      is_published: false,
      is_pinned: false,
      tags: null,
    });
  };

  const getBoardTypeName = (boardType: string) => {
    const type = BOARD_TYPES.find(t => t.value === boardType);
    return type?.label || boardType;
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">게시판 관리</h1>
        <p className="text-gray-600 mt-1">게시판 게시글을 관리합니다</p>
      </div>

      {error && (
        <Alert className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">게시글 목록</h2>
          <Button onClick={() => handleOpenPostDialog()}>
            새 게시글 작성
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">등록된 게시글이 없습니다</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead>게시판 유형</TableHead>
                  <TableHead>작성자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>작성일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{post.title}</div>
                        {post.is_pinned && (
                          <Badge variant="secondary" className="mt-1">고정</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getBoardTypeName(post.board_type)}</TableCell>
                    <TableCell>{post.author || '미지정'}</TableCell>
                    <TableCell>
                      {post.is_published ? (
                        <Badge variant="default">게시중</Badge>
                      ) : (
                        <Badge variant="secondary">임시저장</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(post.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenPostDialog(post)}
                        >
                          수정
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePost(post.id)}
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
      </div>

      {/* Post Dialog */}
      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handlePostSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingPost ? "게시글 수정" : "새 게시글 작성"}
              </DialogTitle>
              <DialogDescription>
                게시글 내용을 입력하세요
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="post-board-type" className="text-right">게시판 유형 *</Label>
                <Select
                  value={postForm.board_type}
                  onValueChange={(value) => setPostForm({ ...postForm, board_type: value as BoardType })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="게시판 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARD_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="post-title" className="text-right">제목 *</Label>
                <Input
                  id="post-title"
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="post-author" className="text-right">작성자 *</Label>
                <Input
                  id="post-author"
                  value={postForm.author}
                  onChange={(e) => setPostForm({ ...postForm, author: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4 hidden">
                <Label htmlFor="post-excerpt" className="text-right">요약</Label>
                <Textarea
                  id="post-excerpt"
                  value={postForm.excerpt || ""}
                  onChange={(e) => setPostForm({ ...postForm, excerpt: e.target.value || null })}
                  className="col-span-3"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="post-content" className="text-right">내용 *</Label>
                <Textarea
                  id="post-content"
                  value={postForm.content || ""}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  className="col-span-3"
                  rows={10}
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="image_upload" className="text-right pt-2">
                  이미지
                </Label>
                <div className="col-span-3 space-y-3">
                  {/* 이미지 미리보기 */}
                  {(imagePreview || postForm.image_url) && (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview || postForm.image_url || ""}
                        alt="미리보기"
                        className="max-w-xs max-h-48 rounded border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* 파일 업로드 버튼 */}
                  <div>
                    <input
                      type="file"
                      id="image_upload"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="image_upload"
                      className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${
                        uploading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                          업로드 중...
                        </>
                      ) : (
                        <>
                          📷 이미지 선택
                        </>
                      )}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG, GIF, WebP (최대 5MB)
                    </p>
                  </div>

                  {/* 또는 URL 직접 입력 */}
                  <div className="pt-2 border-t">
                    <Label htmlFor="post-image" className="text-sm text-gray-600 mb-1 block">
                      또는 이미지 URL 직접 입력
                    </Label>
                    <Input
                      id="post-image"
                      value={postForm.image_url || ""}
                      onChange={(e) => {
                        setPostForm({ ...postForm, image_url: e.target.value || null });
                        setImagePreview(e.target.value || null);
                      }}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4 hidden">
                <Label htmlFor="post-tags" className="text-right">태그</Label>
                <Input
                  id="post-tags"
                  value={postForm.tags ? postForm.tags.join(", ") : ""}
                  onChange={(e) => {
                    const tagsString = e.target.value.trim();
                    const tagsArray = tagsString ? tagsString.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0) : null;
                    setPostForm({ ...postForm, tags: tagsArray });
                  }}
                  className="col-span-3"
                  placeholder="태그를 쉼표로 구분하여 입력"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">옵션</Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="post-published"
                      checked={postForm.is_published}
                      onCheckedChange={(checked) => setPostForm({ ...postForm, is_published: checked as boolean })}
                    />
                    <Label htmlFor="post-published">게시</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="post-pinned"
                      checked={postForm.is_pinned}
                      onCheckedChange={(checked) => setPostForm({ ...postForm, is_pinned: checked as boolean })}
                    />
                    <Label htmlFor="post-pinned">고정 게시글</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClosePostDialog}>
                취소
              </Button>
              <Button type="submit">
                {editingPost ? "수정" : "작성"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}