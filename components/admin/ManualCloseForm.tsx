"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, AlertCircle, XCircle, CheckCircle } from "lucide-react";
import ServiceSelector from "@/components/admin/ServiceSelector";

interface ManualClosure {
  id: string;
  closureDate: string;
  period: "MORNING" | "AFTERNOON";
  timeSlotStart: string;
  timeSlotEnd?: string;
  serviceId?: string;
  reason?: string;
  createdBy: string;
  isActive: boolean;
  service?: {
    id: string;
    code: string;
    name: string;
  };
}

interface ManualCloseFormProps {
  /**
   * Date to manage closures for (YYYY-MM-DD format)
   */
  date: string;

  /**
   * Optional service filter
   */
  serviceCode?: string;

  /**
   * Callback when closures are updated
   */
  onUpdate?: () => void;

  /**
   * Custom className
   */
  className?: string;
}

const ManualCloseForm = ({
  date,
  serviceCode,
  onUpdate,
  className = ""
}: ManualCloseFormProps) => {
  const [closures, setClosures] = useState<ManualClosure[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [selectedPeriod, setSelectedPeriod] = useState<"MORNING" | "AFTERNOON">("MORNING");
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string>(serviceCode || "");
  const [reason, setReason] = useState<string>("");

  // Time slot options
  const morningSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"
  ];
  const afternoonSlots = [
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
  ];

  const timeSlots = selectedPeriod === "MORNING" ? morningSlots : afternoonSlots;

  // Fetch existing closures
  useEffect(() => {
    fetchClosures();
  }, [date, serviceCode]);

  const fetchClosures = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("accessToken");
      const params = new URLSearchParams({ date });
      if (serviceCode) {
        params.append("serviceCode", serviceCode);
      }

      const response = await fetch(`/api/admin/manual-close?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("마감 정보를 불러오지 못했습니다");
      }

      const data = await response.json();
      if (data.success) {
        setClosures(data.closures || []);
      } else {
        throw new Error(data.error || "마감 정보를 불러오지 못했습니다");
      }
    } catch (err) {
      console.error("Error fetching closures:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClosures = async () => {
    if (selectedTimeSlots.length === 0) {
      setError("마감할 시간대를 선택해주세요");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("accessToken");

      const response = await fetch("/api/admin/manual-close", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          closureDate: date,
          period: selectedPeriod,
          timeSlots: selectedTimeSlots,
          serviceCode: selectedService || null,
          reason: reason || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "마감 처리에 실패했습니다");
      }

      const data = await response.json();
      setSuccess(`${data.count}개 시간대가 마감되었습니다`);

      // Reset form
      setSelectedTimeSlots([]);
      setReason("");

      // Refresh closures
      await fetchClosures();

      // Notify parent
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error("Error creating closures:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClosure = async (closureId: string) => {
    if (!confirm("정말로 마감을 해제하시겠습니까?")) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("accessToken");

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

      setSuccess("마감이 해제되었습니다");

      // Refresh closures
      await fetchClosures();

      // Notify parent
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error("Error deleting closure:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTimeSlot = (time: string) => {
    setSelectedTimeSlots((prev) =>
      prev.includes(time)
        ? prev.filter((t) => t !== time)
        : [...prev, time]
    );
  };

  const isTimeSlotClosed = (time: string, period: string) => {
    return closures.some(
      (c) =>
        c.timeSlotStart === time &&
        c.period === period &&
        (!selectedService || c.serviceId === selectedService || c.serviceId === null)
    );
  };

  return (
    <div className={className}>
      {/* Create New Closure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            수동 시간 마감
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>날짜</Label>
            <Input value={date} disabled />
          </div>

          <div className="space-y-2">
            <Label>시간대</Label>
            <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as "MORNING" | "AFTERNOON")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MORNING">오전</SelectItem>
                <SelectItem value="AFTERNOON">오후</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>마감할 시간 (복수 선택 가능)</Label>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((time) => {
                const isClosed = isTimeSlotClosed(time, selectedPeriod);
                const isSelected = selectedTimeSlots.includes(time);

                return (
                  <Button
                    key={time}
                    type="button"
                    variant={isSelected ? "default" : isClosed ? "destructive" : "outline"}
                    onClick={() => !isClosed && toggleTimeSlot(time)}
                    disabled={isClosed || submitting}
                    className="justify-start"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {time}
                    {isClosed && " (마감됨)"}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>대상 서비스 (선택사항)</Label>
            <ServiceSelector
              value={selectedService}
              onChange={setSelectedService}
              disabled={submitting}
            />
            <p className="text-sm text-muted-foreground">
              비어두면 모든 서비스에 적용됩니다
            </p>
          </div>

          <div className="space-y-2">
            <Label>마감 사유 (선택사항)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 임시 휴진, 긴급 수술 등"
              disabled={submitting}
              rows={2}
            />
          </div>

          <Button
            onClick={handleCreateClosures}
            disabled={submitting || selectedTimeSlots.length === 0}
            className="w-full"
          >
            {submitting ? "처리 중..." : `${selectedTimeSlots.length}개 시간대 마감하기`}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Closures */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>현재 마감된 시간대</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">로딩 중...</p>
          ) : closures.length === 0 ? (
            <p className="text-muted-foreground">마감된 시간대가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {closures.map((closure) => (
                <div
                  key={closure.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={closure.period === "MORNING" ? "default" : "secondary"}>
                        {closure.period === "MORNING" ? "오전" : "오후"}
                      </Badge>
                      <span className="font-medium">{closure.timeSlotStart}</span>
                      {closure.service && (
                        <Badge variant="outline">{closure.service.name}</Badge>
                      )}
                      {!closure.service && (
                        <Badge variant="outline">전체 서비스</Badge>
                      )}
                    </div>
                    {closure.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        사유: {closure.reason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      등록: {closure.createdBy}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClosure(closure.id)}
                    disabled={submitting}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualCloseForm;
