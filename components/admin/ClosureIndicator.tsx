"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { XCircle, Unlock, Clock, User } from "lucide-react";

interface ManualClosure {
  id: string;
  closureDate: string;
  period: "MORNING" | "AFTERNOON" | "EVENING";
  timeSlotStart: string;
  timeSlotEnd?: string | null;
  serviceId?: string | null;
  reason?: string | null;
  createdBy: string;
  isActive: boolean;
  service?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface ClosureIndicatorProps {
  /**
   * 마감 정보
   */
  closure: ManualClosure;

  /**
   * 해제 버튼 클릭 핸들러
   */
  onRemove?: (closureId: string) => Promise<void>;

  /**
   * 크기 (작은 것부터 큰 것까지)
   */
  size?: "sm" | "md" | "lg";

  /**
   * 해제 버튼 표시 여부
   */
  showRemoveButton?: boolean;

  /**
   * 로딩 상태 (해제 중)
   */
  isRemoving?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

const ClosureIndicator = ({
  closure,
  onRemove,
  size = "md",
  showRemoveButton = true,
  isRemoving = false,
  className = "",
}: ClosureIndicatorProps) => {
  // Size 스타일
  const sizeStyles = {
    sm: {
      container: "px-2 py-1 text-xs",
      icon: "h-3 w-3",
      badge: "text-[10px]",
      button: "h-5 w-5 p-0",
    },
    md: {
      container: "px-3 py-1.5 text-sm",
      icon: "h-4 w-4",
      badge: "text-xs",
      button: "h-6 w-6 p-0",
    },
    lg: {
      container: "px-4 py-2 text-base",
      icon: "h-5 w-5",
      badge: "text-sm",
      button: "h-7 w-7 p-0",
    },
  };

  const styles = sizeStyles[size];

  // Period 라벨
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

  // 해제 핸들러
  const handleRemove = async () => {
    if (!onRemove) return;

    if (
      !confirm(
        `${closure.timeSlotStart} 시간대 마감을 해제하시겠습니까?\n\n마감 해제 후 즉시 예약이 가능해집니다.`
      )
    ) {
      return;
    }

    try {
      await onRemove(closure.id);
    } catch (error) {
      console.error("Failed to remove closure:", error);
      alert("마감 해제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // Tooltip 내용
  const tooltipContent = (
    <div className="space-y-1.5 max-w-xs">
      <div className="flex items-center gap-1.5 font-semibold">
        <XCircle className="h-3.5 w-3.5" />
        <span>마감된 시간대</span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 opacity-70" />
          <span>
            {getPeriodLabel(closure.period)} {closure.timeSlotStart}
            {closure.timeSlotEnd && ` - ${closure.timeSlotEnd}`}
          </span>
        </div>

        {closure.service ? (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              {closure.service.name}
            </Badge>
            <span className="opacity-70">전용 마감</span>
          </div>
        ) : (
          <div className="opacity-70">전체 서비스 마감</div>
        )}

        {closure.reason && (
          <div className="pt-1 border-t border-white/20">
            <div className="font-medium opacity-90">사유:</div>
            <div className="opacity-80">{closure.reason}</div>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-1 border-t border-white/20 opacity-70">
          <User className="h-3 w-3" />
          <span>{closure.createdBy}</span>
        </div>
      </div>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`
            inline-flex items-center gap-2
            bg-red-50 border border-red-200 rounded-md
            hover:bg-red-100 transition-colors
            ${styles.container}
            ${className}
          `}
        >
          {/* 마감 아이콘 */}
          <XCircle className={`text-red-600 ${styles.icon}`} />

          {/* 시간 표시 */}
          <div className="flex items-center gap-1.5 font-medium text-red-900">
            <span>{closure.timeSlotStart}</span>
            {size !== "sm" && <span className="opacity-60">마감</span>}
          </div>

          {/* 서비스 뱃지 (있을 경우) */}
          {size !== "sm" && closure.service && (
            <Badge
              variant="outline"
              className={`border-red-300 text-red-700 ${styles.badge}`}
            >
              {closure.service.name}
            </Badge>
          )}

          {/* 해제 버튼 */}
          {showRemoveButton && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className={`
                text-red-600 hover:text-red-700 hover:bg-red-100
                ${styles.button}
                ${isRemoving ? "opacity-50 cursor-not-allowed" : ""}
              `}
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              disabled={isRemoving}
              title="마감 해제"
            >
              <Unlock className={styles.icon} />
            </Button>
          )}
        </div>
      </TooltipTrigger>

      <TooltipContent side="top" className="bg-gray-900 text-white">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
};

export default ClosureIndicator;
