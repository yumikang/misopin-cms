"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
interface PopupFormData {
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  startDate: string;
  endDate: string;
  position: string;
  showOnPages: string[];
  displayType: 'MODAL' | 'BANNER' | 'SLIDE_IN';
  priority: number;
  isActive: boolean;
}

// Zod 검증 스키마
const popupSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200, '제목은 200자 이하로 입력해주세요'),
  content: z.string().min(1, '내용을 입력해주세요').max(1000, '내용은 1000자 이하로 입력해주세요'),
  imageUrl: z.string().url('올바른 URL을 입력해주세요').optional().or(z.literal('')),
  linkUrl: z.string().url('올바른 URL을 입력해주세요').optional().or(z.literal('')),
  startDate: z.string().min(1, '시작일을 선택해주세요'),
  endDate: z.string().min(1, '종료일을 선택해주세요'),
  position: z.string().default('center'),
  showOnPages: z.array(z.string()).default([]),
  displayType: z.enum(['MODAL', 'BANNER', 'SLIDE_IN']).default('MODAL'),
  priority: z.number().min(0, '우선순위는 0 이상이어야 합니다').max(100, '우선순위는 100 이하여야 합니다').default(0),
  isActive: z.boolean().default(false)
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) > new Date(data.startDate);
  }
  return true;
}, {
  message: '종료일은 시작일보다 늦어야 합니다',
  path: ['endDate']
});

interface PopupFormProps {
  mode: "create" | "edit";
  initialData?: Partial<PopupFormData>;
  popupId?: string;
}

export function PopupForm({ mode, initialData, popupId }: PopupFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // React Hook Form 설정
  const form = useForm<PopupFormData>({
    resolver: zodResolver(popupSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      imageUrl: initialData?.imageUrl || "",
      linkUrl: initialData?.linkUrl || "",
      startDate: initialData?.startDate || "",
      endDate: initialData?.endDate || "",
      position: initialData?.position || "center",
      showOnPages: initialData?.showOnPages || [],
      displayType: initialData?.displayType || "MODAL",
      priority: initialData?.priority || 0,
      isActive: initialData?.isActive || false,
    },
  });

  const onSubmit = async (data: PopupFormData) => {
    setIsLoading(true);
    try {
      const url = mode === "create" ? "/api/popups" : `/api/popups/${popupId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          startDate: new Date(data.startDate).toISOString(),
          endDate: new Date(data.endDate).toISOString(),
          priority: Number(data.priority),
          showOnPages: data.showOnPages.length ? data.showOnPages : undefined,
          imageUrl: data.imageUrl || undefined,
          linkUrl: data.linkUrl || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('팝업 저장에 실패했습니다');
      }

      toast.success(mode === "create" ? '팝업이 성공적으로 생성되었습니다' : '팝업이 성공적으로 수정되었습니다');
      router.push('/admin/popups');
    } catch (error) {
      console.error('팝업 저장 오류:', error);
      toast.error('팝업 저장 중 오류가 발생했습니다');
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
                  <FormLabel>팝업 제목 *</FormLabel>
                  <FormControl>
                    <Input placeholder="팝업 제목을 입력하세요" {...field} />
                  </FormControl>
                  <FormDescription>
                    팝업 상단에 표시될 제목입니다. (최대 200자)
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
                  <FormLabel>팝업 내용 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="팝업에 표시될 내용을 입력하세요"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    팝업에 표시될 주요 내용입니다. (최대 1000자)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 표시 설정 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>표시 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시작일시 *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      팝업이 표시되기 시작할 날짜와 시간
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>종료일시 *</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      팝업이 종료될 날짜와 시간
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="displayType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>팝업 유형 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="팝업 유형을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MODAL">모달</SelectItem>
                      <SelectItem value="BANNER">배너</SelectItem>
                      <SelectItem value="SLIDE_IN">슬라이드인</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    팝업이 표시될 방식을 선택하세요
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>팝업 위치</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="팝업 위치를 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="top">상단</SelectItem>
                      <SelectItem value="center">중앙</SelectItem>
                      <SelectItem value="bottom">하단</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    팝업이 화면에 표시될 위치
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* 고급 설정 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle>고급 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>이미지 URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    팝업에 표시할 이미지의 URL (선택사항)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linkUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>링크 URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    팝업 클릭 시 이동할 URL (선택사항)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>우선순위</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    팝업 표시 우선순위 (0-100, 높을수록 우선)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      즉시 활성화
                    </FormLabel>
                    <FormDescription>
                      체크하면 저장 후 즉시 팝업이 활성화됩니다
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

        {/* 버튼 섹션 */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            취소
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? '저장 중...' : mode === "create" ? '팝업 생성' : '팝업 수정'}
            <Save className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>
    </Form>
  );
}