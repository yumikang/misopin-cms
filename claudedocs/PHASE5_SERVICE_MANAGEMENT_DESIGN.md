# Phase 5: Service Management System - Comprehensive Design Document

## Executive Summary

**Objective**: Create a complete service (시술) management system that allows administrators to perform CRUD operations on medical services, with automatic cascade effects on the reservation system.

**Priority**: HIGHEST - This is a foundational feature that blocks other development
**Estimated Time**: 4-5 hours total
**Development Approach**: Admin-first → API → Public endpoint → Testing

---

## 1. System Architecture Overview

### 1.1 Current State Analysis

**Database Schema (Existing)**:
```prisma
model services {
  id                      String   @id
  code                    String   @unique @db.VarChar(50)
  name                    String   @db.VarChar(100)
  description             String?
  category                String?  @db.VarChar(50)
  durationMinutes         Int      // ← CRITICAL FIELD
  bufferMinutes           Int      @default(10)
  isActive                Boolean  @default(true)
  displayOrder            Int      @default(0)
  createdAt               DateTime @default(now())
  updatedAt               DateTime

  // Relations
  clinic_time_slots       clinic_time_slots[]
  manual_time_closures    manual_time_closures[]
  reservations            reservations[]
  service_reservation_limits service_reservation_limits?
}
```

**Key Insight**:
- Services table EXISTS but NO admin UI to manage it
- Changes to `durationMinutes` affect max booking calculations
- `code` field maps to ServiceType enum (WRINKLE_BOTOX, VOLUME_LIFTING, etc.)
- One-to-one relation with `service_reservation_limits`

**Current API**:
- ✅ Public: GET `/api/public/services` (read-only)
- ❌ Admin: NO CRUD endpoints exist

**Gap Identified**:
- Cannot add new services
- Cannot edit service duration (critical for capacity planning)
- Cannot manage service categories
- Cannot toggle service active status
- All changes require direct SQL access

---

## 2. Detailed Requirements

### 2.1 Core Features

**Admin Service Management**:
1. **List Services**: View all services with filtering and sorting
2. **Create Service**: Add new medical service offerings
3. **Edit Service**: Modify service properties (especially durationMinutes)
4. **Toggle Active Status**: Enable/disable services without deletion
5. **Delete/Archive**: Soft delete services (set isActive = false)
6. **Reorder Services**: Manage displayOrder for presentation

**Cascade Effects**:
When `durationMinutes` changes from 30 → 40:
- Max bookings per day changes: `Math.floor(dailyLimitMinutes / durationMinutes)`
- Example: 240 min limit ÷ 30 min = 8 bookings → 240 ÷ 40 = 6 bookings
- Reservation system must use updated duration immediately
- Service limits UI must reflect new calculations

### 2.2 Business Rules

1. **Code Uniqueness**: Service codes must be unique (enforced by DB)
2. **Active Service Deletion**: Cannot hard-delete active services
3. **Reservation Dependency**: Services with existing reservations cannot be hard-deleted
4. **Duration Constraints**:
   - Minimum: 10 minutes
   - Maximum: 480 minutes (8 hours)
   - Recommended: 30-minute increments
5. **Buffer Time**: Default 10 minutes, can be customized
6. **Display Order**: Auto-increment for new services

### 2.3 Validation Rules

**Create/Update Validations**:
```typescript
{
  code: {
    required: true,
    pattern: /^[A-Z_]+$/,
    maxLength: 50,
    unique: true
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  durationMinutes: {
    required: true,
    min: 10,
    max: 480,
    type: 'integer'
  },
  bufferMinutes: {
    required: false,
    min: 0,
    max: 60,
    default: 10
  },
  category: {
    required: false,
    maxLength: 50
  }
}
```

---

## 3. API Design Specification

### 3.1 Admin API Endpoints

#### GET `/api/admin/services`
**Purpose**: Retrieve all services with optional filtering

**Auth**: Required (JWT Bearer token)

**Query Parameters**:
```typescript
{
  active?: boolean;      // Filter by active status
  category?: string;     // Filter by category
  search?: string;       // Search in name/description
  sortBy?: 'name' | 'displayOrder' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
```

**Response**:
```typescript
{
  success: true,
  data: Service[],
  count: number,
  timestamp: string
}

interface Service {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMinutes: number;
  bufferMinutes: number;
  totalMinutes: number;  // durationMinutes + bufferMinutes
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;

  // Relations
  _count: {
    reservations: number;
    clinic_time_slots: number;
  };
  service_reservation_limits: {
    dailyLimitMinutes: number | null;
    isActive: boolean;
  } | null;
}
```

#### POST `/api/admin/services`
**Purpose**: Create new service

**Auth**: Required (role: ADMIN or SUPER_ADMIN)

**Request Body**:
```typescript
{
  code: string;           // "LASER_TREATMENT"
  name: string;           // "레이저 치료"
  description?: string;   // "피부 레이저 치료 프로그램"
  category?: string;      // "피부과"
  durationMinutes: number; // 40
  bufferMinutes?: number;  // 10 (default)
  isActive?: boolean;      // true (default)
  displayOrder?: number;   // auto-assigned if not provided
}
```

**Response**:
```typescript
{
  success: true,
  message: "Service created successfully",
  data: Service,
  timestamp: string
}
```

**Error Responses**:
- 400: Validation error (invalid data)
- 401: Unauthorized
- 403: Forbidden (insufficient role)
- 409: Conflict (duplicate code)
- 500: Server error

#### PATCH `/api/admin/services/[id]`
**Purpose**: Update existing service

**Auth**: Required (role: ADMIN or SUPER_ADMIN)

**Request Body** (all fields optional):
```typescript
{
  name?: string;
  description?: string;
  category?: string;
  durationMinutes?: number;  // ← CRITICAL: triggers cascade
  bufferMinutes?: number;
  isActive?: boolean;
  displayOrder?: number;
}
```

**Response**:
```typescript
{
  success: true,
  message: "Service updated successfully",
  data: Service,
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[],
  cascadeEffects?: {
    maxBookingsChanged: {
      before: number;
      after: number;
    }
  },
  timestamp: string
}
```

#### DELETE `/api/admin/services/[id]`
**Purpose**: Soft delete service (set isActive = false)

**Auth**: Required (role: SUPER_ADMIN only)

**Query Parameters**:
```typescript
{
  hard?: boolean;  // true = hard delete (dangerous)
}
```

**Response**:
```typescript
{
  success: true,
  message: "Service deactivated successfully",
  data: Service,
  timestamp: string
}
```

**Business Logic**:
- Default: Soft delete (isActive = false)
- Hard delete only if:
  - `hard=true` parameter
  - No existing reservations
  - No service limits configured
  - User has SUPER_ADMIN role

#### PUT `/api/admin/services/reorder`
**Purpose**: Batch update display order

**Auth**: Required

**Request Body**:
```typescript
{
  services: {
    id: string;
    displayOrder: number;
  }[]
}
```

**Response**:
```typescript
{
  success: true,
  message: "Display order updated",
  count: number
}
```

### 3.2 Public API Enhancement

#### GET `/api/public/services` (EXISTING - NO CHANGES NEEDED)
Already implemented correctly with:
- Active service filtering
- Code-based lookup
- Calculated totalMinutes
- Proper caching (5 min)

---

## 4. Admin UI Design

### 4.1 Component Architecture

**File Structure**:
```
app/admin/services/
├── page.tsx                    # Main service management page
├── components/
│   ├── ServiceList.tsx         # Table view of services
│   ├── ServiceForm.tsx         # Create/Edit modal form
│   ├── ServiceCard.tsx         # Card view (alternative layout)
│   ├── DeleteConfirmDialog.tsx # Deletion confirmation
│   └── ServiceFilters.tsx      # Filter controls
└── types.ts                    # TypeScript interfaces
```

### 4.2 Main Page Layout (`/admin/services/page.tsx`)

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│  시술 관리                           [+ 새 시술 추가] │
├─────────────────────────────────────────────────────┤
│  🔍 Search  | 📁 Category  | 🎯 Status  | 🔄 Refresh│
├─────────────────────────────────────────────────────┤
│  시술명  │ 코드 │ 시간 │ 상태 │ 예약수 │ 작업      │
│─────────┼─────┼─────┼─────┼───────┼──────────│
│  보톡스  │ WRI │ 30분 │  ●  │   15   │ 편집 삭제 │
│  필러    │ VOL │ 40분 │  ●  │    8   │ 편집 삭제 │
│  레이저  │ LAS │ 60분 │  ○  │    0   │ 편집 삭제 │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Real-time search filtering
- Category dropdown filter
- Active/All status toggle
- Drag-and-drop reordering (future enhancement)
- Bulk actions (future enhancement)

### 4.3 Service Form Component

**Create/Edit Modal**:
```typescript
interface ServiceFormProps {
  mode: 'create' | 'edit';
  service?: Service;
  onSave: (data: ServiceInput) => Promise<void>;
  onCancel: () => void;
}

interface ServiceFormData {
  code: string;
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
  displayOrder: number;
}
```

**Form Fields**:
1. **Code** (text input)
   - Uppercase only
   - Underscore allowed
   - Read-only in edit mode
   - Validation: required, unique, pattern

2. **Name** (text input)
   - Korean/English allowed
   - Required
   - Max 100 characters

3. **Category** (select/combobox)
   - Predefined categories + custom
   - Optional
   - Examples: "피부과", "성형", "치료"

4. **Duration** (number input with slider)
   - Minutes input
   - Step: 10 minutes
   - Range: 10-480 minutes
   - Visual: Show as "X시간 Y분"
   - Real-time calculation preview

5. **Buffer Time** (number input)
   - Minutes input
   - Default: 10 minutes
   - Range: 0-60 minutes

6. **Total Time** (calculated display)
   - Read-only
   - durationMinutes + bufferMinutes
   - Format: "X시간 Y분"

7. **Active Status** (toggle switch)
   - Default: true for new services
   - Warning when deactivating

8. **Display Order** (number input)
   - Auto-assigned for new services
   - Manual adjustment allowed

**Real-time Calculations**:
```typescript
// Show impact preview
const currentLimit = service.service_reservation_limits?.dailyLimitMinutes;
if (currentLimit) {
  const oldMaxBookings = Math.floor(currentLimit / oldDuration);
  const newMaxBookings = Math.floor(currentLimit / newDuration);

  if (oldMaxBookings !== newMaxBookings) {
    showWarning({
      title: "예약 한도 변경 영향",
      message: `최대 예약 건수: ${oldMaxBookings}건 → ${newMaxBookings}건`,
      type: "info"
    });
  }
}
```

### 4.4 Service List Component

**Table Columns**:
```typescript
const columns = [
  {
    header: "시술명",
    accessor: "name",
    sortable: true,
    render: (service) => (
      <div>
        <div className="font-medium">{service.name}</div>
        {service.description && (
          <div className="text-xs text-gray-500">{service.description}</div>
        )}
      </div>
    )
  },
  {
    header: "코드",
    accessor: "code",
    sortable: true,
    render: (code) => (
      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{code}</code>
    )
  },
  {
    header: "시술시간",
    accessor: "durationMinutes",
    sortable: true,
    render: (service) => (
      <div>
        <div>{formatMinutes(service.durationMinutes)}</div>
        <div className="text-xs text-gray-500">
          +{service.bufferMinutes}분 준비
        </div>
      </div>
    )
  },
  {
    header: "일일한도",
    accessor: "service_reservation_limits",
    render: (service) => {
      const limit = service.service_reservation_limits;
      if (!limit || !limit.dailyLimitMinutes) return "-";
      const maxBookings = Math.floor(
        limit.dailyLimitMinutes / service.durationMinutes
      );
      return `${maxBookings}건 (${limit.dailyLimitMinutes}분)`;
    }
  },
  {
    header: "예약수",
    accessor: "_count.reservations",
    sortable: true,
    render: (count) => (
      <span className="text-blue-600 font-medium">{count}</span>
    )
  },
  {
    header: "상태",
    accessor: "isActive",
    render: (isActive) => (
      <Badge variant={isActive ? "success" : "secondary"}>
        {isActive ? "활성" : "비활성"}
      </Badge>
    )
  },
  {
    header: "작업",
    render: (service) => (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => handleEdit(service)}>
          편집
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleDelete(service)}
          disabled={service._count.reservations > 0}
        >
          삭제
        </Button>
      </div>
    )
  }
];
```

### 4.5 Delete Confirmation Dialog

**Safety Checks**:
```typescript
const canHardDelete =
  service._count.reservations === 0 &&
  !service.service_reservation_limits &&
  userRole === 'SUPER_ADMIN';

const deleteOptions = [
  {
    value: 'soft',
    label: '비활성화 (권장)',
    description: '시술을 숨기지만 데이터는 보존됩니다',
    safe: true
  },
  {
    value: 'hard',
    label: '완전 삭제',
    description: '시술 데이터를 완전히 제거합니다',
    safe: false,
    disabled: !canHardDelete,
    warning: canHardDelete
      ? "이 작업은 되돌릴 수 없습니다!"
      : "예약 기록이 있어 삭제할 수 없습니다"
  }
];
```

---

## 5. Cascade Effect Implementation

### 5.1 Duration Change Impact

**When `durationMinutes` changes**:
```typescript
// In PATCH /api/admin/services/[id]
async function handleDurationChange(
  serviceId: string,
  oldDuration: number,
  newDuration: number
) {
  // 1. Update service
  const updatedService = await prisma.services.update({
    where: { id: serviceId },
    data: { durationMinutes: newDuration }
  });

  // 2. Check if service has daily limits
  const limit = await prisma.service_reservation_limits.findUnique({
    where: { serviceId }
  });

  if (limit && limit.dailyLimitMinutes) {
    const oldMaxBookings = Math.floor(limit.dailyLimitMinutes / oldDuration);
    const newMaxBookings = Math.floor(limit.dailyLimitMinutes / newDuration);

    // 3. Log cascade effect
    await prisma.admin_action_log.create({
      data: {
        action: 'SERVICE_DURATION_CHANGED',
        serviceId,
        metadata: {
          oldDuration,
          newDuration,
          oldMaxBookings,
          newMaxBookings,
          affectedLimit: limit.id
        },
        performedBy: userId
      }
    });

    // 4. Trigger recalculation for affected dates
    // (Optional: check if any dates exceed new max bookings)
    const affectedDates = await checkReservationConflicts(
      serviceId,
      newMaxBookings
    );

    return {
      success: true,
      cascadeEffects: {
        maxBookingsChanged: {
          before: oldMaxBookings,
          after: newMaxBookings
        },
        affectedDates: affectedDates.length
      }
    };
  }

  return { success: true };
}
```

### 5.2 Reservation System Integration

**Time Slot Calculation** (in `/api/public/reservations/time-slots`):
```typescript
// Already correctly implemented - uses service.durationMinutes
const service = await prisma.services.findUnique({
  where: { code: serviceCode },
  select: { durationMinutes: true, bufferMinutes: true }
});

const totalMinutes = service.durationMinutes + service.bufferMinutes;
// All calculations use up-to-date durationMinutes
```

**No changes needed** - reservation system already queries services dynamically!

---

## 6. Implementation Roadmap

### Phase 5.1: Backend API Layer (1.5 hours)

**Tasks**:
1. **Create admin API routes** ✓ 30 min
   - `app/api/admin/services/route.ts` (GET, POST)
   - `app/api/admin/services/[id]/route.ts` (PATCH, DELETE)
   - `app/api/admin/services/reorder/route.ts` (PUT)

2. **Implement authentication middleware** ✓ 15 min
   - JWT verification (reuse existing pattern)
   - Role-based access control (ADMIN/SUPER_ADMIN)

3. **Add validation logic** ✓ 20 min
   - Input validation with Zod
   - Business rule enforcement
   - Error handling

4. **Test API endpoints** ✓ 25 min
   - Postman/REST Client testing
   - Edge case validation
   - Error response verification

**Deliverables**:
- ✅ GET `/api/admin/services` - List with filters
- ✅ POST `/api/admin/services` - Create service
- ✅ PATCH `/api/admin/services/[id]` - Update service
- ✅ DELETE `/api/admin/services/[id]` - Soft/hard delete
- ✅ PUT `/api/admin/services/reorder` - Reorder display

### Phase 5.2: Admin UI Components (1.5-2 hours)

**Tasks**:
1. **Create page structure** ✓ 20 min
   - `/app/admin/services/page.tsx`
   - Layout with header and actions
   - Integration with existing admin shell

2. **Build ServiceList component** ✓ 30 min
   - Table with shadcn/ui
   - Column definitions
   - Sorting and filtering
   - Action buttons

3. **Build ServiceForm component** ✓ 40 min
   - Modal dialog with shadcn/ui
   - Form fields with validation
   - Real-time calculations
   - Submit handling

4. **Build DeleteConfirmDialog** ✓ 15 min
   - Safety checks
   - Soft vs hard delete options
   - Warning messages

5. **Add state management** ✓ 15 min
   - React state for CRUD operations
   - Optimistic updates
   - Error handling
   - Success notifications

**Deliverables**:
- ✅ Complete service management UI
- ✅ Create/Edit/Delete functionality
- ✅ Real-time impact preview
- ✅ Responsive design

### Phase 5.3: Integration & Testing (1 hour)

**Tasks**:
1. **Add navigation link** ✓ 5 min
   - Update admin sidebar
   - Add "시술 관리" menu item

2. **Integration testing** ✓ 30 min
   - Create new service → verify in public API
   - Edit duration → check cascade effects
   - Delete service → verify constraints
   - Test with service limits UI

3. **User acceptance testing** ✓ 15 min
   - Walk through all workflows
   - Verify error messages
   - Check responsive design
   - Confirm accessibility

4. **Documentation** ✓ 10 min
   - API documentation
   - User guide screenshots
   - Admin workflow guide

**Deliverables**:
- ✅ Fully functional service management
- ✅ Integration with existing features
- ✅ Test coverage
- ✅ Documentation

### Phase 5.4: Deployment (30 min)

**Tasks**:
1. **Build and test** ✓ 10 min
   - `npm run build`
   - Check for TypeScript errors
   - Verify build artifacts

2. **Database backup** ✓ 5 min
   - Backup production database
   - Document rollback procedure

3. **Deploy to production** ✓ 10 min
   - rsync to server
   - PM2 restart
   - Verify deployment

4. **Post-deployment validation** ✓ 5 min
   - Test all CRUD operations
   - Verify cascade effects
   - Check public API still works

**Deliverables**:
- ✅ Production deployment
- ✅ Rollback plan ready
- ✅ Monitoring in place

---

## 7. Technical Specifications

### 7.1 TypeScript Interfaces

```typescript
// app/admin/services/types.ts

export interface Service {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;

  // Computed
  totalMinutes: number;

  // Relations
  _count?: {
    reservations: number;
    clinic_time_slots: number;
    manual_time_closures: number;
  };
  service_reservation_limits?: {
    id: string;
    dailyLimitMinutes: number | null;
    isActive: boolean;
  } | null;
}

export interface ServiceInput {
  code: string;
  name: string;
  description?: string;
  category?: string;
  durationMinutes: number;
  bufferMinutes?: number;
  isActive?: boolean;
  displayOrder?: number;
}

export interface ServiceUpdateInput {
  name?: string;
  description?: string;
  category?: string;
  durationMinutes?: number;
  bufferMinutes?: number;
  isActive?: boolean;
  displayOrder?: number;
}

export interface ServiceFilters {
  active?: boolean;
  category?: string;
  search?: string;
  sortBy?: 'name' | 'displayOrder' | 'createdAt' | 'durationMinutes';
  sortOrder?: 'asc' | 'desc';
}

export interface CascadeEffects {
  maxBookingsChanged?: {
    before: number;
    after: number;
  };
  affectedDates?: number;
  warnings?: string[];
}
```

### 7.2 Validation Schema (Zod)

```typescript
import { z } from 'zod';

export const ServiceCreateSchema = z.object({
  code: z.string()
    .min(2, "코드는 최소 2자 이상이어야 합니다")
    .max(50, "코드는 최대 50자까지 가능합니다")
    .regex(/^[A-Z_]+$/, "코드는 대문자와 언더스코어만 사용 가능합니다"),

  name: z.string()
    .min(2, "시술명은 최소 2자 이상이어야 합니다")
    .max(100, "시술명은 최대 100자까지 가능합니다"),

  description: z.string().max(500).optional(),

  category: z.string().max(50).optional(),

  durationMinutes: z.number()
    .int("시술 시간은 정수여야 합니다")
    .min(10, "최소 시술 시간은 10분입니다")
    .max(480, "최대 시술 시간은 8시간(480분)입니다"),

  bufferMinutes: z.number()
    .int("준비 시간은 정수여야 합니다")
    .min(0, "준비 시간은 0분 이상이어야 합니다")
    .max(60, "준비 시간은 최대 60분까지 가능합니다")
    .default(10),

  isActive: z.boolean().default(true),

  displayOrder: z.number().int().min(0).optional()
});

export const ServiceUpdateSchema = ServiceCreateSchema
  .omit({ code: true })  // Code cannot be changed
  .partial();            // All fields optional

export type ServiceCreateInput = z.infer<typeof ServiceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof ServiceUpdateSchema>;
```

### 7.3 API Response Types

```typescript
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string;
  timestamp: string;
}

export interface ServiceListResponse extends ApiResponse<Service[]> {
  count: number;
}

export interface ServiceMutationResponse extends ApiResponse<Service> {
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  cascadeEffects?: CascadeEffects;
}
```

---

## 8. Security Considerations

### 8.1 Authentication & Authorization

**Requirements**:
- All admin endpoints require JWT authentication
- Role-based access control:
  - `EDITOR`: Read-only access
  - `ADMIN`: Full CRUD except hard delete
  - `SUPER_ADMIN`: All operations including hard delete

**Implementation**:
```typescript
// Middleware pattern (reuse from existing admin APIs)
function requireAuth(requiredRole: UserRole = 'ADMIN') {
  return async (request: NextRequest) => {
    const user = verifyToken(request);

    if (!user) {
      throw new UnauthorizedError();
    }

    if (!hasRole(user.role, requiredRole)) {
      throw new ForbiddenError();
    }

    return user;
  };
}

// Usage in DELETE endpoint
export async function DELETE(request: NextRequest) {
  const user = await requireAuth('SUPER_ADMIN')(request);
  // ... deletion logic
}
```

### 8.2 Input Validation

**Server-side validation is mandatory**:
- Never trust client input
- Validate with Zod schemas
- Sanitize strings to prevent SQL injection
- Enforce business rules at API layer

### 8.3 Audit Logging

**Track all service changes**:
```typescript
interface AdminActionLog {
  id: string;
  action: 'SERVICE_CREATED' | 'SERVICE_UPDATED' | 'SERVICE_DELETED' | 'SERVICE_DURATION_CHANGED';
  resourceType: 'SERVICE';
  resourceId: string;
  performedBy: string;
  performedAt: Date;
  metadata: {
    changes?: any;
    cascadeEffects?: any;
    reason?: string;
  };
}

// Log every mutation
await logAdminAction({
  action: 'SERVICE_UPDATED',
  resourceType: 'SERVICE',
  resourceId: serviceId,
  performedBy: user.email,
  metadata: {
    changes: { durationMinutes: { from: 30, to: 40 } },
    cascadeEffects: { maxBookingsChanged: { before: 8, after: 6 } }
  }
});
```

---

## 9. Error Handling Strategy

### 9.1 Client-Side Error Handling

```typescript
async function createService(data: ServiceInput) {
  try {
    const response = await fetch('/api/admin/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle specific error codes
      switch (response.status) {
        case 400:
          toast.error("입력값을 확인해주세요", {
            description: result.details
          });
          break;
        case 401:
          router.push('/login');
          break;
        case 409:
          toast.error("이미 존재하는 시술 코드입니다");
          break;
        default:
          toast.error("시술 생성에 실패했습니다");
      }
      return null;
    }

    toast.success("시술이 생성되었습니다");
    return result.data;

  } catch (error) {
    console.error('Service creation error:', error);
    toast.error("네트워크 오류가 발생했습니다");
    return null;
  }
}
```

### 9.2 Server-Side Error Handling

```typescript
// Centralized error handler
class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: string
  ) {
    super(message);
  }
}

function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.details
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle Prisma errors
    switch (error.code) {
      case 'P2002': // Unique constraint
        return NextResponse.json(
          { success: false, error: 'Duplicate entry' },
          { status: 409 }
        );
      case 'P2025': // Record not found
        return NextResponse.json(
          { success: false, error: 'Service not found' },
          { status: 404 }
        );
    }
  }

  // Generic error
  console.error('Unexpected error:', error);
  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  );
}
```

---

## 10. Testing Strategy

### 10.1 API Testing Checklist

**GET /api/admin/services**:
- ✓ Returns all services for authenticated user
- ✓ Filters by active status work
- ✓ Category filtering works
- ✓ Search functionality works
- ✓ Sorting works for all columns
- ✓ Returns 401 without auth
- ✓ Includes relation counts
- ✓ Response format matches specification

**POST /api/admin/services**:
- ✓ Creates service with valid data
- ✓ Rejects invalid code format
- ✓ Rejects duplicate code (409)
- ✓ Validates duration constraints
- ✓ Auto-assigns display order
- ✓ Returns 401 without auth
- ✓ Returns 403 for EDITOR role
- ✓ Creates with default bufferMinutes

**PATCH /api/admin/services/[id]**:
- ✓ Updates service properties
- ✓ Prevents code modification
- ✓ Calculates cascade effects for duration change
- ✓ Returns change summary
- ✓ Validates all constraints
- ✓ Returns 404 for non-existent service
- ✓ Returns 401 without auth

**DELETE /api/admin/services/[id]**:
- ✓ Soft deletes by default
- ✓ Hard delete only for SUPER_ADMIN
- ✓ Prevents deletion with active reservations
- ✓ Returns appropriate error messages
- ✓ Returns 404 for non-existent service

### 10.2 UI Testing Checklist

**Service List**:
- ✓ Displays all services correctly
- ✓ Shows reservation counts
- ✓ Shows daily limits
- ✓ Filters work correctly
- ✓ Sort works for all columns
- ✓ Action buttons enabled/disabled correctly

**Service Form**:
- ✓ Validates all fields
- ✓ Shows real-time duration calculations
- ✓ Displays cascade effect warnings
- ✓ Code field read-only in edit mode
- ✓ Submit button disabled during save
- ✓ Success/error messages display

**Delete Confirmation**:
- ✓ Shows correct warning based on dependencies
- ✓ Hard delete disabled when has reservations
- ✓ Confirms before deletion
- ✓ Shows appropriate error messages

### 10.3 Integration Testing

**Cascade Effect Verification**:
1. Create service with 30min duration
2. Create service limit with 240min daily limit
3. Verify max bookings = 8
4. Edit duration to 40min
5. Verify max bookings recalculated to 6
6. Check ServiceLimitSettings UI reflects change

**Reservation System Integration**:
1. Create new service via admin UI
2. Verify appears in public API immediately
3. Verify available in reservation time slot API
4. Make test reservation
5. Edit service duration
6. Verify time slots recalculated

---

## 11. Performance Optimization

### 11.1 Database Query Optimization

**Indexing Strategy** (already in schema):
```prisma
model services {
  @@index([category])
  @@index([isActive, displayOrder])
}
```

**Query Optimization**:
```typescript
// Use select to limit fields
const services = await prisma.services.findMany({
  select: {
    id: true,
    code: true,
    name: true,
    // ... only needed fields
  }
});

// Use include sparingly
const service = await prisma.services.findUnique({
  where: { id },
  include: {
    _count: {
      select: {
        reservations: true,
        clinic_time_slots: true
      }
    },
    service_reservation_limits: {
      select: {
        dailyLimitMinutes: true,
        isActive: true
      }
    }
  }
});
```

### 11.2 Caching Strategy

**Public API** (already implemented):
```typescript
// Cache services for 5 minutes
headers: {
  'Cache-Control': 'public, max-age=300, s-maxage=300'
}
```

**Admin API** (no caching):
- Always fetch fresh data
- Use optimistic updates for better UX

### 11.3 Client-Side Optimization

**React Optimization**:
```typescript
// Memoize expensive calculations
const maxBookings = useMemo(() => {
  if (!limit?.dailyLimitMinutes) return 0;
  return Math.floor(limit.dailyLimitMinutes / service.durationMinutes);
}, [limit, service.durationMinutes]);

// Debounce search input
const debouncedSearch = useDebouncedValue(searchTerm, 300);
```

---

## 12. User Experience Enhancements

### 12.1 Real-time Feedback

**Duration Change Impact**:
```tsx
<div className="bg-blue-50 border border-blue-200 rounded-md p-3">
  <div className="flex items-start gap-2">
    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
    <div>
      <p className="font-medium text-blue-900">예약 한도 변경 예상</p>
      <p className="text-sm text-blue-700 mt-1">
        현재: 하루 최대 {oldMaxBookings}건 예약 가능<br/>
        변경 후: 하루 최대 {newMaxBookings}건 예약 가능
      </p>
    </div>
  </div>
</div>
```

### 12.2 Progressive Disclosure

**Advanced Options** (collapsed by default):
- Display order management
- Buffer time customization
- Category assignment

**Basic Form** (always visible):
- Service name
- Duration
- Active status

### 12.3 Accessibility

**ARIA Labels**:
```tsx
<Button
  aria-label={`Edit ${service.name}`}
  onClick={() => handleEdit(service)}
>
  편집
</Button>

<Input
  aria-describedby="duration-help"
  aria-invalid={errors.durationMinutes ? "true" : "false"}
/>
<p id="duration-help" className="text-sm text-gray-600">
  최소 10분, 최대 480분 (8시간)
</p>
```

**Keyboard Navigation**:
- All actions accessible via keyboard
- Logical tab order
- Escape key closes modals

---

## 13. Success Metrics

### 13.1 Technical Metrics

- **API Response Time**: < 200ms for GET, < 500ms for mutations
- **Build Size Impact**: < 50KB additional bundle size
- **Database Query Count**: < 3 queries per list view
- **Type Safety**: 100% TypeScript coverage

### 13.2 Business Metrics

- **Admin Efficiency**: Service creation time < 30 seconds
- **Error Rate**: < 1% failed operations
- **User Satisfaction**: Positive feedback on cascade warnings
- **Adoption**: 100% of service changes via UI (no SQL needed)

---

## 14. Future Enhancements (Post-MVP)

### 14.1 Phase 5+ Enhancements

**Drag-and-Drop Reordering**:
- Visual reordering of services
- Drag handle for display order
- Auto-save on drop

**Bulk Operations**:
- Multi-select services
- Bulk activate/deactivate
- Bulk category assignment

**Service Templates**:
- Common service presets
- Quick creation from template
- Template management

**Advanced Analytics**:
- Service utilization reports
- Revenue by service
- Popular time slots by service

**Service Packages**:
- Bundle multiple services
- Package pricing
- Combo scheduling

### 14.2 Integration Opportunities

**Calendar Integration**:
- Block service-specific time slots
- Service-based calendar views
- Availability visualization

**Staff Assignment**:
- Assign staff to services
- Skill-based routing
- Workload balancing

**Resource Management**:
- Equipment requirements
- Room assignments
- Supply tracking

---

## 15. Rollout Plan

### 15.1 Soft Launch (Internal Testing)

**Week 1**:
- Deploy to staging
- Internal team testing
- Gather feedback
- Fix critical bugs

### 15.2 Beta Release

**Week 2**:
- Deploy to production
- Monitor closely
- Limited announcements
- Quick iteration

### 15.3 Full Release

**Week 3+**:
- Full documentation
- User training
- Performance monitoring
- Continuous improvement

---

## 16. Risk Assessment & Mitigation

### 16.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Database migration issues | Low | High | Test migrations thoroughly, backup data |
| API performance degradation | Medium | Medium | Implement caching, optimize queries |
| Frontend bundle size increase | Low | Low | Code splitting, lazy loading |
| Type safety gaps | Low | Medium | 100% TypeScript coverage, strict mode |

### 16.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| User confusion with cascade effects | Medium | Medium | Clear warnings, preview calculations |
| Accidental service deletion | Low | High | Confirmation dialogs, soft delete default |
| Data inconsistency | Low | High | Transaction-safe updates, validation |
| Adoption resistance | Low | Medium | Clear documentation, training |

---

## 17. Conclusion

This comprehensive design document provides a complete blueprint for implementing the Service Management System (Phase 5). The system is architected to:

✅ **Solve the core problem**: Administrators can now manage services without SQL access
✅ **Enable cascade effects**: Duration changes automatically affect reservation capacity
✅ **Maintain data integrity**: Strong validation and soft-delete patterns
✅ **Scale gracefully**: Optimized queries and caching strategies
✅ **Provide excellent UX**: Real-time feedback and safety warnings

**Total Estimated Time**: 4-5 hours
**Priority**: HIGHEST - Blocks other admin development
**Development Approach**: Admin-first → API → Public → Testing

Ready to proceed with implementation! 🚀
