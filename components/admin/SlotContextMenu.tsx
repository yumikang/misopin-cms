"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Zap, Info, XCircle } from "lucide-react";

interface SlotInfo {
  date: string;
  period: "MORNING" | "AFTERNOON" | "EVENING";
  timeSlotStart: string;
  timeSlotEnd?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
}

interface SlotContextMenuProps {
  /**
   * 우클릭 이벤트를 받을 자식 요소
   */
  children: React.ReactNode;

  /**
   * 선택된 시간대 정보
   */
  slotInfo: SlotInfo;

  /**
   * 빠른 마감 핸들러
   */
  onQuickClose?: (slotInfo: SlotInfo) => void;

  /**
   * 상세 정보 보기 핸들러
   */
  onViewDetails?: (slotInfo: SlotInfo) => void;

  /**
   * 메뉴 비활성화 여부
   */
  disabled?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

const SlotContextMenu = ({
  children,
  slotInfo,
  onQuickClose,
  onViewDetails,
  disabled = false,
  className = "",
}: SlotContextMenuProps) => {
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

  // 빠른 마감 핸들러
  const handleQuickClose = () => {
    if (!onQuickClose || disabled) return;
    onQuickClose(slotInfo);
  };

  // 상세 정보 핸들러
  const handleViewDetails = () => {
    if (!onViewDetails || disabled) return;
    onViewDetails(slotInfo);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={disabled}>
        <div className={className}>{children}</div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-56">
        {/* 시간대 정보 헤더 */}
        <div className="px-2 py-1.5 text-sm font-medium text-gray-700">
          {getPeriodLabel(slotInfo.period)} {slotInfo.timeSlotStart}
          {slotInfo.timeSlotEnd && ` - ${slotInfo.timeSlotEnd}`}
        </div>

        {slotInfo.serviceName && (
          <div className="px-2 pb-1.5 text-xs text-gray-500">
            {slotInfo.serviceName}
          </div>
        )}

        <ContextMenuSeparator />

        {/* 빠른 마감 메뉴 아이템 */}
        {onQuickClose && (
          <ContextMenuItem
            onClick={handleQuickClose}
            disabled={disabled}
            className="cursor-pointer"
          >
            <Zap className="h-4 w-4 text-yellow-600" />
            <span className="font-medium">빠른 마감</span>
            <span className="ml-auto text-xs text-gray-500">10초</span>
          </ContextMenuItem>
        )}

        {/* 상세 정보 메뉴 아이템 */}
        {onViewDetails && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={handleViewDetails}
              disabled={disabled}
              className="cursor-pointer"
            >
              <Info className="h-4 w-4" />
              <span>상세 정보</span>
            </ContextMenuItem>
          </>
        )}

        {/* 비활성화 상태 표시 */}
        {disabled && (
          <>
            <ContextMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-gray-400 flex items-center gap-2">
              <XCircle className="h-3 w-3" />
              <span>이 시간대는 이미 마감되었습니다</span>
            </div>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default SlotContextMenu;
