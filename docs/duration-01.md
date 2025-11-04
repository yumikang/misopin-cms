현재 구조는 `ServiceType`이 Prisma enum으로 하드코딩되어 있어서 시술 추가할 때마다 개발자가 코드 수정 → DB migration → 재배포해야 하는데, 이건 완전 비효율적이지.

## 문제점: 현재 Enum 방식

```prisma
// 현재 방식 - 하드코딩됨 ❌
enum ServiceType {
  WRINKLE_BOTOX
  VOLUME_LIFTING
  SKIN_CARE
  REMOVAL_PROCEDURE
  BODY_CARE
  OTHER_CONSULTATION
}
```

새 시술 추가하려면:
1. 개발자가 schema.prisma 수정
2. migration 생성
3. 재배포
4. 다운타임 발생 가능

## 해결책: 동적 테이블 방식으로 변경

### 1. **Database Schema 재설계**

```prisma
// prisma/schema.prisma

// 시술 마스터 테이블 (동적 관리)
model Service {
  id                String   @id @default(cuid())
  code              String   @unique // "WRINKLE_BOTOX" (시스템 코드)
  name              String   // "주름/보톡스" (한글명)
  nameEn            String?  // "Wrinkle/Botox" (영문명)
  description       String?  @db.Text
  category          String?  // "피부", "성형", "바디" 등
  
  // 시간 설정
  durationMinutes   Int      @default(30) // 시술 시간
  bufferMinutes     Int      @default(10) // 준비/정리 시간
  
  // 가격 정보 (선택)
  basePrice         Int?
  
  // 상태 관리
  isActive          Boolean  @default(true)
  isVisible         Boolean  @default(true) // 예약 폼에 노출 여부
  displayOrder      Int      @default(0)    // 정렬 순서
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deletedAt         DateTime? // Soft delete
  
  // Relations
  reservations      Reservation[]
  
  @@map("services")
  @@index([isActive, isVisible, displayOrder])
}

// 예약 테이블 수정
model Reservation {
  id                String    @id @default(cuid())
  
  // Foreign Key로 변경
  serviceId         String
  service           Service   @relation(fields: [serviceId], references: [id])
  
  // 예약 시점의 시술 정보 스냅샷 (나중에 시술 정보 바뀌어도 OK)
  serviceName       String    // "주름/보톡스"
  estimatedDuration Int       // 40분
  
  period            Period    // MORNING, AFTERNOON
  preferredDate     DateTime
  preferredTime     String
  
  // ... 나머지 환자 정보 등 ...
  
  status            ReservationStatus @default(PENDING)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@map("reservations")
  @@index([serviceId, preferredDate, status])
  @@index([preferredDate, period, status])
}

// 진료 시간대는 그대로 유지
model ClinicTimeSlot {
  id              String   @id @default(cuid())
  dayOfWeek       Int      // 0=일요일, 6=토요일
  period          Period   // MORNING, AFTERNOON
  startTime       String   // "09:00"
  endTime         String   // "12:00"
  totalMinutes    Int      // 자동 계산
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([dayOfWeek, period])
  @@map("clinic_time_slots")
}

enum Period {
  MORNING
  AFTERNOON
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}
```

### 2. **Admin API: 시술 관리 CRUD**

```typescript
// app/api/admin/services/route.ts

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// 전체 시술 목록 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('includeInactive') === 'true';
  
  try {
    const services = await prisma.service.findMany({
      where: includeInactive ? {} : { 
        isActive: true,
        deletedAt: null 
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });
    
    return NextResponse.json({
      success: true,
      services,
      total: services.length
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 새 시술 추가
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      code, 
      name, 
      nameEn,
      description,
      category,
      durationMinutes, 
      bufferMinutes,
      basePrice,
      isActive = true,
      isVisible = true,
      displayOrder = 0
    } = body;
    
    // Validation
    if (!code || !name) {
      return NextResponse.json(
        { success: false, error: '코드와 이름은 필수입니다' },
        { status: 400 }
      );
    }
    
    if (durationMinutes < 1 || durationMinutes > 480) {
      return NextResponse.json(
        { success: false, error: '시술 시간은 1~480분 사이여야 합니다' },
        { status: 400 }
      );
    }
    
    // 코드 중복 체크
    const existing = await prisma.service.findUnique({
      where: { code }
    });
    
    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 존재하는 시술 코드입니다' },
        { status: 409 }
      );
    }
    
    // 시술 생성
    const service = await prisma.service.create({
      data: {
        code,
        name,
        nameEn,
        description,
        category,
        durationMinutes,
        bufferMinutes: bufferMinutes || 10,
        basePrice,
        isActive,
        isVisible,
        displayOrder
      }
    });
    
    return NextResponse.json({
      success: true,
      service,
      message: `${name} 시술이 추가되었습니다`
    }, { status: 201 });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

```typescript
// app/api/admin/services/[id]/route.ts

// 단일 시술 수정
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;
    
    // 존재 확인
    const existing = await prisma.service.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '시술을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // 수정 가능한 필드만 업데이트
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.nameEn !== undefined) updateData.nameEn = body.nameEn;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.durationMinutes !== undefined) {
      if (body.durationMinutes < 1 || body.durationMinutes > 480) {
        return NextResponse.json(
          { success: false, error: '시술 시간은 1~480분 사이여야 합니다' },
          { status: 400 }
        );
      }
      updateData.durationMinutes = body.durationMinutes;
    }
    if (body.bufferMinutes !== undefined) updateData.bufferMinutes = body.bufferMinutes;
    if (body.basePrice !== undefined) updateData.basePrice = body.basePrice;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.isVisible !== undefined) updateData.isVisible = body.isVisible;
    if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder;
    
    const service = await prisma.service.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json({
      success: true,
      service,
      message: '시술 정보가 수정되었습니다'
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 시술 삭제 (Soft Delete)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // 예약 내역 체크
    const reservationCount = await prisma.reservation.count({
      where: { 
        serviceId: id,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });
    
    if (reservationCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `진행 중인 예약이 ${reservationCount}건 있어 삭제할 수 없습니다. 비활성화를 권장합니다.` 
        },
        { status: 409 }
      );
    }
    
    // Soft delete
    const service = await prisma.service.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        isActive: false,
        isVisible: false
      }
    });
    
    return NextResponse.json({
      success: true,
      service,
      message: '시술이 삭제되었습니다'
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### 3. **Admin UI: 시술 관리 페이지**

```typescript
// app/admin/services/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  
  useEffect(() => {
    fetchServices();
  }, [showInactive]);
  
  const fetchServices = async () => {
    const res = await fetch(`/api/admin/services?includeInactive=${showInactive}`);
    const data = await res.json();
    if (data.success) {
      setServices(data.services);
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
        toast.error(data.error);
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
  
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">시술 관리</h1>
          <p className="text-gray-600 mt-1">
            시술 추가, 수정, 삭제를 관리합니다
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
      
      {/* Table */}
      <div className="border rounded-lg">
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
      
      {/* Dialog for Add/Edit */}
      <ServiceFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        service={editingService}
        onSave={handleSave}
      />
    </div>
  );
}

// 시술 추가/수정 폼 컴포넌트
function ServiceFormDialog({ open, onOpenChange, service, onSave }) {
  const [formData, setFormData] = useState({
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
      // Reset form for new service
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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {service ? '시술 수정' : '새 시술 추가'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 코드 (수정 불가) */}
            <div>
              <Label htmlFor="code">시술 코드 *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="WRINKLE_BOTOX"
                disabled={!!service}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                영문 대문자와 언더스코어만 사용
              </p>
            </div>
            
            {/* 카테고리 */}
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
          
          <div className="grid grid-cols-2 gap-4">
            {/* 한글명 */}
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
            
            {/* 영문명 */}
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
          
          {/* 설명 */}
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
          
          <div className="grid grid-cols-3 gap-4">
            {/* 시술 시간 */}
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
            
            {/* 준비 시간 */}
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
            
            {/* 총 소요 시간 (자동 계산) */}
            <div>
              <Label>총 소요 시간</Label>
              <div className="h-10 flex items-center px-3 border rounded bg-gray-50">
                <span className="font-semibold">
                  {formData.durationMinutes + formData.bufferMinutes}분
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* 기본 가격 */}
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
            
            {/* 정렬 순서 */}
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
          
          <div className="flex gap-6">
            {/* 활성화 */}
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>활성화</Label>
            </div>
            
            {/* 노출 */}
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isVisible}
                onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
              />
              <Label>예약 폼에 노출</Label>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit">
              {service ? '수정' : '추가'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. **Migration 전략**

```typescript
// prisma/migrations/xxx_convert_to_dynamic_services.sql

-- 1. 새 테이블 생성
CREATE TABLE "services" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  -- ... 나머지 컬럼들
);

-- 2. 기존 enum 데이터를 새 테이블로 마이그레이션
INSERT INTO "services" (id, code, name, durationMinutes, bufferMinutes, isActive)
VALUES 
  (gen_random_uuid(), 'WRINKLE_BOTOX', '주름/보톡스', 30, 10, true),
  (gen_random_uuid(), 'VOLUME_LIFTING', '볼륨/리프팅', 45, 15, true),
  (gen_random_uuid(), 'SKIN_CARE', '피부케어', 60, 10, true),
  (gen_random_uuid(), 'REMOVAL_PROCEDURE', '제거시술', 40, 10, true),
  (gen_random_uuid(), 'BODY_CARE', '바디케어', 50, 10, true),
  (gen_random_uuid(), 'OTHER_CONSULTATION', '기타 상담', 20, 5, true);

-- 3. Reservations 테이블에 serviceId 컬럼 추가
ALTER TABLE "reservations" ADD COLUMN "serviceId" TEXT;
ALTER TABLE "reservations" ADD COLUMN "serviceName" TEXT;

-- 4. 기존 예약의 service enum을 serviceId로 변환
UPDATE "reservations" r
SET 
  "serviceId" = s.id,
  "serviceName" = s.name
FROM "services" s
WHERE r.service::text = s.code;

-- 5. 외래 키 제약 추가
ALTER TABLE "reservations" 
ADD CONSTRAINT "reservations_serviceId_fkey" 
FOREIGN KEY ("serviceId") REFERENCES "services"("id");

-- 6. 기존 service enum 컬럼 삭제 (데이터 백업 후)
-- ALTER TABLE "reservations" DROP COLUMN "service";
```

### 5. **실제 사용 시나리오**

**시나리오 1: 새 시술 추가** (개발자 개입 없음 ✅)
```
원장님이 Admin 페이지에서:
1. "새 시술 추가" 버튼 클릭
2. 폼 작성:
   - 코드: HAIR_REMOVAL
   - 이름: 제모 시술
   - 시술 시간: 60분
   - 준비 시간: 15분
3. 저장 → 즉시 반영!
4. 다음날부터 예약 가능
```

**시나리오 2: 시술 중지** (개발자 개입 없음 ✅)
```
특정 시술을 더 이상 제공하지 않을 때:
1. 해당 시술 행의 "활성화" 토글 OFF
2. 또는 "노출" 토글만 OFF (기존 예약은 유지, 신규 예약만 차단)
3. 완전 삭제도 가능 (단, 진행 중인 예약이 없을 때만)
```

**시나리오 3: 시술 시간 조정** (개발자 개입 없음 ✅)
```
경험상 시간이 더 걸린다는 걸 알게 됨:
1. "주름/보톡스" 수정 버튼 클릭
2. 시술 시간: 30분 → 40분으로 변경
3. 저장 → 다음 예약부터 40분 기준으로 계산됨
4. 기존 예약은 영향 없음 (스냅샷 방식)
```

## 핵심 장점

1. **Zero Development Time** - 시술 관리에 개발자 불필요
2. **즉시 반영** - 수정하면 바로 적용
3. **안전성** - 기존 예약 데이터 보존 (스냅샷)
4. **유연성** - 카테고리, 가격, 순서 등 자유롭게 관리
5. **확장성** - 100개 시술도 문제없음
