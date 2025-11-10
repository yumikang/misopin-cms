"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

interface Service {
  id: string;
  code: string;
  name: string;
  category: string;
  durationMinutes: number;
}

interface ServiceLimit {
  id: string;
  serviceType: string;
  serviceId: string;
  service: Service;
  dailyLimitMinutes: number | null;
  isActive: boolean;
  reason: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EditingLimit {
  limit: ServiceLimit;
  formData: {
    dailyLimitMinutes: number;
    isActive: boolean;
    reason: string;
  };
}

export function ServiceLimitSettings() {
  const [limits, setLimits] = useState<ServiceLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingLimit, setEditingLimit] = useState<EditingLimit | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("로그인이 필요합니다");
        return;
      }

      const response = await fetch("/api/admin/service-limits", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("한도 정보를 불러오는데 실패했습니다");
      }

      const data = await response.json();
      setLimits(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (limit: ServiceLimit) => {
    setEditingLimit({
      limit,
      formData: {
        dailyLimitMinutes: limit.dailyLimitMinutes || 0,
        isActive: limit.isActive,
        reason: limit.reason || "",
      },
    });
    setSuccess(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!editingLimit) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("로그인이 필요합니다");
      }

      const response = await fetch("/api/admin/service-limits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: editingLimit.limit.serviceId,
          dailyLimitMinutes: editingLimit.formData.dailyLimitMinutes,
          isActive: editingLimit.formData.isActive,
          reason: editingLimit.formData.reason,
        }),
      });

      if (!response.ok) {
        throw new Error("저장에 실패했습니다");
      }

      const result = await response.json();
      setSuccess(result.message);
      setEditingLimit(null);
      await fetchLimits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (limit: ServiceLimit, checked: boolean) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("로그인이 필요합니다");
      }

      const response = await fetch("/api/admin/service-limits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceId: limit.serviceId,
          dailyLimitMinutes: limit.dailyLimitMinutes || 0,
          isActive: checked,
          reason: checked ? "활성화" : "비활성화",
        }),
      });

      if (!response.ok) {
        throw new Error("상태 변경에 실패했습니다");
      }

      setSuccess(checked ? "한도가 활성화되었습니다" : "한도가 비활성화되었습니다");
      await fetchLimits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "상태 변경 실패");
    } finally {
      setSaving(false);
    }
  };

  const formatMinutesToHours = (minutes: number | null) => {
    if (minutes === null || minutes === 0) return "무제한";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}시간`;
    return `${hours}시간 ${mins}분`;
  };

  const calculateMaxBookings = (limitMinutes: number, durationMinutes: number) => {
    if (limitMinutes === 0 || durationMinutes === 0) return 0;
    return Math.floor(limitMinutes / durationMinutes);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border overflow-hidden">
        <div className="w-full overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[22%]">시술명</TableHead>
                <TableHead className="w-[20%]">일일 한도</TableHead>
                <TableHead className="w-[14%]">시술시간</TableHead>
                <TableHead className="w-[16%]">최대건수</TableHead>
                <TableHead className="w-[14%] text-center">상태</TableHead>
                <TableHead className="w-[14%] text-center">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {limits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    설정된 한도가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                limits.map((limit) => (
                  <TableRow key={limit.id}>
                    <TableCell className="font-medium">
                      {limit.service.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{formatMinutesToHours(limit.dailyLimitMinutes)}</span>
                        {limit.dailyLimitMinutes && (
                          <span className="text-xs text-gray-500">
                            ({limit.dailyLimitMinutes}분)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{limit.service.durationMinutes}분</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {limit.dailyLimitMinutes
                        ? `${calculateMaxBookings(
                            limit.dailyLimitMinutes,
                            limit.service.durationMinutes
                          )}건`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={limit.isActive}
                        onCheckedChange={(checked) => handleToggle(limit, checked)}
                        disabled={saving}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(limit)}
                        className="whitespace-nowrap px-3"
                      >
                        편집
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {editingLimit && (
        <Dialog open onOpenChange={() => setEditingLimit(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingLimit.limit.service.name} 한도 설정
              </DialogTitle>
              <DialogDescription>
                일일 예약 시간 한도를 설정합니다
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>일일 한도 (분)</Label>
                <Input
                  type="number"
                  min="0"
                  step="30"
                  value={editingLimit.formData.dailyLimitMinutes}
                  onChange={(e) =>
                    setEditingLimit({
                      ...editingLimit,
                      formData: {
                        ...editingLimit.formData,
                        dailyLimitMinutes: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    • 시술 시간: {editingLimit.limit.service.durationMinutes}분
                  </p>
                  <p>
                    • 입력한 한도:{" "}
                    {formatMinutesToHours(editingLimit.formData.dailyLimitMinutes)}
                  </p>
                  <p className="font-medium text-blue-600">
                    → 최대{" "}
                    {calculateMaxBookings(
                      editingLimit.formData.dailyLimitMinutes,
                      editingLimit.limit.service.durationMinutes
                    )}
                    건 예약 가능
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>변경 사유</Label>
                <Input
                  value={editingLimit.formData.reason}
                  onChange={(e) =>
                    setEditingLimit({
                      ...editingLimit,
                      formData: {
                        ...editingLimit.formData,
                        reason: e.target.value,
                      },
                    })
                  }
                  placeholder="예: 시술 수요 증가로 한도 상향"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={editingLimit.formData.isActive}
                  onCheckedChange={(checked) =>
                    setEditingLimit({
                      ...editingLimit,
                      formData: {
                        ...editingLimit.formData,
                        isActive: checked,
                      },
                    })
                  }
                />
                <Label htmlFor="active" className="cursor-pointer">
                  한도 활성화
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingLimit(null)}
              >
                취소
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
        <p className="font-medium mb-1">💡 안내</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>일일 한도: 하루 총 예약 시간(분)</li>
          <li>30분 단위 권장</li>
          <li>무제한: 0 입력 또는 비활성화</li>
        </ul>
      </div>
    </div>
  );
}
