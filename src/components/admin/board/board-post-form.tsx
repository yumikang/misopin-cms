"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// TypeScript 인터페이스 정의
interface BoardPostFormData {
  boardType: 'NOTICE' | 'EVENT';
  title: string;
  content: string;
  excerpt?: string;
  imageUrl?: string;
  tags: string;
  isPublished: boolean;
  isPinned: boolean;
}

// Zod 검증 스키마
const boardPostSchema = z.object({
  boardType: z.enum(['NOTICE', 'EVENT'], {
    required_error: "게시판 타입을 선택해주세요",
  }),
  title: z.string().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이하로 입력해주세요'),
  content: z.string().min(1, '내용을 입력해주세요').max(5000, '내용은 5000자 이하로 입력해주세요'),
  excerpt: z.string().max(500, '요약은 500자 이하로 입력해주세요').optional().or(z.literal('')),
  imageUrl: z.string().url('올바른 URL을 입력해주세요').optional().or(z.literal('')),
  tags: z.string().optional(),
  isPublished: z.boolean().default(false),
  isPinned: z.boolean().default(false)
});

interface BoardPostFormProps {
  mode: "create" | "edit";
  initialData?: Partial<BoardPostFormData>;
  postId?: string;
}

export function BoardPostForm({ mode, initialData, postId }: BoardPostFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  // React Hook Form 설정
  const form = useForm<BoardPostFormData>({
    resolver: zodResolver(boardPostSchema),
    defaultValues: {
      boardType: initialData?.boardType || "NOTICE",
      title: initialData?.title || "",
      content: initialData?.content || "",
      excerpt: initialData?.excerpt || "",
      imageUrl: initialData?.imageUrl || "",
      tags: initialData?.tags || "",
      isPublished: initialData?.isPublished || false,
      isPinned: initialData?.isPinned || false,
    },
  });

  const onSubmit = async (data: BoardPostFormData) => {
    setIsLoading(true);
    try {
      const url = mode === "create" ? "/api/board-posts" : `/api/board-posts/${postId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      // 태그 문자열을 배열로 변환
      const tagsArray = data.tags
        ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          author: session?.user?.name || "관리자",
          tags: tagsArray,
          imageUrl: data.imageUrl || undefined,
          excerpt: data.excerpt || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('게시글 저장에 실패했습니다');
      }

      toast.success(mode === "create" ? '게시글이 성공적으로 생성되었습니다' : '게시글이 성공적으로 수정되었습니다');
      router.push('/admin/board');
    } catch (error) {
      console.error('게시글 저장 오류:', error);
      toast.error('게시글 저장 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 기본 정보 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제목 *</FormLabel>
                  <FormControl>
                    <Input placeholder="게시글 제목을 입력하세요" {...field} />
                  </FormControl>
                  <FormDescription>
                    게시글 제목입니다. (최대 200자)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>내용 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="게시글 내용을 입력하세요"
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    게시글의 주요 내용입니다. (최대 5000자)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>요약</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="게시글 요약을 입력하세요 (선택사항)"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    목록에 표시될 간략한 요약입니다. (최대 500자)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 게시판 설정 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>게시판 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="boardType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>게시판 타입 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="게시판 타입을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NOTICE">공지사항</SelectItem>
                      <SelectItem value="EVENT">이벤트</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    게시글이 표시될 게시판 유형을 선택하세요
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>태그</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="태그를 쉼표로 구분하여 입력하세요 (예: 공지, 중요, 업데이트)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    게시글 분류를 위한 태그입니다. 쉼표로 구분하세요.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      즉시 공개
                    </FormLabel>
                    <FormDescription>
                      체크하면 저장 후 즉시 게시글이 공개됩니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPinned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      상단 고정
                    </FormLabel>
                    <FormDescription>
                      체크하면 게시글이 목록 상단에 고정됩니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 추가 정보 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>추가 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>썸네일 이미지 URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    게시글 목록에 표시할 이미지의 URL (선택사항)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">작성자</label>
              <div className="text-sm text-muted-foreground">
                {session?.user?.name || "관리자"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 버튼 섹션 */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            취소
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? '저장 중...' : mode === "create" ? '게시글 생성' : '게시글 수정'}
            <Save className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </Form>
  );
}