"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertCircle } from "lucide-react";
import { TimeSlot } from "@/lib/reservations/types";

interface TimeSlotGridProps {
  /**
   * Date to fetch slots for (YYYY-MM-DD format)
   */
  date: string;

  /**
   * Service code (e.g., "WRINKLE_BOTOX")
   */
  service: string;

  /**
   * Currently selected time slot (controlled component)
   */
  selectedSlot?: TimeSlot | null;

  /**
   * Callback when user selects a time slot
   */
  onSelect: (slot: TimeSlot) => void;

  /**
   * Disable all slots (e.g., during form submission)
   */
  disabled?: boolean;

  /**
   * Custom className for styling
   */
  className?: string;
}

const TimeSlotGrid = ({
  date,
  service,
  selectedSlot,
  onSelect,
  disabled = false,
  className = ""
}: TimeSlotGridProps) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch available time slots
  useEffect(() => {
    if (!date || !service) {
      setSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const response = await fetch(
          `/api/public/reservations/time-slots?service=${service}&date=${date}`
        );

        if (!response.ok) {
          throw new Error('시간대 정보를 불러오지 못했습니다');
        }

        const data = await response.json();

        if (data.success) {
          // Empty slots array is valid (e.g., holidays, weekends)
          setSlots(data.slots || []);

          // Show message if no slots available (e.g., "해당 요일은 진료하지 않습니다")
          if (data.message && (!data.slots || data.slots.length === 0)) {
            setMessage(data.message);
          }
        } else {
          throw new Error(data.error || data.message || '시간대 정보를 불러오지 못했습니다');
        }
      } catch (err) {
        console.error('Error fetching time slots:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [date, service]);

  // Group slots by period
  const groupedSlots = useMemo(() => {
    return {
      MORNING: slots.filter(s => s.period === 'MORNING'),
      AFTERNOON: slots.filter(s => s.period === 'AFTERNOON')
    };
  }, [slots]);

  // Get status color class
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
      case 'limited':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200';
      case 'full':
        return 'bg-red-100 text-red-800 border-red-300 cursor-not-allowed';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get period label
  const getPeriodLabel = (period: string): string => {
    switch (period) {
      case 'MORNING':
        return '오전';
      case 'AFTERNOON':
        return '오후';
      default:
        return period;
    }
  };

  // Render period section
  const renderPeriodSlots = (period: 'MORNING' | 'AFTERNOON') => {
    const periodSlots = groupedSlots[period];

    if (periodSlots.length === 0) {
      return null;
    }

    return (
      <div key={period} className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {getPeriodLabel(period)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {periodSlots.filter(s => s.available).length} / {periodSlots.length} 가능
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {periodSlots.map(slot => {
            const isSelected = selectedSlot?.time === slot.time && selectedSlot?.period === slot.period;
            const isDisabled = disabled || !slot.available || slot.status === 'full';

            return (
              <Button
                key={`${slot.period}-${slot.time}`}
                type="button"
                onClick={() => !isDisabled && onSelect(slot)}
                disabled={isDisabled}
                variant={isSelected ? "default" : "outline"}
                className={`
                  h-20 flex flex-col items-center justify-center gap-1
                  ${!isSelected && !isDisabled ? getStatusColor(slot.status) : ''}
                  ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
                  transition-all duration-200
                `}
              >
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className="font-semibold">{slot.time}</span>
                </div>

                <div className="text-xs opacity-80">
                  {slot.currentBookings}/{slot.maxCapacity}
                </div>

                {slot.status === 'limited' && (
                  <div className="text-[10px] font-medium">
                    제한적
                  </div>
                )}

                {slot.status === 'full' && (
                  <div className="text-[10px] font-medium">
                    마감
                  </div>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 animate-spin" />
          <span>시간대를 불러오는 중...</span>
        </div>

        {/* Loading skeleton */}
        <div className="space-y-4">
          {['오전', '오후'].map((period) => (
            <div key={period} className="space-y-3">
              <Badge variant="outline">{period}</Badge>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-100 rounded-md animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Empty state (e.g., holidays, weekends)
  if (slots.length === 0) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {message || '선택한 날짜는 예약 가능한 시간대가 없습니다.'}
          <br />
          <span className="text-xs text-muted-foreground">
            (주말, 공휴일 또는 휴진일일 수 있습니다)
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  // Render slots
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded" />
          <span>여유</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded" />
          <span>제한적</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
          <span>마감</span>
        </div>
      </div>

      {/* Time slot grids by period */}
      {renderPeriodSlots('MORNING')}
      {renderPeriodSlots('AFTERNOON')}

      {/* Selected slot info */}
      {selectedSlot && (
        <Alert className="border-primary">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>선택한 시간:</strong> {getPeriodLabel(selectedSlot.period)} {selectedSlot.time}
            {' '}(예약: {selectedSlot.currentBookings}/{selectedSlot.maxCapacity})
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default TimeSlotGrid;
