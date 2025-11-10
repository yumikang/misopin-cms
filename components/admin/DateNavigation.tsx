"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface DateNavigationProps {
  date: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

export default function DateNavigation({ date, onChange }: DateNavigationProps) {
  // Get previous day
  const getPrevDay = (dateStr: string): string => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  // Get next day
  const getNextDay = (dateStr: string): string => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  // Get today
  const getToday = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  // Format date for display (YYYY년 MM월 DD일)
  const formatDateDisplay = (dateStr: string): string => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];

    return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(getPrevDay(date))}
        className="h-9"
      >
        <ChevronLeft className="h-4 w-4" />
        이전
      </Button>

      <div className="flex items-center gap-2 min-w-[280px]">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Input
          type="date"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          className="h-9"
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatDateDisplay(date)}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(getNextDay(date))}
        className="h-9"
      >
        다음
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(getToday())}
        className="h-9"
      >
        오늘
      </Button>
    </div>
  );
}
