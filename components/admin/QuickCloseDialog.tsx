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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Zap,
  Calendar,
  Clock,
  Building2,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface SlotInfo {
  date: string;
  period: "MORNING" | "AFTERNOON" | "EVENING";
  timeSlotStart: string;
  timeSlotEnd?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
}

interface QuickCloseData {
  reason?: string;
}

interface ConflictInfo {
  hasConflict: boolean;
  conflictCount: number;
  conflicts: Array<{
    id: string;
    patient_name: string;
    reservation_time: string;
    status: string;
  }>;
  recommendation: string;
}

interface QuickCloseDialogProps {
  /**
   * Dialog 열림/닫힘 상태
   */
  open: boolean;

  /**
   * Dialog 상태 변경 핸들러
   */
  onOpenChange: (open: boolean) => void;

  /**
   * 선택된 시간대 정보
   */
  slotInfo: SlotInfo;

  /**
   * 마감 확인 핸들러
   */
  onConfirm: (data: QuickCloseData) => Promise<void>;

  /**
   * 로딩 상태
   */
  isLoading?: boolean;

  /**
   * 충돌 확인 함수 (선택 사항)
   */
  onCheckConflict?: (slotInfo: SlotInfo) => Promise<ConflictInfo>;
}

const QuickCloseDialog = ({
  open,
  onOpenChange,
  slotInfo,
  onConfirm,
  isLoading = false,
  onCheckConflict,
}: QuickCloseDialogProps) => {
  const [reason, setReason] = useState("");
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // 기간 라벨 변환
  const getPeriodLabel = (period: string): string => {
    switch (period) {
      case "MORNING":
        return "오전";
      case "AFTERNOON":
        return "오후";
      case "EVENING":
        return "저녁";
      default:
        return period;
    }
  };

  // 날짜 포맷
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const weekday = weekdays[date.getDay()];
    return `${year}년 ${month}월 ${day}일 (${weekday})`;
  };

  // 충돌 확인
  useEffect(() => {
    if (!open || !onCheckConflict) {
      setConflictInfo(null);
      setConflictError(null);
      return;
    }

    const checkConflict = async () => {
      setCheckingConflict(true);
      setConflictError(null);

      try {
        const result = await onCheckConflict(slotInfo);
        setConflictInfo(result);
      } catch (err) {
        console.error("Error checking conflict:", err);
        setConflictError("충돌 확인에 실패했습니다");
      } finally {
        setCheckingConflict(false);
      }
    };

    checkConflict();
  }, [open, slotInfo, onCheckConflict]);

  // Dialog 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      setReason("");
      setConflictInfo(null);
      setConflictError(null);
    }
  }, [open]);

  // 확인 핸들러
  const handleConfirm = async () => {
    await onConfirm({ reason: reason.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            빠른 시간 마감
          </DialogTitle>
          <DialogDescription>
            선택한 시간대를 즉시 마감합니다. 신규 예약이 차단됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 마감 정보 표시 */}
          <div className="space-y-2 rounded-lg border border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-600" />
              <span className="font-medium">날짜:</span>
              <span>{formatDate(slotInfo.date)}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-600" />
              <span className="font-medium">시간:</span>
              <span>
                {getPeriodLabel(slotInfo.period)} {slotInfo.timeSlotStart}
                {slotInfo.timeSlotEnd && ` - ${slotInfo.timeSlotEnd}`}
              </span>
            </div>

            {slotInfo.serviceName && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-gray-600" />
                <span className="font-medium">서비스:</span>
                <span>{slotInfo.serviceName}</span>
              </div>
            )}
          </div>

          {/* 충돌 확인 결과 */}
          {onCheckConflict && (
            <div>
              {checkingConflict && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>충돌 확인 중...</AlertDescription>
                </Alert>
              )}

              {conflictError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{conflictError}</AlertDescription>
                </Alert>
              )}

              {conflictInfo && !checkingConflict && (
                <>
                  {conflictInfo.hasConflict ? (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <div className="font-medium mb-1">
                          ⚠️ 예약 {conflictInfo.conflictCount}건 있음
                        </div>
                        <div className="text-sm">
                          {conflictInfo.recommendation ||
                            "마감 시 신규 예약만 차단되며, 기존 예약은 유지됩니다."}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <div className="font-medium">
                          ✅ 예약 없음 - 즉시 마감 가능
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
          )}

          {/* 사유 입력 (선택 사항) */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              사유 <span className="text-gray-400">(선택 사항)</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="예: 직원 부재, 장비 점검 등"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={isLoading}
              maxLength={200}
            />
            <div className="text-xs text-gray-500 text-right">
              {reason.length} / 200
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || checkingConflict}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                마감 처리 중...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                즉시 마감
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickCloseDialog;
