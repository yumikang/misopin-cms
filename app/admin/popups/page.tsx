"use client";

import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation"; // 추후 페이지 전환 기능 구현 시 사용
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Popup, PopupInput } from "@/lib/types/database";

export default function PopupsPage() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Popup | null>(null);
  const [error, setError] = useState<string | null>(null);
  // const router = useRouter(); // 추후 페이지 전환 기능 구현 시 사용

  const [formData, setFormData] = useState<PopupInput>({
    title: "",
    content: "",
    image_url: "",
    link_url: "",
    display_type: "MODAL",
    start_date: "",
    end_date: "",
    is_active: true,
    show_today_close: true,
    position: "CENTER",
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    fetchPopups();
  }, []);

  const fetchPopups = async () => {
    try {
      const response = await fetch("/api/popups");
      if (!response.ok) throw new Error("Failed to fetch popups");
      const data = await response.json();
      setPopups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load popups");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingPopup
        ? `/api/popups?id=${editingPopup.id}`
        : "/api/popups";

      const method = editingPopup ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save popup");

      await fetchPopups();
      handleCloseDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save popup");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 팝업을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/popups?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete popup");

      await fetchPopups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete popup");
    }
  };

  const handleToggleActive = async (popup: Popup) => {
    try {
      const response = await fetch(`/api/popups?id=${popup.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !popup.is_active }),
      });

      if (!response.ok) throw new Error("Failed to update popup");

      await fetchPopups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update popup");
    }
  };

  const handleOpenDialog = (popup?: Popup) => {
    if (popup) {
      setEditingPopup(popup);
      setFormData({
        title: popup.title,
        content: popup.content || "",
        image_url: popup.image_url || "",
        link_url: popup.link_url || "",
        display_type: popup.display_type as "MODAL" | "LAYER" | "BANNER",
        start_date: popup.start_date || "",
        end_date: popup.end_date || "",
        is_active: popup.is_active,
        show_today_close: popup.show_today_close,
        position: popup.position as "CENTER" | "TOP" | "BOTTOM" | "LEFT" | "RIGHT",
        width: popup.width || undefined,
        height: popup.height || undefined,
      });
    } else {
      setEditingPopup(null);
      setFormData({
        title: "",
        content: "",
        image_url: "",
        link_url: "",
        display_type: "MODAL",
        start_date: "",
        end_date: "",
        is_active: true,
        show_today_close: true,
        position: "CENTER",
        width: undefined,
        height: undefined,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPopup(null);
    setFormData({
      title: "",
      content: "",
      image_url: "",
      link_url: "",
      display_type: "MODAL",
      start_date: "",
      end_date: "",
      is_active: true,
      show_today_close: true,
      position: "CENTER",
      width: undefined,
      height: undefined,
    });
  };

  const getStatusBadge = (popup: Popup) => {
    const now = new Date();
    const startDate = popup.start_date ? new Date(popup.start_date) : null;
    const endDate = popup.end_date ? new Date(popup.end_date) : null;

    if (!popup.is_active) {
      return <Badge variant="secondary">비활성</Badge>;
    }

    if (startDate && startDate > now) {
      return <Badge variant="outline">예정</Badge>;
    }

    if (endDate && endDate < now) {
      return <Badge variant="secondary">종료</Badge>;
    }

    return <Badge variant="default">활성</Badge>;
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">팝업 관리</h1>
          <p className="text-gray-600 mt-1">웹사이트 팝업을 관리합니다</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          새 팝업 추가
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
        ) : popups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">등록된 팝업이 없습니다</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>노출 기간</TableHead>
                <TableHead>위치</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {popups.map((popup) => (
                <TableRow key={popup.id}>
                  <TableCell className="font-medium">{popup.title}</TableCell>
                  <TableCell>{popup.display_type}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {popup.start_date
                        ? new Date(popup.start_date).toLocaleDateString()
                        : "시작 없음"}
                      {" ~ "}
                      {popup.end_date
                        ? new Date(popup.end_date).toLocaleDateString()
                        : "종료 없음"}
                    </div>
                  </TableCell>
                  <TableCell>{popup.position}</TableCell>
                  <TableCell>{getStatusBadge(popup)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(popup)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(popup)}
                      >
                        {popup.is_active ? "비활성화" : "활성화"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(popup.id)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingPopup ? "팝업 수정" : "새 팝업 추가"}
              </DialogTitle>
              <DialogDescription>
                팝업 정보를 입력하세요
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
                <Label htmlFor="content" className="text-right">
                  내용
                </Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="col-span-3"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image_url" className="text-right">
                  이미지 URL
                </Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="col-span-3"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="link_url" className="text-right">
                  링크 URL
                </Label>
                <Input
                  id="link_url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  className="col-span-3"
                  placeholder="https://example.com/page"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="display_type" className="text-right">
                  표시 유형
                </Label>
                <Select
                  value={formData.display_type}
                  onValueChange={(value: "MODAL" | "LAYER" | "BANNER") =>
                    setFormData({ ...formData, display_type: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MODAL">모달</SelectItem>
                    <SelectItem value="LAYER">레이어</SelectItem>
                    <SelectItem value="BANNER">배너</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="position" className="text-right">
                  위치
                </Label>
                <Select
                  value={formData.position}
                  onValueChange={(value: "CENTER" | "TOP" | "BOTTOM" | "LEFT" | "RIGHT") =>
                    setFormData({ ...formData, position: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CENTER">중앙</SelectItem>
                    <SelectItem value="TOP">상단</SelectItem>
                    <SelectItem value="BOTTOM">하단</SelectItem>
                    <SelectItem value="LEFT">왼쪽</SelectItem>
                    <SelectItem value="RIGHT">오른쪽</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="start_date" className="text-right">
                  시작일
                </Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="end_date" className="text-right">
                  종료일
                </Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="width" className="text-right">
                  너비 (px)
                </Label>
                <Input
                  id="width"
                  type="number"
                  value={formData.width || ""}
                  onChange={(e) => setFormData({ ...formData, width: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="col-span-3"
                  placeholder="500"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="height" className="text-right">
                  높이 (px)
                </Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height || ""}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="col-span-3"
                  placeholder="400"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">옵션</Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="is_active">활성화</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show_today_close"
                      checked={formData.show_today_close}
                      onChange={(e) => setFormData({ ...formData, show_today_close: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="show_today_close">오늘 하루 닫기 표시</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                취소
              </Button>
              <Button type="submit">
                {editingPopup ? "수정" : "추가"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}