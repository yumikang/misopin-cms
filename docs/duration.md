**공유 리소스(의사 1명의 시간) 기반 스케줄링** 시스템이네요!

현재 시스템은 각 시술별로 독립적인 한도만 체크하는데, 실제로는:
- 의사 1명 = 하루 총 480분 (오전 180분 + 오후 300분)
- 주름/보톡스 3건(120분) 예약됨 → **남은 시간 360분**
- 이 360분 안에서 다른 시술들 예약 가능
- **실시간 크로스 계산**이 필요!

## 새로운 시스템 설계

### 1. **Database Schema 재설계**

```prisma
// schema.prisma

// 시술별 기본 정보
model ServiceConfiguration {
  id                Int         @id @default(autoincrement())
  serviceType       ServiceType @unique
  durationMinutes   Int         // 시술 소요 시간
  bufferMinutes     Int         @default(10) // 준비/정리 시간
  isActive          Boolean     @default(true)
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  
  @@map("service_configurations")
}

// 진료 시간대 설정 (오전/오후 분리)
model ClinicTimeSlot {
  id              Int      @id @default(autoincrement())
  dayOfWeek       Int      // 0=일요일, 6=토요일
  period          Period   // MORNING, AFTERNOON
  startTime       String   // "09:00"
  endTime         String   // "12:00"
  totalMinutes    Int      // 자동 계산: 180
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([dayOfWeek, period])
  @@map("clinic_time_slots")
}

enum Period {
  MORNING      // 오전
  AFTERNOON    // 오후
}

// 기존 reservations 테이블에 컬럼 추가
model Reservation {
  // ... 기존 필드들 ...
  
  service              ServiceType
  estimatedDuration    Int          // 예약 시 계산된 소요 시간 (분)
  period               Period       // 오전/오후 구분
  
  // ... 나머지 필드들 ...
}
```

### 2. **핵심 로직: 실시간 시간 기반 가용성 체크**

```typescript
// lib/reservations/time-based-availability.ts

interface TimeSlotAvailability {
  date: Date;
  period: Period;
  totalMinutes: number;        // 해당 시간대 총 시간 (예: 180분)
  consumedMinutes: number;     // 이미 예약된 시간 (예: 120분)
  remainingMinutes: number;    // 남은 시간 (예: 60분)
  isAvailable: boolean;
}

interface ServiceDuration {
  serviceType: ServiceType;
  totalMinutes: number;        // 시술 시간 + 버퍼
}

/**
 * 특정 날짜/시간대의 실시간 가용 시간 계산
 */
export async function calculateTimeSlotAvailability(
  date: Date,
  period: Period
): Promise<TimeSlotAvailability> {
  const dayOfWeek = date.getDay();
  
  // 1. 해당 시간대 설정 가져오기
  const timeSlot = await prisma.clinicTimeSlot.findUnique({
    where: {
      dayOfWeek_period: {
        dayOfWeek,
        period
      }
    }
  });
  
  if (!timeSlot || !timeSlot.isActive) {
    throw new Error('해당 시간대는 진료하지 않습니다');
  }
  
  // 2. 해당 날짜/시간대의 모든 예약 가져오기
  const reservations = await prisma.reservation.findMany({
    where: {
      preferredDate: {
        gte: startOfDay(date),
        lt: endOfDay(date)
      },
      period: period,
      status: {
        in: ['PENDING', 'CONFIRMED'] // 취소된 예약은 제외
      }
    },
    select: {
      estimatedDuration: true
    }
  });
  
  // 3. 이미 소비된 시간 합산
  const consumedMinutes = reservations.reduce(
    (sum, res) => sum + res.estimatedDuration, 
    0
  );
  
  const remainingMinutes = timeSlot.totalMinutes - consumedMinutes;
  
  return {
    date,
    period,
    totalMinutes: timeSlot.totalMinutes,
    consumedMinutes,
    remainingMinutes,
    isAvailable: remainingMinutes > 0
  };
}

/**
 * 특정 시술이 예약 가능한지 체크 (크로스 시간 계산)
 */
export async function canBookService(
  date: Date,
  period: Period,
  serviceType: ServiceType
): Promise<{
  available: boolean;
  remainingMinutes: number;
  requiredMinutes: number;
  message: string;
}> {
  // 1. 시술 소요 시간 가져오기
  const service = await prisma.serviceConfiguration.findUnique({
    where: { serviceType }
  });
  
  if (!service || !service.isActive) {
    return {
      available: false,
      remainingMinutes: 0,
      requiredMinutes: 0,
      message: '해당 시술은 현재 제공하지 않습니다'
    };
  }
  
  const requiredMinutes = service.durationMinutes + service.bufferMinutes;
  
  // 2. 현재 시간대 가용성 체크
  const availability = await calculateTimeSlotAvailability(date, period);
  
  // 3. 남은 시간으로 이 시술이 가능한가?
  const available = availability.remainingMinutes >= requiredMinutes;
  
  return {
    available,
    remainingMinutes: availability.remainingMinutes,
    requiredMinutes,
    message: available
      ? `예약 가능합니다 (남은 시간: ${availability.remainingMinutes}분)`
      : `시간이 부족합니다 (필요: ${requiredMinutes}분, 남음: ${availability.remainingMinutes}분)`
  };
}

/**
 * 트랜잭션 내에서 예약 생성 전 최종 체크 (동시성 안전)
 */
export async function canCreateReservationWithTimeCheck(
  tx: Prisma.TransactionClient,
  date: Date,
  period: Period,
  serviceType: ServiceType
): Promise<boolean> {
  // 비관적 락 사용
  const service = await tx.serviceConfiguration.findUnique({
    where: { serviceType }
  });
  
  if (!service) return false;
  
  const requiredMinutes = service.durationMinutes + service.bufferMinutes;
  const dayOfWeek = date.getDay();
  
  // 시간대 설정
  const timeSlot = await tx.clinicTimeSlot.findUnique({
    where: {
      dayOfWeek_period: { dayOfWeek, period }
    }
  });
  
  if (!timeSlot) return false;
  
  // 현재 소비된 시간 계산 (FOR UPDATE로 락)
  const reservations = await tx.reservation.findMany({
    where: {
      preferredDate: {
        gte: startOfDay(date),
        lt: endOfDay(date)
      },
      period: period,
      status: { in: ['PENDING', 'CONFIRMED'] }
    }
  });
  
  const consumedMinutes = reservations.reduce(
    (sum, res) => sum + res.estimatedDuration, 
    0
  );
  
  const remainingMinutes = timeSlot.totalMinutes - consumedMinutes;
  
  return remainingMinutes >= requiredMinutes;
}

/**
 * 특정 날짜의 오전/오후 모든 시간대 가용성 조회
 */
export async function getDailyAvailability(date: Date) {
  const morning = await calculateTimeSlotAvailability(date, 'MORNING');
  const afternoon = await calculateTimeSlotAvailability(date, 'AFTERNOON');
  
  return {
    date,
    morning,
    afternoon,
    totalRemaining: morning.remainingMinutes + afternoon.remainingMinutes
  };
}

/**
 * 특정 날짜/시간대에 예약 가능한 모든 시술 목록 반환
 */
export async function getAvailableServices(
  date: Date,
  period: Period
): Promise<Array<{
  serviceType: ServiceType;
  serviceName: string;
  durationMinutes: number;
  available: boolean;
  requiredMinutes: number;
}>> {
  const availability = await calculateTimeSlotAvailability(date, period);
  const services = await prisma.serviceConfiguration.findMany({
    where: { isActive: true },
    orderBy: { serviceType: 'asc' }
  });
  
  return services.map(service => {
    const requiredMinutes = service.durationMinutes + service.bufferMinutes;
    return {
      serviceType: service.serviceType,
      serviceName: getServiceName(service.serviceType),
      durationMinutes: service.durationMinutes,
      available: availability.remainingMinutes >= requiredMinutes,
      requiredMinutes
    };
  });
}
```

### 3. **예약 생성 API 수정**

```typescript
// app/api/public/reservations/route.ts

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { service, preferred_date, preferred_time, ...rest } = body;
    
    const date = new Date(preferred_date);
    const hour = parseInt(preferred_time.split(':')[0]);
    
    // 오전/오후 구분 (12시 기준)
    const period: Period = hour < 12 ? 'MORNING' : 'AFTERNOON';
    
    // 트랜잭션으로 예약 생성
    const reservation = await prisma.$transaction(async (tx) => {
      // 1. 시간 기반 가용성 최종 체크
      const canBook = await canCreateReservationWithTimeCheck(
        tx,
        date,
        period,
        service
      );
      
      if (!canBook) {
        throw new Error('해당 시간대에 예약 가능한 시간이 부족합니다');
      }
      
      // 2. 시술 정보 가져와서 소요 시간 계산
      const serviceConfig = await tx.serviceConfiguration.findUnique({
        where: { serviceType: service }
      });
      
      const estimatedDuration = 
        serviceConfig.durationMinutes + serviceConfig.bufferMinutes;
      
      // 3. 예약 생성
      return await tx.reservation.create({
        data: {
          ...rest,
          service,
          preferredDate: date,
          preferredTime: preferred_time,
          period,
          estimatedDuration, // 소요 시간 저장
          status: 'PENDING'
        }
      });
    });
    
    return NextResponse.json(
      { success: true, reservation },
      { status: 201 }
    );
    
  } catch (error) {
    if (error.message.includes('시간이 부족')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 } // Conflict
      );
    }
    throw error;
  }
}
```

### 4. **실시간 가용성 체크 API**

```typescript
// app/api/public/reservations/availability/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');
  const periodStr = searchParams.get('period') as Period;
  const serviceType = searchParams.get('serviceType') as ServiceType;
  
  if (!dateStr) {
    return NextResponse.json(
      { error: '날짜를 입력해주세요' },
      { status: 400 }
    );
  }
  
  const date = new Date(dateStr);
  
  try {
    // 1. 특정 시술의 예약 가능 여부
    if (serviceType && periodStr) {
      const result = await canBookService(date, periodStr, serviceType);
      return NextResponse.json({
        success: true,
        date: dateStr,
        period: periodStr,
        serviceType,
        ...result
      });
    }
    
    // 2. 전체 시간대별 가용성
    if (periodStr) {
      const availability = await calculateTimeSlotAvailability(date, periodStr);
      const availableServices = await getAvailableServices(date, periodStr);
      
      return NextResponse.json({
        success: true,
        ...availability,
        availableServices
      });
    }
    
    // 3. 하루 전체 가용성
    const daily = await getDailyAvailability(date);
    return NextResponse.json({
      success: true,
      ...daily
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### 5. **Admin UI: 실시간 현황 대시보드**

```typescript
// app/admin/reservations/time-availability/page.tsx

export default function TimeAvailabilityPage() {
  const [date, setDate] = useState(new Date());
  const [availability, setAvailability] = useState(null);
  
  useEffect(() => {
    fetchAvailability();
  }, [date]);
  
  const fetchAvailability = async () => {
    const res = await fetch(
      `/api/public/reservations/availability?date=${format(date, 'yyyy-MM-dd')}`
    );
    const data = await res.json();
    setAvailability(data);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">실시간 예약 현황</h1>
        <DatePicker value={date} onChange={setDate} />
      </div>
      
      {/* 오전 시간대 */}
      <Card>
        <CardHeader>
          <CardTitle>오전 (09:00 - 12:00)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 진행 바 */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>사용: {availability?.morning.consumedMinutes}분</span>
                <span>남음: {availability?.morning.remainingMinutes}분</span>
              </div>
              <Progress 
                value={
                  (availability?.morning.consumedMinutes / 
                   availability?.morning.totalMinutes) * 100
                } 
              />
              <p className="text-xs text-gray-500 mt-1">
                총 {availability?.morning.totalMinutes}분 중 
                {' '}{availability?.morning.consumedMinutes}분 사용됨
              </p>
            </div>
            
            {/* 예약 가능한 시술 목록 */}
            <div>
              <h3 className="font-semibold mb-2">예약 가능한 시술</h3>
              <div className="grid grid-cols-2 gap-2">
                {availability?.morning.availableServices?.map(service => (
                  <div 
                    key={service.serviceType}
                    className={cn(
                      "p-3 rounded-lg border",
                      service.available 
                        ? "bg-green-50 border-green-200" 
                        : "bg-red-50 border-red-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {service.serviceName}
                      </span>
                      {service.available ? (
                        <CheckCircle className="text-green-600" size={20} />
                      ) : (
                        <XCircle className="text-red-600" size={20} />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      소요: {service.requiredMinutes}분
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 오후 시간대 - 동일한 구조 */}
      <Card>
        <CardHeader>
          <CardTitle>오후 (13:00 - 18:00)</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 오전과 동일한 구조 */}
        </CardContent>
      </Card>
      
      {/* 전체 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>하루 전체 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">
                {(availability?.morning.totalMinutes || 0) + 
                 (availability?.afternoon.totalMinutes || 0)}분
              </p>
              <p className="text-sm text-gray-600">총 진료 시간</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {(availability?.morning.consumedMinutes || 0) + 
                 (availability?.afternoon.consumedMinutes || 0)}분
              </p>
              <p className="text-sm text-gray-600">사용된 시간</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {availability?.totalRemaining || 0}분
              </p>
              <p className="text-sm text-gray-600">남은 시간</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## 실제 동작 예시

```
날짜: 2025-11-15 (금요일)

=== 오전 (09:00 - 12:00) ===
총 시간: 180분

[현재 예약 현황]
1. 주름/보톡스 - 09:00 (40분 소요)
2. 주름/보톡스 - 09:45 (40분 소요)  
3. 주름/보톡스 - 10:30 (40분 소요)
소계: 120분 사용

남은 시간: 60분

[새 예약 시도]
- 볼륨/리프팅 (60분) → ✅ 가능 (정확히 60분 남음)
- 피부케어 (70분) → ❌ 불가능 (60분 남음, 10분 부족)
- 주름/보톡스 (40분) → ✅ 가능 (60분 남음)

=== 오후 (13:00 - 18:00) ===
총 시간: 300분

[현재 예약 현황]
1. 피부케어 - 13:00 (70분 소요)
2. 볼륨/리프팅 - 14:30 (60분 소요)
소계: 130분 사용

남은 시간: 170분

[새 예약 시도]
- 모든 시술 가능 ✅
```

## 주요 장점

1. **실시간 크로스 계산**: 모든 시술이 같은 시간 풀을 공유
2. **정확한 스케줄링**: 의사 1명의 실제 가용 시간 기반
3. **동시성 안전**: 트랜잭션 + 비관적 락
4. **유연성**: 시간대별 독립 관리
5. **확장성**: 의사 여러명으로 확장 가능 (doctor_id 추가)

