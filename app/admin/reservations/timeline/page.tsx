"use client";

import { useState, useEffect } from "react";
import TabNavigation from "@/components/admin/TabNavigation";
import DateNavigation from "@/components/admin/DateNavigation";
import TimeSlotGrid from "@/components/admin/TimeSlotGrid";
import ReservationTimeline from "@/components/admin/ReservationTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, List, Loader2 } from "lucide-react";

interface Service {
  id: string;
  code: string;
  name: string;
  durationMinutes: number;
  bufferMinutes: number;
}

export default function TimelinePage() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch services from API
  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await fetch('/api/public/services');
        const data = await response.json();

        if (data.success && data.services) {
          setServices(data.services);
          // Set first service as default
          if (data.services.length > 0 && !selectedService) {
            setSelectedService(data.services[0].code);
          }
        }
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">예약 관리 - 타임라인</h1>
        <p className="text-gray-600 mt-1">시간대별 예약 현황을 확인하고 관리합니다</p>
      </div>

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Date and Service Selection */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <DateNavigation date={date} onChange={setDate} />

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">시술 종류:</span>
          <Select value={selectedService} onValueChange={setSelectedService} disabled={loading}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={loading ? "로딩 중..." : "시술 선택"} />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.code} value={service.code}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content: 2-Column Layout */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">서비스 정보를 불러오는 중...</span>
        </div>
      ) : selectedService ? (
        <div className="grid grid-cols-5 gap-6">
          {/* Left Column: Time Slot Grid (2/5 width) */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                예약 가능 시간대
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimeSlotGrid
                date={date}
                service={selectedService}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
              />
            </CardContent>
          </Card>

          {/* Right Column: Timeline View (3/5 width) */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                예약 타임라인
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReservationTimeline
                date={date}
                service={selectedService}
                autoRefresh={true}
                refreshInterval={30}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          시술 종류를 선택해주세요
        </div>
      )}
    </div>
  );
}
