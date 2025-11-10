"use client";

import { useState, useEffect, useCallback } from "react";
import ReservationCard from "./ReservationCard";
import ClosureIndicator from "./ClosureIndicator";
import SlotContextMenu from "./SlotContextMenu";
import QuickCloseDialog from "./QuickCloseDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, RefreshCw, Calendar } from "lucide-react";
import { Toaster, toast } from "sonner";
import { useConflictCheck } from "@/hooks/useConflictCheck";

interface Reservation {
  id: string;
  patient_name: string;
  patient_phone: string;
  patient_email?: string | null;
  reservation_date: string;
  reservation_time: string;
  department: string;
  purpose: string;
  status: string;
  notes?: string | null;
  admin_notes?: string | null;
  period?: string | null;
  timeSlotStart?: string | null;
  timeSlotEnd?: string | null;
  serviceName?: string | null;
  estimatedDuration?: number | null;
}

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

interface ReservationTimelineProps {
  date: string; // YYYY-MM-DD
  service?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
  onReservationClick?: (reservation: Reservation) => void;
}

export default function ReservationTimeline({
  date,
  service,
  autoRefresh = true,
  refreshInterval = 30,
  onReservationClick
}: ReservationTimelineProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [closures, setClosures] = useState<ManualClosure[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClosures, setLoadingClosures] = useState(false);
  const [removingClosureId, setRemovingClosureId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Phase 2: Quick Close states
  const [quickCloseDialogOpen, setQuickCloseDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [isQuickClosing, setIsQuickClosing] = useState(false);
  const { checkConflict } = useConflictCheck();

  // Fetch reservations
  const fetchReservations = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        date,
        limit: '100'
      });

      if (service && service !== 'ALL') {
        params.append('department', service);
      }

      const response = await fetch(`/api/reservations?${params.toString()}`);

      if (!response.ok) {
        throw new Error('예약 정보를 불러오지 못했습니다');
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Sort by time
        const sorted = [...data.data].sort((a, b) => {
          const timeA = a.timeSlotStart || a.reservation_time;
          const timeB = b.timeSlotStart || b.reservation_time;
          return timeA.localeCompare(timeB);
        });

        return sorted;
      } else {
        throw new Error(data.error || '예약 정보를 불러오지 못했습니다');
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
      throw err;
    }
  }, [date, service]);

  // Fetch closures
  const fetchClosures = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.warn("No access token found, skipping closures fetch");
        return [];
      }

      const params = new URLSearchParams({ date });
      if (service && service !== 'ALL') {
        params.append('serviceId', service);
      }

      const response = await fetch(`/api/admin/manual-close?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn("Unauthorized, skipping closures fetch");
          return [];
        }
        throw new Error('마감 정보를 불러오지 못했습니다');
      }

      const data = await response.json();
      if (data.success) {
        return data.closures || [];
      } else {
        throw new Error(data.error || '마감 정보를 불러오지 못했습니다');
      }
    } catch (err) {
      console.error('Error fetching closures:', err);
      // Don't throw - closures are optional
      return [];
    }
  }, [date, service]);

  // Fetch all data in parallel
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Parallel fetch
      const [reservationsData, closuresData] = await Promise.all([
        fetchReservations(),
        fetchClosures(),
      ]);

      setReservations(reservationsData);
      setClosures(closuresData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      setReservations([]);
      setClosures([]);
    } finally {
      setLoading(false);
    }
  }, [fetchReservations, fetchClosures]);

  // Handle status change
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('상태 변경에 실패했습니다');
      }

      setStatusMessage({
        type: 'success',
        message: `예약 상태가 ${newStatus === 'CONFIRMED' ? '확정' : '취소'}되었습니다.`
      });

      // Clear message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);

      // Refresh all data
      await fetchAllData();
    } catch (err) {
      console.error('Error changing status:', err);
      setStatusMessage({
        type: 'error',
        message: err instanceof Error ? err.message : '상태 변경에 실패했습니다'
      });

      // Clear message after 5 seconds
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Handle closure removal
  const handleRemoveClosure = async (closureId: string) => {
    setRemovingClosureId(closureId);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("인증 토큰이 없습니다");
      }

      const response = await fetch(`/api/admin/manual-close?id=${closureId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "마감 해제에 실패했습니다");
      }

      // Optimistic UI update
      setClosures((prev) => prev.filter((c) => c.id !== closureId));

      setStatusMessage({
        type: "success",
        message: "마감이 해제되었습니다. 예약이 가능합니다.",
      });

      // Clear message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);

      // Refresh data to confirm
      await fetchAllData();
    } catch (err) {
      console.error("Error removing closure:", err);
      setStatusMessage({
        type: "error",
        message: err instanceof Error ? err.message : "마감 해제에 실패했습니다",
      });

      // Clear message after 5 seconds
      setTimeout(() => setStatusMessage(null), 5000);

      // Revert optimistic update on error
      await fetchClosures().then((data) => setClosures(data));
    } finally {
      setRemovingClosureId(null);
    }
  };

  // Phase 2: Handle quick close
  const handleQuickClose = async (data: QuickCloseData) => {
    if (!selectedSlot) return;

    setIsQuickClosing(true);

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
          closureDate: selectedSlot.date,
          period: selectedSlot.period,
          timeSlotStart: selectedSlot.timeSlotStart,
          timeSlotEnd: selectedSlot.timeSlotEnd,
          serviceId: selectedSlot.serviceId,
          reason: data.reason || "빠른 마감",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "마감 생성에 실패했습니다");
      }

      // Success
      toast.success("시간대가 즉시 마감되었습니다");

      // Close dialog
      setQuickCloseDialogOpen(false);
      setSelectedSlot(null);

      // Refresh timeline
      await fetchAllData();
    } catch (err) {
      console.error("Error creating quick closure:", err);
      toast.error(err instanceof Error ? err.message : "마감 생성에 실패했습니다");
    } finally {
      setIsQuickClosing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAllData();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAllData]);

  // Group reservations by period
  const groupedReservations = {
    MORNING: reservations.filter(r => r.period === 'MORNING' || (!r.period && parseInt(r.reservation_time.split(':')[0]) < 12)),
    AFTERNOON: reservations.filter(r => r.period === 'AFTERNOON' || (!r.period && parseInt(r.reservation_time.split(':')[0]) >= 12)),
    EVENING: reservations.filter(r => r.period === 'EVENING')
  };

  // Get period label
  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'MORNING': return '오전';
      case 'AFTERNOON': return '오후';
      case 'EVENING': return '저녁';
      default: return period;
    }
  };

  // Format last updated time
  const formatLastUpdated = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Render period section
  const renderPeriodSection = (period: 'MORNING' | 'AFTERNOON' | 'EVENING') => {
    const periodReservations = groupedReservations[period];
    const periodClosures = closures.filter(c => c.period === period);

    // Skip if no data
    if (periodReservations.length === 0 && periodClosures.length === 0) return null;

    const pendingCount = periodReservations.filter(r => r.status === 'PENDING').length;
    const confirmedCount = periodReservations.filter(r => r.status === 'CONFIRMED').length;
    const closuresCount = periodClosures.length;

    return (
      <div key={period} className="mb-6">
        <div className="flex items-center gap-3 mb-3 pb-2 border-b">
          <Badge variant="outline" className="text-sm">
            {getPeriodLabel(period)}
          </Badge>
          <span className="text-sm text-muted-foreground">
            총 {periodReservations.length}건
          </span>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              대기 {pendingCount}
            </Badge>
          )}
          {confirmedCount > 0 && (
            <Badge variant="default" className="text-xs bg-green-600">
              확정 {confirmedCount}
            </Badge>
          )}
          {closuresCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              마감 {closuresCount}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {/* Closures */}
          {periodClosures.length > 0 && (
            <div className="space-y-2">
              {periodClosures.map((closure) => (
                <ClosureIndicator
                  key={closure.id}
                  closure={closure}
                  onRemove={handleRemoveClosure}
                  isRemoving={removingClosureId === closure.id}
                  size="md"
                  showRemoveButton={true}
                />
              ))}
            </div>
          )}

          {/* Reservations */}
          {periodReservations.map((reservation) => (
            <SlotContextMenu
              key={reservation.id}
              slotInfo={{
                date: reservation.reservation_date,
                period: (reservation.period || period) as "MORNING" | "AFTERNOON" | "EVENING",
                timeSlotStart: reservation.timeSlotStart || reservation.reservation_time,
                timeSlotEnd: reservation.timeSlotEnd,
                serviceId: reservation.department,
                serviceName: reservation.serviceName,
              }}
              onQuickClose={(slotInfo) => {
                setSelectedSlot(slotInfo);
                setQuickCloseDialogOpen(true);
              }}
            >
              <ReservationCard
                reservation={reservation}
                onStatusChange={handleStatusChange}
                onView={onReservationClick}
              />
            </SlotContextMenu>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Toaster for notifications */}
      <Toaster />

      {/* Quick Close Dialog */}
      {selectedSlot && (
        <QuickCloseDialog
          open={quickCloseDialogOpen}
          onOpenChange={setQuickCloseDialogOpen}
          slotInfo={selectedSlot}
          onConfirm={handleQuickClose}
          onCheckConflict={checkConflict}
          isLoading={isQuickClosing}
        />
      )}

      <div className="space-y-4">
        {/* Status Message */}
        {statusMessage && (
          <Alert variant={statusMessage.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{statusMessage.message}</AlertDescription>
          </Alert>
        )}

      {/* Header with last updated and refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{date}</span>
          {lastUpdated && (
            <>
              <span>•</span>
              <Clock className="h-4 w-4" />
              <span>마지막 업데이트: {formatLastUpdated(lastUpdated)}</span>
            </>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchReservations}
          disabled={loading}
          className="h-8"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* Loading state */}
      {loading && reservations.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            <span>예약 정보를 불러오는 중...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty state */}
      {!loading && !error && reservations.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            선택한 날짜에 예약이 없습니다.
          </AlertDescription>
        </Alert>
      )}

      {/* Timeline */}
      {!loading && !error && reservations.length > 0 && (
        <div>
          {renderPeriodSection('MORNING')}
          {renderPeriodSection('AFTERNOON')}
          {renderPeriodSection('EVENING')}
        </div>
      )}
      </div>
    </>
  );
}
