"use client";

import { useState, useEffect } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import type { BoardCategory, BoardPost, BoardCategoryInput, BoardPostInput } from "@/lib/types/database";

export default function BoardPage() {
  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BoardCategory | null>(null);
  const [editingPost, setEditingPost] = useState<BoardPost | null>(null);

  // Form data
  const [categoryForm, setCategoryForm] = useState<BoardCategoryInput>({
    name: "",
    slug: "",
    description: "",
    display_order: 0,
    is_active: true,
  });

  const [postForm, setPostForm] = useState<BoardPostInput>({
    category_id: "",
    title: "",
    content: "",
    excerpt: "",
    thumbnail_url: "",
    is_published: true,
    is_featured: false,
  });

  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/board/categories");
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    }
  };

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

  // Category handlers
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategory
        ? `/api/board/categories?id=${editingCategory.id}`
        : "/api/board/categories";

      const response = await fetch(url, {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      });

      if (!response.ok) throw new Error("Failed to save category");

      await fetchCategories();
      handleCloseCategoryDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("정말 이 카테고리를 삭제하시겠습니까? 관련 게시글도 함께 삭제될 수 있습니다.")) return;

    try {
      const response = await fetch(`/api/board/categories?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete category");

      await fetchCategories();
      await fetchPosts(); // Refresh posts as well
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
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

  // Dialog handlers
  const handleOpenCategoryDialog = (category?: BoardCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        display_order: category.display_order,
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: "",
        slug: "",
        description: "",
        display_order: categories.length + 1,
        is_active: true,
      });
    }
    setCategoryDialogOpen(true);
  };

  const handleCloseCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryForm({
      name: "",
      slug: "",
      description: "",
      display_order: 0,
      is_active: true,
    });
  };

  const handleOpenPostDialog = (post?: BoardPost) => {
    if (post) {
      setEditingPost(post);
      setPostForm({
        category_id: post.category_id || "",
        title: post.title,
        content: post.content || "",
        excerpt: post.excerpt || "",
        thumbnail_url: post.thumbnail_url || "",
        is_published: post.is_published,
        is_featured: post.is_featured,
      });
    } else {
      setEditingPost(null);
      setPostForm({
        category_id: categories[0]?.id || "",
        title: "",
        content: "",
        excerpt: "",
        thumbnail_url: "",
        is_published: true,
        is_featured: false,
      });
    }
    setPostDialogOpen(true);
  };

  const handleClosePostDialog = () => {
    setPostDialogOpen(false);
    setEditingPost(null);
    setPostForm({
      category_id: "",
      title: "",
      content: "",
      excerpt: "",
      thumbnail_url: "",
      is_published: true,
      is_featured: false,
    });
  };

  const getCategoryName = (categoryId: string | null) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "미분류";
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">게시판 관리</h1>
        <p className="text-gray-600 mt-1">게시판 카테고리와 게시글을 관리합니다</p>
      </div>

      {error && (
        <Alert className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">게시글</TabsTrigger>
          <TabsTrigger value="categories">카테고리</TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts">
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
                    <TableHead>카테고리</TableHead>
                    <TableHead>조회수</TableHead>
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
                          {post.is_featured && (
                            <Badge variant="secondary" className="mt-1">추천</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryName(post.category_id)}</TableCell>
                      <TableCell>{post.view_count}</TableCell>
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
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">카테고리 목록</h2>
            <Button onClick={() => handleOpenCategoryDialog()}>
              새 카테고리 추가
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">등록된 카테고리가 없습니다</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>슬러그</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead>순서</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.slug}</TableCell>
                      <TableCell>{category.description}</TableCell>
                      <TableCell>{category.display_order}</TableCell>
                      <TableCell>
                        {category.is_active ? (
                          <Badge variant="default">활성</Badge>
                        ) : (
                          <Badge variant="secondary">비활성</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCategoryDialog(category)}
                          >
                            수정
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
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
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCategorySubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "카테고리 수정" : "새 카테고리 추가"}
              </DialogTitle>
              <DialogDescription>
                카테고리 정보를 입력하세요
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cat-name" className="text-right">이름 *</Label>
                <Input
                  id="cat-name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cat-slug" className="text-right">슬러그 *</Label>
                <Input
                  id="cat-slug"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  className="col-span-3"
                  placeholder="url-friendly-name"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cat-desc" className="text-right">설명</Label>
                <Textarea
                  id="cat-desc"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cat-order" className="text-right">순서</Label>
                <Input
                  id="cat-order"
                  type="number"
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">활성화</Label>
                <Checkbox
                  checked={categoryForm.is_active}
                  onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, is_active: checked as boolean })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseCategoryDialog}>
                취소
              </Button>
              <Button type="submit">
                {editingCategory ? "수정" : "추가"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                <Label htmlFor="post-category" className="text-right">카테고리 *</Label>
                <Select
                  value={postForm.category_id}
                  onValueChange={(value) => setPostForm({ ...postForm, category_id: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
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
                <Label htmlFor="post-excerpt" className="text-right">요약</Label>
                <Textarea
                  id="post-excerpt"
                  value={postForm.excerpt}
                  onChange={(e) => setPostForm({ ...postForm, excerpt: e.target.value })}
                  className="col-span-3"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="post-content" className="text-right">내용 *</Label>
                <Textarea
                  id="post-content"
                  value={postForm.content}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  className="col-span-3"
                  rows={10}
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="post-thumbnail" className="text-right">썸네일 URL</Label>
                <Input
                  id="post-thumbnail"
                  value={postForm.thumbnail_url}
                  onChange={(e) => setPostForm({ ...postForm, thumbnail_url: e.target.value })}
                  className="col-span-3"
                  placeholder="https://example.com/image.jpg"
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
                      id="post-featured"
                      checked={postForm.is_featured}
                      onCheckedChange={(checked) => setPostForm({ ...postForm, is_featured: checked as boolean })}
                    />
                    <Label htmlFor="post-featured">추천 게시글</Label>
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