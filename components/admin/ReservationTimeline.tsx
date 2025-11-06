"use client";

import { useState, useEffect, useCallback } from "react";
import ReservationCard from "./ReservationCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, RefreshCw, Calendar } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Fetch reservations
  const fetchReservations = useCallback(async () => {
    setLoading(true);
    setError(null);

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

        setReservations(sorted);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || '예약 정보를 불러오지 못했습니다');
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [date, service]);

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

      // Refresh reservations
      await fetchReservations();
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

  // Initial fetch
  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchReservations();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchReservations]);

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

    if (periodReservations.length === 0) return null;

    const pendingCount = periodReservations.filter(r => r.status === 'PENDING').length;
    const confirmedCount = periodReservations.filter(r => r.status === 'CONFIRMED').length;

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
        </div>

        <div className="space-y-3">
          {periodReservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onStatusChange={handleStatusChange}
              onView={onReservationClick}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
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
  );
}
