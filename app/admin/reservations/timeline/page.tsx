"use client";

import { useState } from "react";
import TabNavigation from "@/components/admin/TabNavigation";
import DateNavigation from "@/components/admin/DateNavigation";
import TimeSlotGrid from "@/components/admin/TimeSlotGrid";
import ReservationTimeline from "@/components/admin/ReservationTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, List } from "lucide-react";

// Service options
const SERVICES = [
  { code: 'WRINKLE_BOTOX', name: '주름 보톡스' },
  { code: 'VOLUME_LIFTING', name: '볼륨 리프팅' },
  { code: 'SKIN_CARE', name: '피부 관리' },
  { code: 'REMOVAL_PROCEDURE', name: '제거 시술' },
  { code: 'BODY_CARE', name: '바디 케어' },
  { code: 'OTHER_CONSULTATION', name: '기타 상담' }
];

export default function TimelinePage() {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedService, setSelectedService] = useState<string>('WRINKLE_BOTOX');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

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
          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERVICES.map((service) => (
                <SelectItem key={service.code} value={service.code}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content: 2-Column Layout */}
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
    </div>
  );
}
