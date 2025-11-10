"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Service, ServiceDeleteResponse } from "@/app/api/admin/services/types";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Info, Trash2, Archive } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  service: Service;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  open,
  service,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState<"soft" | "hard">("soft");

  const hasReservations = (service._count?.reservations || 0) > 0;
  const hasTimeSlots = (service._count?.clinic_time_slots || 0) > 0;
  const hasLimits = !!service.service_reservation_limits;
  const canHardDelete = !hasReservations && !hasLimits;

  const handleDelete = async () => {
    setDeleting(true);

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

      const url =
        deleteType === "hard"
          ? `/api/admin/services/${service.id}?hard=true`
          : `/api/admin/services/${service.id}`;

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error: ServiceDeleteResponse = await response.json();
        throw new Error(
          error.error ||
            error.reasons?.join(", ") ||
            "삭제에 실패했습니다"
        );
      }

      const result: ServiceDeleteResponse = await response.json();

      toast({
        title: "성공",
        description:
          result.message ||
          (deleteType === "hard"
            ? "시술이 완전히 삭제되었습니다"
            : "시술이 비활성화되었습니다"),
      });

      onConfirm();
    } catch (err) {
      toast({
        title: "오류",
        description: err instanceof Error ? err.message : "삭제 실패",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            시술 삭제 확인
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{service.name}</span> 시술을
            삭제하시겠습니까?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning if has dependencies */}
          {(hasReservations || hasTimeSlots || hasLimits) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">의존 관계 확인</div>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  {hasReservations && (
                    <li>예약 {service._count?.reservations}건이 존재합니다</li>
                  )}
                  {hasTimeSlots && (
                    <li>
                      진료 시간 슬롯 {service._count?.clinic_time_slots}개가
                      존재합니다
                    </li>
                  )}
                  {hasLimits && <li>서비스 한도 설정이 존재합니다</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Delete options */}
          <RadioGroup value={deleteType} onValueChange={(v) => setDeleteType(v as "soft" | "hard")}>
            <div className="space-y-3">
              {/* Soft delete option */}
              <div className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-gray-50">
                <RadioGroupItem value="soft" id="soft" className="mt-1" />
                <div className="flex-1">
                  <Label
                    htmlFor="soft"
                    className="flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Archive className="h-4 w-4 text-blue-600" />
                    비활성화 (권장)
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    시술을 숨기지만 데이터는 보존됩니다. 기존 예약 기록은
                    유지되며 언제든지 다시 활성화할 수 있습니다.
                  </p>
                </div>
              </div>

              {/* Hard delete option */}
              <div
                className={`flex items-start space-x-3 border rounded-lg p-4 ${
                  canHardDelete
                    ? "hover:bg-gray-50"
                    : "opacity-50 cursor-not-allowed bg-gray-100"
                }`}
              >
                <RadioGroupItem
                  value="hard"
                  id="hard"
                  disabled={!canHardDelete}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="hard"
                    className={`flex items-center gap-2 font-medium ${
                      canHardDelete ? "cursor-pointer" : "cursor-not-allowed"
                    }`}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                    완전 삭제
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    시술 데이터를 완전히 제거합니다. 이 작업은 되돌릴 수
                    없습니다.
                  </p>
                  {!canHardDelete && (
                    <p className="text-sm text-red-600 mt-2 font-medium">
                      예약 기록이나 한도 설정이 있어 완전 삭제할 수 없습니다
                    </p>
                  )}
                </div>
              </div>
            </div>
          </RadioGroup>

          {/* Info about soft delete */}
          {deleteType === "soft" && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                비활성화된 시술은:
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>새로운 예약에서 선택할 수 없게 됩니다</li>
                  <li>기존 예약 기록은 모두 유지됩니다</li>
                  <li>관리자 페이지에서 다시 활성화할 수 있습니다</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Warning for hard delete */}
          {deleteType === "hard" && canHardDelete && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">
                ⚠️ 경고: 이 작업은 되돌릴 수 없습니다!
                <br />
                시술 데이터가 영구적으로 삭제됩니다.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || (deleteType === "hard" && !canHardDelete)}
          >
            {deleting
              ? "처리 중..."
              : deleteType === "hard"
              ? "완전 삭제"
              : "비활성화"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
