# Implementation Roadmap - Part 2: Phases 4-6

## Phase 4: Public Reservation APIs

**Duration**: 1 week
**Risk**: MEDIUM (critical user-facing functionality)
**Priority**: Critical (customer booking experience)

### 4.1 Availability Check API

Create `/app/api/public/reservations/availability/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { Period } from '@prisma/client';
import {
  calculateTimeSlotAvailability,
  canBookService,
  getAvailableServices,
  getDailyAvailability
} from '@/lib/reservations/time-based-availability';

/**
 * GET /api/public/reservations/availability
 *
 * Query params:
 * - date: ISO date string (required)
 * - period: "MORNING" | "AFTERNOON" (optional)
 * - serviceId: service ID (optional)
 *
 * Returns:
 * 1. ?date=2025-11-15 → Full day availability (morning + afternoon)
 * 2. ?date=2025-11-15&period=MORNING → Morning time slot details + available services
 * 3. ?date=2025-11-15&period=MORNING&serviceId=xxx → Specific service availability
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');
  const periodStr = searchParams.get('period');
  const serviceId = searchParams.get('serviceId');

  // Validation
  if (!dateStr) {
    return NextResponse.json(
      {
        success: false,
        error: 'Date parameter is required',
        example: '/api/public/reservations/availability?date=2025-11-15'
      },
      { status: 400 }
    );
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return NextResponse.json(
      { success: false, error: 'Invalid date format. Use ISO date (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  // Don't allow past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) {
    return NextResponse.json(
      { success: false, error: 'Cannot check availability for past dates' },
      { status: 400 }
    );
  }

  try {
    // Case 1: Specific service availability check
    if (serviceId && periodStr) {
      const period = periodStr as Period;
      if (!['MORNING', 'AFTERNOON'].includes(period)) {
        return NextResponse.json(
          { success: false, error: 'Period must be MORNING or AFTERNOON' },
          { status: 400 }
        );
      }

      const result = await canBookService(date, period, serviceId);

      return NextResponse.json({
        success: true,
        date: dateStr,
        period,
        service: result
      });
    }

    // Case 2: Time slot availability with all services
    if (periodStr) {
      const period = periodStr as Period;
      if (!['MORNING', 'AFTERNOON'].includes(period)) {
        return NextResponse.json(
          { success: false, error: 'Period must be MORNING or AFTERNOON' },
          { status: 400 }
        );
      }

      const [availability, availableServices] = await Promise.all([
        calculateTimeSlotAvailability(date, period),
        getAvailableServices(date, period)
      ]);

      return NextResponse.json({
        success: true,
        date: dateStr,
        period,
        timeSlot: {
          totalMinutes: availability.totalMinutes,
          consumedMinutes: availability.consumedMinutes,
          remainingMinutes: availability.remainingMinutes,
          isAvailable: availability.isAvailable,
          currentReservations: availability.currentReservations
        },
        services: availableServices
      });
    }

    // Case 3: Full day availability (default)
    const dailyAvailability = await getDailyAvailability(date);

    return NextResponse.json({
      success: true,
      date: dateStr,
      daily: {
        totalCapacity: dailyAvailability.totalCapacity,
        totalRemaining: dailyAvailability.totalRemaining,
        morning: dailyAvailability.morning ? {
          totalMinutes: dailyAvailability.morning.totalMinutes,
          consumedMinutes: dailyAvailability.morning.consumedMinutes,
          remainingMinutes: dailyAvailability.morning.remainingMinutes,
          isAvailable: dailyAvailability.morning.isAvailable,
          currentReservations: dailyAvailability.morning.currentReservations
        } : null,
        afternoon: dailyAvailability.afternoon ? {
          totalMinutes: dailyAvailability.afternoon.totalMinutes,
          consumedMinutes: dailyAvailability.afternoon.consumedMinutes,
          remainingMinutes: dailyAvailability.afternoon.remainingMinutes,
          isAvailable: dailyAvailability.afternoon.isAvailable,
          currentReservations: dailyAvailability.afternoon.currentReservations
        } : null
      }
    });

  } catch (error) {
    console.error('Availability check error:', error);

    // Handle specific error cases
    if (error instanceof Error && error.message.includes('closed')) {
      return NextResponse.json({
        success: false,
        error: error.message,
        date: dateStr
      }, { status: 404 });
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4.2 Reservation Creation API

Update `/app/api/public/reservations/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createReservationSafely } from '@/lib/reservations/create-reservation';
import { canBookService } from '@/lib/reservations/time-based-availability';
import { Period } from '@prisma/client';

/**
 * POST /api/public/reservations
 * Create new reservation with time-based validation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Input validation
    const errors = validateReservationInput(body);
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    const date = new Date(body.preferredDate);
    const hour = parseInt(body.preferredTime.split(':')[0]);
    const period: Period = hour < 12 ? Period.MORNING : Period.AFTERNOON;

    // Pre-check availability (soft check, transaction will do final check)
    const availability = await canBookService(
      date,
      period,
      body.serviceId
    );

    if (!availability.available) {
      return NextResponse.json({
        success: false,
        error: 'Service not available for selected time slot',
        details: availability.message,
        remainingMinutes: availability.requiredMinutes
      }, { status: 409 });
    }

    // Create reservation with transaction safety
    const reservation = await createReservationSafely({
      serviceId: body.serviceId,
      preferredDate: date,
      preferredTime: body.preferredTime,
      patientName: body.patientName,
      phone: body.phone,
      email: body.email,
      birthDate: new Date(body.birthDate),
      gender: body.gender,
      treatmentType: body.treatmentType,
      notes: body.notes
    });

    return NextResponse.json({
      success: true,
      reservation: {
        id: reservation.id,
        serviceName: reservation.serviceName,
        preferredDate: reservation.preferredDate.toISOString().split('T')[0],
        preferredTime: reservation.preferredTime,
        period: reservation.period,
        estimatedDuration: reservation.estimatedDuration,
        status: reservation.status,
        createdAt: reservation.createdAt.toISOString()
      },
      message: '예약이 접수되었습니다. 확인 후 연락드리겠습니다.'
    }, { status: 201 });

  } catch (error) {
    console.error('Reservation creation error:', error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Insufficient time')) {
        return NextResponse.json({
          success: false,
          error: '선택하신 시간대에 예약 가능한 시간이 부족합니다.',
          details: error.message
        }, { status: 409 });
      }

      if (error.message.includes('Service not found')) {
        return NextResponse.json({
          success: false,
          error: '선택하신 시술을 찾을 수 없습니다.'
        }, { status: 404 });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function validateReservationInput(data: any): string[] {
  const errors: string[] = [];

  if (!data.serviceId) errors.push('Service is required');
  if (!data.preferredDate) errors.push('Date is required');
  if (!data.preferredTime) errors.push('Time is required');
  if (!data.patientName || data.patientName.length < 2) {
    errors.push('Patient name must be at least 2 characters');
  }
  if (!data.phone || !/^01\d{8,9}$/.test(data.phone.replace(/-/g, ''))) {
    errors.push('Valid phone number is required');
  }
  if (!data.birthDate) errors.push('Birth date is required');
  if (!['MALE', 'FEMALE'].includes(data.gender)) {
    errors.push('Gender must be MALE or FEMALE');
  }
  if (!['FIRST_VISIT', 'FOLLOW_UP'].includes(data.treatmentType)) {
    errors.push('Treatment type must be FIRST_VISIT or FOLLOW_UP');
  }

  // Validate date is not in the past
  const reservationDate = new Date(data.preferredDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (reservationDate < today) {
    errors.push('Cannot book reservation for past dates');
  }

  // Validate time format
  if (data.preferredTime && !/^\d{2}:\d{2}$/.test(data.preferredTime)) {
    errors.push('Time must be in HH:MM format');
  }

  return errors;
}
```

### 4.3 API Usage Examples

```typescript
// Example 1: Check full day availability
const response = await fetch('/api/public/reservations/availability?date=2025-11-15');
const data = await response.json();

/*
Response:
{
  "success": true,
  "date": "2025-11-15",
  "daily": {
    "totalCapacity": 480,
    "totalRemaining": 240,
    "morning": {
      "totalMinutes": 180,
      "consumedMinutes": 120,
      "remainingMinutes": 60,
      "isAvailable": true,
      "currentReservations": 3
    },
    "afternoon": {
      "totalMinutes": 300,
      "consumedMinutes": 120,
      "remainingMinutes": 180,
      "isAvailable": true,
      "currentReservations": 2
    }
  }
}
*/

// Example 2: Check specific time slot with services
const response = await fetch('/api/public/reservations/availability?date=2025-11-15&period=MORNING');
const data = await response.json();

/*
Response:
{
  "success": true,
  "date": "2025-11-15",
  "period": "MORNING",
  "timeSlot": {
    "totalMinutes": 180,
    "consumedMinutes": 120,
    "remainingMinutes": 60,
    "isAvailable": true,
    "currentReservations": 3
  },
  "services": [
    {
      "serviceId": "clx123",
      "serviceName": "주름/보톡스",
      "code": "WRINKLE_BOTOX",
      "durationMinutes": 30,
      "bufferMinutes": 10,
      "requiredMinutes": 40,
      "available": true,
      "message": "Available (60 minutes remaining)"
    },
    {
      "serviceId": "clx124",
      "serviceName": "피부케어",
      "code": "SKIN_CARE",
      "durationMinutes": 60,
      "bufferMinutes": 10,
      "requiredMinutes": 70,
      "available": false,
      "message": "Insufficient time (need 70 min, 60 min available)"
    }
  ]
}
*/

// Example 3: Check specific service
const response = await fetch('/api/public/reservations/availability?date=2025-11-15&period=MORNING&serviceId=clx123');
const data = await response.json();

/*
Response:
{
  "success": true,
  "date": "2025-11-15",
  "period": "MORNING",
  "service": {
    "serviceId": "clx123",
    "serviceName": "주름/보톡스",
    "code": "WRINKLE_BOTOX",
    "durationMinutes": 30,
    "bufferMinutes": 10,
    "requiredMinutes": 40,
    "available": true,
    "message": "Available (60 minutes remaining)"
  }
}
*/

// Example 4: Create reservation
const response = await fetch('/api/public/reservations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    serviceId: 'clx123',
    preferredDate: '2025-11-15',
    preferredTime: '10:00',
    patientName: '김환자',
    phone: '01012345678',
    email: 'patient@example.com',
    birthDate: '1990-01-01',
    gender: 'FEMALE',
    treatmentType: 'FIRST_VISIT',
    notes: '알레르기 없음'
  })
});

const data = await response.json();

/*
Success Response (201):
{
  "success": true,
  "reservation": {
    "id": "clx_reservation_123",
    "serviceName": "주름/보톡스",
    "preferredDate": "2025-11-15",
    "preferredTime": "10:00",
    "period": "MORNING",
    "estimatedDuration": 40,
    "status": "PENDING",
    "createdAt": "2025-11-04T12:00:00.000Z"
  },
  "message": "예약이 접수되었습니다. 확인 후 연락드리겠습니다."
}

Error Response (409):
{
  "success": false,
  "error": "선택하신 시간대에 예약 가능한 시간이 부족합니다.",
  "details": "Insufficient time (need 40 min, 30 min available)"
}
*/
```

### 4.4 API Testing

```typescript
// tests/api/reservations.test.ts
import { describe, it, expect } from '@jest/globals';

describe('Public Reservation API', () => {
  describe('GET /api/public/reservations/availability', () => {
    it('should return full day availability', async () => {
      const response = await fetch('/api/public/reservations/availability?date=2025-11-15');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.daily).toBeDefined();
      expect(data.daily.morning).toBeDefined();
      expect(data.daily.afternoon).toBeDefined();
    });

    it('should return time slot with available services', async () => {
      const response = await fetch('/api/public/reservations/availability?date=2025-11-15&period=MORNING');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timeSlot).toBeDefined();
      expect(data.services).toBeInstanceOf(Array);
    });

    it('should reject past dates', async () => {
      const pastDate = '2025-01-01';
      const response = await fetch(`/api/public/reservations/availability?date=${pastDate}`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should reject invalid date format', async () => {
      const response = await fetch('/api/public/reservations/availability?date=invalid');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid date');
    });
  });

  describe('POST /api/public/reservations', () => {
    it('should create reservation when time available', async () => {
      const response = await fetch('/api/public/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: 'test-service-id',
          preferredDate: '2025-11-15',
          preferredTime: '10:00',
          patientName: '테스트환자',
          phone: '01012345678',
          birthDate: '1990-01-01',
          gender: 'FEMALE',
          treatmentType: 'FIRST_VISIT'
        })
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.reservation.id).toBeDefined();
    });

    it('should reject when insufficient time', async () => {
      // Setup: Fill time slot to capacity
      // ... create reservations until full

      const response = await fetch('/api/public/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: 'test-service-id',
          preferredDate: '2025-11-15',
          preferredTime: '10:00',
          // ... other required fields
        })
      });

      expect(response.status).toBe(409);
      expect(data.error).toContain('시간이 부족');
    });

    it('should validate required fields', async () => {
      const response = await fetch('/api/public/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredDate: '2025-11-15'
          // Missing required fields
        })
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toBeDefined();
      expect(data.errors.length).toBeGreaterThan(0);
    });
  });
});
```

**Estimated Time**:
- API development: 2 days
- Testing: 2 days
- Documentation: 1 day
- Integration with frontend: 2 days

---

## Phase 5: Frontend Implementation

**Duration**: 2 weeks
**Risk**: MEDIUM (complex UI state management)
**Priority**: High (user experience critical)

### 5.1 Admin Dashboard - Real-Time Availability View

Create `/app/admin/reservations/time-availability/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface TimeSlotData {
  totalMinutes: number;
  consumedMinutes: number;
  remainingMinutes: number;
  isAvailable: boolean;
  currentReservations: number;
}

interface ServiceAvailability {
  serviceId: string;
  serviceName: string;
  code: string;
  durationMinutes: number;
  bufferMinutes: number;
  requiredMinutes: number;
  available: boolean;
  message: string;
}

interface DailyAvailability {
  totalCapacity: number;
  totalRemaining: number;
  morning: TimeSlotData | null;
  afternoon: TimeSlotData | null;
}

export default function TimeAvailabilityPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyData, setDailyData] = useState<DailyAvailability | null>(null);
  const [morningServices, setMorningServices] = useState<ServiceAvailability[]>([]);
  const [afternoonServices, setAfternoonServices] = useState<ServiceAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailability();
  }, [selectedDate]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Fetch daily overview
      const dailyRes = await fetch(`/api/public/reservations/availability?date=${dateStr}`);
      const dailyJson = await dailyRes.json();
      setDailyData(dailyJson.daily);

      // Fetch morning services
      if (dailyJson.daily.morning) {
        const morningRes = await fetch(`/api/public/reservations/availability?date=${dateStr}&period=MORNING`);
        const morningJson = await morningRes.json();
        setMorningServices(morningJson.services || []);
      }

      // Fetch afternoon services
      if (dailyJson.daily.afternoon) {
        const afternoonRes = await fetch(`/api/public/reservations/availability?date=${dateStr}&period=AFTERNOON`);
        const afternoonJson = await afternoonRes.json();
        setAfternoonServices(afternoonJson.services || []);
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1));
  };

  const utilizationPercentage = dailyData
    ? ((dailyData.totalCapacity - dailyData.totalRemaining) / dailyData.totalCapacity) * 100
    : 0;

  return (
    <div className="p-8 space-y-6">
      {/* Header with Date Navigation */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">실시간 예약 현황</h1>
          <p className="text-gray-600 mt-1">시간 기반 예약 가용성 대시보드</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronLeft size={20} />
          </Button>

          <div className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg min-w-[200px] justify-center">
            <Calendar size={18} className="text-gray-500" />
            <span className="font-semibold">{format(selectedDate, 'yyyy년 MM월 dd일')}</span>
          </div>

          <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
            <ChevronRight size={20} />
          </Button>

          <Button onClick={() => setSelectedDate(new Date())}>
            오늘
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">로딩 중...</div>
      ) : (
        <>
          {/* Daily Summary */}
          <Card>
            <CardHeader>
              <CardTitle>하루 전체 요약</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                    <Clock size={18} />
                    <span className="text-sm">총 진료 시간</span>
                  </div>
                  <p className="text-3xl font-bold">{dailyData?.totalCapacity || 0}분</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                    <TrendingUp size={18} />
                    <span className="text-sm">사용률</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">
                    {utilizationPercentage.toFixed(0)}%
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                    <Clock size={18} />
                    <span className="text-sm">사용 시간</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600">
                    {(dailyData?.totalCapacity || 0) - (dailyData?.totalRemaining || 0)}분
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                    <Clock size={18} />
                    <span className="text-sm">남은 시간</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600">
                    {dailyData?.totalRemaining || 0}분
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>전체 사용률</span>
                  <span className="font-semibold">{utilizationPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={utilizationPercentage} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Morning Time Slot */}
          {dailyData?.morning && (
            <TimeSlotCard
              title="오전 (09:00 - 12:00)"
              period="MORNING"
              data={dailyData.morning}
              services={morningServices}
            />
          )}

          {/* Afternoon Time Slot */}
          {dailyData?.afternoon && (
            <TimeSlotCard
              title="오후 (13:00 - 18:00)"
              period="AFTERNOON"
              data={dailyData.afternoon}
              services={afternoonServices}
            />
          )}
        </>
      )}
    </div>
  );
}

// Time Slot Card Component
function TimeSlotCard({
  title,
  period,
  data,
  services
}: {
  title: string;
  period: string;
  data: TimeSlotData;
  services: ServiceAvailability[];
}) {
  const utilizationPercentage = (data.consumedMinutes / data.totalMinutes) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          <Badge variant={data.isAvailable ? 'default' : 'destructive'}>
            {data.isAvailable ? '예약 가능' : '마감'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Time Usage */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>사용: {data.consumedMinutes}분</span>
              <span>남음: {data.remainingMinutes}분</span>
            </div>
            <Progress value={utilizationPercentage} className="h-3" />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>총 {data.totalMinutes}분</span>
              <span>{data.currentReservations}건 예약</span>
            </div>
          </div>

          {/* Available Services */}
          <div>
            <h4 className="font-semibold mb-3">예약 가능 시술</h4>
            <div className="grid grid-cols-2 gap-3">
              {services.map(service => (
                <div
                  key={service.serviceId}
                  className={`p-4 rounded-lg border ${
                    service.available
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{service.serviceName}</span>
                    <Badge
                      variant={service.available ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {service.available ? '가능' : '불가'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">
                    소요: {service.requiredMinutes}분
                    {' '}
                    (시술 {service.durationMinutes}분 + 준비 {service.bufferMinutes}분)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5.2 Admin Service Management UI

Create `/app/admin/services/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Service {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  category?: string;
  durationMinutes: number;
  bufferMinutes: number;
  basePrice?: number;
  isActive: boolean;
  isVisible: boolean;
  displayOrder: number;
}

export default function ServicesManagementPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, [showInactive]);

  const fetchServices = async () => {
    try {
      const res = await fetch(`/api/admin/services?includeInactive=${showInactive}`);
      const data = await res.json();
      if (data.success) {
        setServices(data.services);
      }
    } catch (error) {
      toast.error('시술 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: Partial<Service>) => {
    try {
      const url = editingService
        ? `/api/admin/services/${editingService.id}`
        : '/api/admin/services';

      const method = editingService ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setIsDialogOpen(false);
        setEditingService(null);
        fetchServices();
      } else {
        if (data.errors) {
          toast.error(data.errors.join(', '));
        } else {
          toast.error(data.error);
        }
      }
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 시술을 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        fetchServices();
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('삭제 중 오류가 발생했습니다');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(isActive ? '시술이 활성화되었습니다' : '시술이 비활성화되었습니다');
        fetchServices();
      }
    } catch (error) {
      toast.error('상태 변경 중 오류가 발생했습니다');
    }
  };

  if (loading) {
    return <div className="p-8">로딩 중...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">시술 관리</h1>
          <p className="text-gray-600 mt-1">
            시술 추가, 수정, 삭제를 관리합니다 (재배포 불필요)
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <span className="text-sm">비활성 포함</span>
          </div>
          <Button onClick={() => {
            setEditingService(null);
            setIsDialogOpen(true);
          }}>
            <Plus className="mr-2" size={16} />
            새 시술 추가
          </Button>
        </div>
      </div>

      {/* Services Table */}
      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>시술명</TableHead>
              <TableHead>코드</TableHead>
              <TableHead>카테고리</TableHead>
              <TableHead className="text-right">시술시간</TableHead>
              <TableHead className="text-right">준비시간</TableHead>
              <TableHead className="text-right">총 소요</TableHead>
              <TableHead className="text-right">가격</TableHead>
              <TableHead className="text-center">상태</TableHead>
              <TableHead className="text-center">노출</TableHead>
              <TableHead className="text-center">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => {
              const totalMinutes = service.durationMinutes + service.bufferMinutes;

              return (
                <TableRow key={service.id}>
                  <TableCell>
                    <GripVertical className="text-gray-400 cursor-move" size={16} />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{service.name}</div>
                      {service.nameEn && (
                        <div className="text-xs text-gray-500">{service.nameEn}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {service.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    {service.category && (
                      <Badge variant="outline">{service.category}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{service.durationMinutes}분</TableCell>
                  <TableCell className="text-right">{service.bufferMinutes}분</TableCell>
                  <TableCell className="text-right font-semibold">{totalMinutes}분</TableCell>
                  <TableCell className="text-right">
                    {service.basePrice
                      ? `${service.basePrice.toLocaleString()}원`
                      : '-'
                    }
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={service.isActive}
                      onCheckedChange={(checked) => toggleActive(service.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {service.isVisible ? (
                      <Eye className="inline text-green-600" size={18} />
                    ) : (
                      <EyeOff className="inline text-gray-400" size={18} />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-1 justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingService(service);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(service.id, service.name)}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <ServiceFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        service={editingService}
        onSave={handleSave}
      />
    </div>
  );
}

// Service Form Dialog Component
function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onSave: (data: Partial<Service>) => void;
}) {
  const [formData, setFormData] = useState<Partial<Service>>({
    code: '',
    name: '',
    nameEn: '',
    description: '',
    category: '',
    durationMinutes: 30,
    bufferMinutes: 10,
    basePrice: 0,
    isActive: true,
    isVisible: true,
    displayOrder: 0
  });

  useEffect(() => {
    if (service) {
      setFormData(service);
    } else {
      // Reset for new service
      setFormData({
        code: '',
        name: '',
        nameEn: '',
        description: '',
        category: '',
        durationMinutes: 30,
        bufferMinutes: 10,
        basePrice: 0,
        isActive: true,
        isVisible: true,
        displayOrder: 0
      });
    }
  }, [service, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const totalMinutes = (formData.durationMinutes || 0) + (formData.bufferMinutes || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {service ? '시술 수정' : '새 시술 추가'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Code + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">시술 코드 *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="WRINKLE_BOTOX"
                disabled={!!service}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                영문 대문자와 언더스코어만 사용
              </p>
            </div>

            <div>
              <Label htmlFor="category">카테고리</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="피부, 성형, 바디 등"
              />
            </div>
          </div>

          {/* Korean + English Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">시술명 (한글) *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="주름/보톡스"
                required
              />
            </div>

            <div>
              <Label htmlFor="nameEn">시술명 (영문)</Label>
              <Input
                id="nameEn"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="Wrinkle/Botox"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="시술에 대한 간단한 설명"
              rows={3}
            />
          </div>

          {/* Time Configuration */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="durationMinutes">시술 시간 (분) *</Label>
              <Input
                id="durationMinutes"
                type="number"
                min="1"
                max="480"
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="bufferMinutes">준비 시간 (분) *</Label>
              <Input
                id="bufferMinutes"
                type="number"
                min="0"
                max="60"
                value={formData.bufferMinutes}
                onChange={(e) => setFormData({ ...formData, bufferMinutes: parseInt(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label>총 소요 시간</Label>
              <div className="h-10 flex items-center px-3 border rounded bg-gray-50">
                <span className="font-semibold text-blue-600">
                  {totalMinutes}분
                </span>
              </div>
            </div>
          </div>

          {/* Price + Order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="basePrice">기본 가격 (원)</Label>
              <Input
                id="basePrice"
                type="number"
                min="0"
                step="1000"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: parseInt(e.target.value) })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="displayOrder">정렬 순서</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>활성화</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isVisible}
                onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
              />
              <Label>예약 폼에 노출</Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit">
              <Save className="mr-2" size={16} />
              {service ? '수정' : '추가'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

*(Continued in Part 3...)*
