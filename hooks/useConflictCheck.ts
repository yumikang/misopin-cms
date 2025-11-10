import { useState, useCallback } from "react";

interface SlotInfo {
  date: string;
  period: "MORNING" | "AFTERNOON" | "EVENING";
  timeSlotStart: string;
  timeSlotEnd?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
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

interface UseConflictCheckResult {
  checkConflict: (slotInfo: SlotInfo) => Promise<ConflictInfo>;
  isChecking: boolean;
  error: string | null;
}

/**
 * Hook for checking reservation conflicts before closing time slots
 *
 * @returns {UseConflictCheckResult} Conflict check function and state
 *
 * @example
 * ```tsx
 * const { checkConflict, isChecking, error } = useConflictCheck();
 *
 * const conflictInfo = await checkConflict({
 *   date: "2025-11-09",
 *   period: "MORNING",
 *   timeSlotStart: "09:00",
 *   serviceId: "abc123"
 * });
 *
 * if (conflictInfo.hasConflict) {
 *   console.log(`Found ${conflictInfo.conflictCount} conflicts`);
 * }
 * ```
 */
export function useConflictCheck(): UseConflictCheckResult {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConflict = useCallback(async (slotInfo: SlotInfo): Promise<ConflictInfo> => {
    setIsChecking(true);
    setError(null);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("인증 토큰이 없습니다");
      }

      const response = await fetch("/api/admin/manual-close", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "check-conflict",
          closureDate: slotInfo.date,
          period: slotInfo.period,
          timeSlotStart: slotInfo.timeSlotStart,
          serviceId: slotInfo.serviceId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "충돌 확인에 실패했습니다");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "충돌 확인에 실패했습니다");
      }

      return {
        hasConflict: data.hasConflict,
        conflictCount: data.conflictCount,
        conflicts: data.conflicts || [],
        recommendation: data.recommendation || "",
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다";
      setError(errorMessage);
      throw err;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    checkConflict,
    isChecking,
    error,
  };
}
