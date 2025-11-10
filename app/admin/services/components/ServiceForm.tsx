"use client";

import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Service, ServiceMutationResponse } from "@/app/api/admin/services/types";
import { useToast } from "@/hooks/use-toast";
import { Info, AlertCircle } from "lucide-react";

interface ServiceFormProps {
  open: boolean;
  service: Service | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  code: string;
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
  displayOrder: number;
}

export function ServiceForm({
  open,
  service,
  onClose,
  onSuccess,
}: ServiceFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    code: "",
    name: "",
    description: "",
    category: "",
    durationMinutes: 30,
    bufferMinutes: 10,
    isActive: true,
    displayOrder: 0,
  });

  useEffect(() => {
    if (service) {
      setFormData({
        code: service.code,
        name: service.name,
        description: service.description || "",
        category: service.category || "",
        durationMinutes: service.durationMinutes,
        bufferMinutes: service.bufferMinutes,
        isActive: service.isActive,
        displayOrder: service.displayOrder,
      });
    } else {
      setFormData({
        code: "",
        name: "",
        description: "",
        category: "",
        durationMinutes: 30,
        bufferMinutes: 10,
        isActive: true,
        displayOrder: 0,
      });
    }
  }, [service, open]);

  const calculateCascadeEffect = () => {
    if (!service || !service.service_reservation_limits?.dailyLimitMinutes) {
      return null;
    }

    const limit = service.service_reservation_limits.dailyLimitMinutes;
    const oldMaxBookings = Math.floor(limit / service.durationMinutes);
    const newMaxBookings = Math.floor(limit / formData.durationMinutes);

    if (oldMaxBookings === newMaxBookings) {
      return null;
    }

    return {
      before: oldMaxBookings,
      after: newMaxBookings,
      increase: newMaxBookings > oldMaxBookings,
    };
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}분`;
    if (mins === 0) return `${hours}시간`;
    return `${hours}시간 ${mins}분`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "오류",
          description: "로그인이 필요합니다",
          variant: "destructive",
        });
        return;
      }

      const url = service
        ? `/api/admin/services/${service.id}`
        : "/api/admin/services";
      const method = service ? "PATCH" : "POST";

      // For update, only send changed fields
      const body = service
        ? {
            name: formData.name !== service.name ? formData.name : undefined,
            description:
              formData.description !== service.description
                ? formData.description
                : undefined,
            category:
              formData.category !== service.category
                ? formData.category
                : undefined,
            durationMinutes:
              formData.durationMinutes !== service.durationMinutes
                ? formData.durationMinutes
                : undefined,
            bufferMinutes:
              formData.bufferMinutes !== service.bufferMinutes
                ? formData.bufferMinutes
                : undefined,
            isActive:
              formData.isActive !== service.isActive
                ? formData.isActive
                : undefined,
            displayOrder:
              formData.displayOrder !== service.displayOrder
                ? formData.displayOrder
                : undefined,
          }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || "저장에 실패했습니다");
      }

      const result: ServiceMutationResponse = await response.json();

      toast({
        title: "성공",
        description:
          result.message ||
          (service
            ? "시술이 수정되었습니다"
            : "시술이 생성되었습니다"),
      });

      // Show cascade effect notification if present
      if (result.cascadeEffects?.maxBookingsChanged) {
        const { before, after } = result.cascadeEffects.maxBookingsChanged;
        toast({
          title: "예약 한도 변경 영향",
          description: `최대 예약 건수가 ${before}건에서 ${after}건으로 변경되었습니다`,
        });
      }

      onSuccess();
    } catch (err) {
      toast({
        title: "오류",
        description: err instanceof Error ? err.message : "저장 실패",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const cascadeEffect = calculateCascadeEffect();
  const totalMinutes = formData.durationMinutes + formData.bufferMinutes;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {service ? "시술 수정" : "새 시술 추가"}
            </DialogTitle>
            <DialogDescription>
              {service
                ? "시술 정보를 수정합니다"
                : "새로운 시술 항목을 등록합니다"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">
                시술 코드 * <span className="text-xs text-gray-500">(대문자, 언더스코어만 사용)</span>
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                placeholder="LASER_TREATMENT"
                pattern="[A-Z_]+"
                maxLength={50}
                required
                disabled={!!service}
                className={service ? "bg-gray-100" : ""}
              />
              {service && (
                <p className="text-xs text-gray-500">
                  시술 코드는 수정할 수 없습니다
                </p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">시술명 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="레이저 치료"
                maxLength={100}
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="피부과"
                maxLength={50}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="시술에 대한 설명을 입력하세요"
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">시술 시간 (분) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min={10}
                  max={480}
                  step={10}
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      durationMinutes: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
                <p className="text-xs text-gray-500">
                  {formatMinutes(formData.durationMinutes)} (10-480분)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="buffer">준비 시간 (분)</Label>
                <Input
                  id="buffer"
                  type="number"
                  min={0}
                  max={60}
                  step={5}
                  value={formData.bufferMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bufferMinutes: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-gray-500">
                  {formData.bufferMinutes}분 (0-60분)
                </p>
              </div>
            </div>

            {/* Total Time Display */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">총 소요 시간:</span>{" "}
                {formatMinutes(totalMinutes)}
                <span className="text-xs text-gray-600 ml-2">
                  (시술 {formatMinutes(formData.durationMinutes)} + 준비{" "}
                  {formData.bufferMinutes}분)
                </span>
              </AlertDescription>
            </Alert>

            {/* Cascade Effect Preview */}
            {cascadeEffect && (
              <Alert
                variant={cascadeEffect.increase ? "default" : "destructive"}
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">예약 한도 변경 예상</div>
                  <div className="text-sm">
                    현재: 하루 최대 {cascadeEffect.before}건 예약 가능
                    <br />
                    변경 후: 하루 최대 {cascadeEffect.after}건 예약 가능
                    <br />
                    <span
                      className={
                        cascadeEffect.increase
                          ? "text-green-600 font-medium"
                          : "text-red-600 font-medium"
                      }
                    >
                      {cascadeEffect.increase ? "▲" : "▼"}{" "}
                      {Math.abs(cascadeEffect.after - cascadeEffect.before)}건{" "}
                      {cascadeEffect.increase ? "증가" : "감소"}
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Display Order */}
            <div className="space-y-2">
              <Label htmlFor="displayOrder">표시 순서</Label>
              <Input
                id="displayOrder"
                type="number"
                min={0}
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    displayOrder: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-gray-500">
                숫자가 작을수록 먼저 표시됩니다
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="active" className="cursor-pointer">
                시술 활성화
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "저장 중..." : service ? "수정" : "생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
