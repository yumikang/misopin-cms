# Next.js 15 & Prisma Implementation Best Practices

**Generated**: 2025-11-05
**Project**: misopin-cms
**Context**: Next.js 15.5.3, Prisma ORM, TypeScript API routes

---

## Table of Contents
1. [Next.js 15 API Route POST Handlers](#nextjs-15-api-route-post-handlers)
2. [Prisma Foreign Key Queries & Relations](#prisma-foreign-key-queries--relations)
3. [TypeScript Error Handling Patterns](#typescript-error-handling-patterns)
4. [JavaScript Dynamic Select Cascading](#javascript-dynamic-select-cascading)
5. [CORS & OPTIONS Method Handling](#cors--options-method-handling)
6. [Transaction Handling](#transaction-handling)

---

## Next.js 15 API Route POST Handlers

### Current Project Pattern (From `/api/public/reservations/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();

    // 2. Validate required fields
    const requiredFields = ['field1', 'field2', 'field3'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          fields: missingFields
        },
        { status: 400 }
      );
    }

    // 3. Business logic with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Transaction operations
      return await tx.model.create({ data: {...} });
    });

    // 4. Success response with CORS headers
    return NextResponse.json(
      { success: true, data: result },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );

  } catch (error) {
    console.error('API Error:', error);

    // Handle specific errors
    if (error instanceof Error && error.message === 'CUSTOM_ERROR_CODE') {
      return NextResponse.json(
        { error: 'Specific error', message: 'User-friendly message' },
        { status: 409 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

### Best Practices (2025)

#### 1. **Input Validation with Zod** (Industry Standard)
```typescript
import { z } from 'zod';

const ReservationSchema = z.object({
  patient_name: z.string().min(2).max(100),
  phone: z.string().regex(/^010-?\d{4}-?\d{4}$/),
  email: z.string().email().optional(),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  service: z.enum(['WRINKLE_BOTOX', 'VOLUME_LIFTING', ...]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validationResult = ReservationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    // Proceed with validated data...
  } catch (error) {
    // Error handling...
  }
}
```

**Benefits**:
- Type safety at runtime
- Automatic validation messages
- Prevents code injection attacks
- Self-documenting API contracts

#### 2. **Structured Error Classes**
```typescript
// lib/api-errors.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public metadata?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, fields?: string[]) {
    super(400, 'VALIDATION_ERROR', message, { fields });
  }
}

export class ResourceNotFoundError extends ApiError {
  constructor(resource: string, id: string) {
    super(404, 'NOT_FOUND', `${resource} with id ${id} not found`, { resource, id });
  }
}

// Usage in route
import { ApiError, ValidationError } from '@/lib/api-errors';

export async function POST(request: NextRequest) {
  try {
    // Business logic
    if (!service) {
      throw new ResourceNotFoundError('Service', serviceId);
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
          ...(error.metadata && { metadata: error.metadata })
        },
        { status: error.statusCode }
      );
    }

    // Fallback for unexpected errors
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
```

#### 3. **Rate Limiting** (Production Essential)
```typescript
// lib/rate-limiter.ts
import { headers } from 'next/headers';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export async function checkRateLimit(identifier: string, limit: number = 5, windowMs: number = 60000) {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

// Usage in route
export async function POST(request: NextRequest) {
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown';

  const rateLimit = await checkRateLimit(ip, 5, 60000); // 5 requests per minute

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateLimit.resetTime },
      { status: 429 }
    );
  }

  // Continue with request...
}
```

---

## Prisma Foreign Key Queries & Relations

### Your Schema Pattern (reservations → services)
```prisma
model reservations {
  id            String    @id
  serviceId     String?
  serviceName   String?
  // ... other fields

  // Foreign Key Relation
  serviceRecord services? @relation(fields: [serviceId], references: [id], onDelete: SetNull)

  @@index([serviceId])
}

model services {
  id              String    @id
  code            String    @unique
  name            String
  durationMinutes Int
  // ... other fields

  reservations reservations[]
}
```

### Best Practices for Querying Related Data

#### 1. **Using `include` for Related Records**
```typescript
// Fetch reservation with service details
const reservation = await prisma.reservations.findUnique({
  where: { id: reservationId },
  include: {
    serviceRecord: true  // Includes full service object
  }
});

// Result type (automatically inferred):
// {
//   id: string,
//   serviceId: string,
//   serviceName: string,
//   serviceRecord: {
//     id: string,
//     code: string,
//     name: string,
//     durationMinutes: number,
//     ...
//   }
// }
```

#### 2. **Using `select` for Specific Fields** (Performance Optimization)
```typescript
// Only fetch needed fields
const reservation = await prisma.reservations.findUnique({
  where: { id: reservationId },
  select: {
    id: true,
    patientName: true,
    preferredDate: true,
    serviceRecord: {
      select: {
        name: true,
        durationMinutes: true
      }
    }
  }
});

// Result: Only selected fields, smaller payload
```

#### 3. **Querying by Related Table Fields**
```typescript
// Find all reservations for a specific service
const reservations = await prisma.reservations.findMany({
  where: {
    serviceRecord: {
      code: 'WRINKLE_BOTOX'  // Query by related table field
    },
    preferredDate: {
      gte: new Date('2025-11-01'),
      lt: new Date('2025-12-01')
    }
  },
  include: {
    serviceRecord: true
  }
});
```

#### 4. **Nested Writes (Creating Records with Relations)**
```typescript
// Create reservation with existing service (connect)
const reservation = await prisma.reservations.create({
  data: {
    id: crypto.randomUUID(),
    patientName: 'John Doe',
    phone: '010-1234-5678',
    // ... other fields

    // Connect to existing service by ID
    serviceRecord: {
      connect: { id: serviceId }
    }
  },
  include: {
    serviceRecord: true
  }
});

// Or connect by unique field (code)
const reservation2 = await prisma.reservations.create({
  data: {
    // ... fields
    serviceRecord: {
      connect: { code: 'WRINKLE_BOTOX' }
    }
  }
});
```

#### 5. **Load Strategy Control** (Performance Optimization - Prisma 5.8+)
```typescript
// Use JOIN strategy (single query)
const reservations = await prisma.reservations.findMany({
  where: { preferredDate: today },
  include: {
    serviceRecord: true
  },
  relationLoadStrategy: 'join'  // PostgreSQL: single query with JOIN
});

// Use query strategy (separate queries)
const reservations2 = await prisma.reservations.findMany({
  where: { preferredDate: today },
  include: {
    serviceRecord: true
  },
  relationLoadStrategy: 'query'  // Multiple queries
});
```

**When to use each**:
- **join**: Few records with many relations (faster)
- **query**: Many records with few relations (less memory)

---

## TypeScript Error Handling Patterns

### Current Project Pattern
```typescript
// From time-slots/route.ts
export async function GET(request: NextRequest) {
  try {
    // Business logic
    const result = await calculateAvailableTimeSlots(serviceCode, dateString, debug);

    return NextResponse.json({ success: true, ...result });

  } catch (error) {
    console.error('Error calculating time slots:', error);

    // Handle custom error class
    if (error instanceof ReservationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: error.message,
          ...(error.metadata && { metadata: error.metadata })
        },
        { status: error.code === 'SERVICE_NOT_FOUND' ? 404 : 400 }
      );
    }

    // Generic error fallback
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
```

### Best Practices

#### 1. **Global Error Handler Middleware**
```typescript
// lib/api-middleware.ts
type Handler = (req: NextRequest, res?: NextResponse) => Promise<NextResponse>;

export function withErrorHandling(...handlers: Handler[]) {
  return async (req: NextRequest) => {
    try {
      for (const handler of handlers) {
        const response = await handler(req);
        if (response) return response;
      }

      throw new Error('No handler returned a response');

    } catch (error) {
      console.error('[API Error]', {
        path: req.nextUrl.pathname,
        method: req.method,
        error: error instanceof Error ? error.message : error
      });

      if (error instanceof ApiError) {
        return NextResponse.json(
          {
            error: error.code,
            message: error.message,
            ...(error.metadata && { metadata: error.metadata })
          },
          {
            status: error.statusCode,
            headers: {
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }

      // Don't expose internal errors in production
      const isDev = process.env.NODE_ENV === 'development';

      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          ...(isDev && { details: error instanceof Error ? error.message : String(error) })
        },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  };
}

// Usage in route
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();

  // Business logic - throw ApiError instances
  if (!body.serviceId) {
    throw new ValidationError('serviceId is required', ['serviceId']);
  }

  const result = await prisma.reservations.create({ data: body });

  return NextResponse.json({ success: true, data: result });
});
```

#### 2. **Type-Safe Error Responses**
```typescript
// lib/api-response.ts
export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ApiError = {
  success: false;
  error: string;
  message: string;
  details?: any;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Helper functions
export function successResponse<T>(data: T, message?: string): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(message && { message })
  });
}

export function errorResponse(
  error: string,
  message: string,
  status: number = 400,
  details?: any
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error,
      message,
      ...(details && { details })
    },
    { status }
  );
}

// Usage
export async function POST(request: NextRequest) {
  try {
    const result = await createReservation(data);
    return successResponse(result, 'Reservation created successfully');
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse('VALIDATION_ERROR', error.message, 400, error.metadata);
    }
    return errorResponse('INTERNAL_ERROR', 'An error occurred', 500);
  }
}
```

---

## JavaScript Dynamic Select Cascading

### Your Use Case: Date → Service → Time Slots

```html
<!-- calendar-page.html -->
<div class="form-group">
  <label for="preferred-date">예약 날짜</label>
  <input type="date" id="preferred-date" name="preferred_date" required>
</div>

<div class="form-group">
  <label for="service-select">서비스 선택</label>
  <select id="service-select" name="service" disabled required>
    <option value="">날짜를 먼저 선택하세요</option>
  </select>
</div>

<div class="form-group">
  <label for="time-slot-select">예약 시간</label>
  <select id="time-slot-select" name="preferred_time" disabled required>
    <option value="">서비스를 먼저 선택하세요</option>
  </select>
</div>

<div id="loading-indicator" style="display: none;">
  <span class="spinner"></span> Loading...
</div>
```

### Best Practices Implementation

```javascript
// calendar-form.js - Modern Cascading Select Pattern

class ReservationForm {
  constructor() {
    this.dateInput = document.getElementById('preferred-date');
    this.serviceSelect = document.getElementById('service-select');
    this.timeSlotSelect = document.getElementById('time-slot-select');
    this.loadingIndicator = document.getElementById('loading-indicator');

    this.initEventListeners();
  }

  initEventListeners() {
    // Date change → Load services
    this.dateInput.addEventListener('change', async (e) => {
      await this.handleDateChange(e.target.value);
    });

    // Service change → Load time slots
    this.serviceSelect.addEventListener('change', async (e) => {
      await this.handleServiceChange(e.target.value);
    });
  }

  async handleDateChange(dateValue) {
    if (!dateValue) {
      this.resetServiceSelect();
      this.resetTimeSlotSelect();
      return;
    }

    try {
      this.showLoading();

      // Fetch available services for selected date
      const response = await fetch(`/api/public/services?date=${dateValue}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to load services');
      }

      this.populateServices(data.services);
      this.enableServiceSelect();

    } catch (error) {
      console.error('Error loading services:', error);
      this.showError('서비스 목록을 불러오는데 실패했습니다. 다시 시도해주세요.');
      this.resetServiceSelect();

    } finally {
      this.hideLoading();
    }
  }

  async handleServiceChange(serviceCode) {
    if (!serviceCode) {
      this.resetTimeSlotSelect();
      return;
    }

    const dateValue = this.dateInput.value;
    if (!dateValue) return;

    try {
      this.showLoading();

      // Fetch available time slots
      const response = await fetch(
        `/api/public/reservations/time-slots?service=${serviceCode}&date=${dateValue}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to load time slots');
      }

      this.populateTimeSlots(data.slots);
      this.enableTimeSlotSelect();

    } catch (error) {
      console.error('Error loading time slots:', error);
      this.showError('예약 시간을 불러오는데 실패했습니다. 다시 시도해주세요.');
      this.resetTimeSlotSelect();

    } finally {
      this.hideLoading();
    }
  }

  populateServices(services) {
    // Clear existing options
    this.serviceSelect.innerHTML = '<option value="">서비스를 선택하세요</option>';

    // Add service options
    services.forEach(service => {
      const option = document.createElement('option');
      option.value = service.code;
      option.textContent = `${service.name} (${service.durationMinutes}분)`;
      option.dataset.duration = service.durationMinutes;
      this.serviceSelect.appendChild(option);
    });
  }

  populateTimeSlots(slots) {
    // Clear existing options
    this.timeSlotSelect.innerHTML = '<option value="">시간을 선택하세요</option>';

    // Group slots by period
    const morningSlots = slots.filter(s => s.period === 'MORNING');
    const afternoonSlots = slots.filter(s => s.period === 'AFTERNOON');

    // Add morning slots
    if (morningSlots.length > 0) {
      const morningGroup = document.createElement('optgroup');
      morningGroup.label = '오전';
      morningSlots.forEach(slot => {
        if (slot.available) {
          const option = document.createElement('option');
          option.value = slot.time;
          option.textContent = `${slot.time} ${slot.status === 'limited' ? '(잔여 적음)' : ''}`;
          option.disabled = !slot.available;
          morningGroup.appendChild(option);
        }
      });
      this.timeSlotSelect.appendChild(morningGroup);
    }

    // Add afternoon slots
    if (afternoonSlots.length > 0) {
      const afternoonGroup = document.createElement('optgroup');
      afternoonGroup.label = '오후';
      afternoonSlots.forEach(slot => {
        if (slot.available) {
          const option = document.createElement('option');
          option.value = slot.time;
          option.textContent = `${slot.time} ${slot.status === 'limited' ? '(잔여 적음)' : ''}`;
          option.disabled = !slot.available;
          afternoonGroup.appendChild(option);
        }
      });
      this.timeSlotSelect.appendChild(afternoonGroup);
    }

    // Show message if no slots available
    if (morningSlots.length === 0 && afternoonSlots.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '예약 가능한 시간이 없습니다';
      option.disabled = true;
      this.timeSlotSelect.appendChild(option);
    }
  }

  // UI State Management
  enableServiceSelect() {
    this.serviceSelect.disabled = false;
  }

  enableTimeSlotSelect() {
    this.timeSlotSelect.disabled = false;
  }

  resetServiceSelect() {
    this.serviceSelect.innerHTML = '<option value="">날짜를 먼저 선택하세요</option>';
    this.serviceSelect.disabled = true;
    this.resetTimeSlotSelect();
  }

  resetTimeSlotSelect() {
    this.timeSlotSelect.innerHTML = '<option value="">서비스를 먼저 선택하세요</option>';
    this.timeSlotSelect.disabled = true;
  }

  showLoading() {
    this.loadingIndicator.style.display = 'block';
  }

  hideLoading() {
    this.loadingIndicator.style.display = 'none';
  }

  showError(message) {
    // You could implement a toast notification here
    alert(message);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ReservationForm();
});
```

### Advanced Pattern: Debouncing & Caching

```javascript
// lib/utils.js
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export class ApiCache {
  constructor(ttl = 60000) { // 1 minute default
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }

  clear() {
    this.cache.clear();
  }
}

// Enhanced ReservationForm with caching
class ReservationFormWithCache extends ReservationForm {
  constructor() {
    super();
    this.cache = new ApiCache(60000); // 1 minute cache

    // Debounce date changes
    this.handleDateChange = debounce(this.handleDateChange.bind(this), 300);
  }

  async handleDateChange(dateValue) {
    if (!dateValue) {
      this.resetServiceSelect();
      this.resetTimeSlotSelect();
      return;
    }

    // Check cache first
    const cacheKey = `services-${dateValue}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      this.populateServices(cached);
      this.enableServiceSelect();
      return;
    }

    // Fetch from API
    try {
      this.showLoading();
      const response = await fetch(`/api/public/services?date=${dateValue}`);
      const data = await response.json();

      if (data.success) {
        this.cache.set(cacheKey, data.services);
        this.populateServices(data.services);
        this.enableServiceSelect();
      }
    } catch (error) {
      this.showError('서비스 목록을 불러오는데 실패했습니다.');
    } finally {
      this.hideLoading();
    }
  }
}
```

---

## CORS & OPTIONS Method Handling

### Current Project Pattern
```typescript
// From time-slots/route.ts
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}

// In GET/POST handlers
return NextResponse.json(
  { success: true, data: result },
  {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  }
);
```

### Best Practice: Centralized CORS Helper

```typescript
// lib/cors.ts
export type CorsOptions = {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
};

const defaultCorsOptions: CorsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge: 86400,
};

export function getCorsHeaders(options: CorsOptions = {}): HeadersInit {
  const opts = { ...defaultCorsOptions, ...options };

  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': opts.methods!.join(', '),
    'Access-Control-Allow-Headers': opts.allowedHeaders!.join(', '),
    'Access-Control-Max-Age': String(opts.maxAge),
  };

  // Handle origin
  if (Array.isArray(opts.origin)) {
    // For multiple origins, set dynamically based on request
    headers['Access-Control-Allow-Origin'] = opts.origin[0];
  } else {
    headers['Access-Control-Allow-Origin'] = opts.origin!;
  }

  if (opts.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

export function corsResponse(
  data: any,
  status: number = 200,
  options: CorsOptions = {}
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: getCorsHeaders(options),
  });
}

export function corsOptionsHandler(options: CorsOptions = {}): NextResponse {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(options),
  });
}

// Usage in route
import { corsResponse, corsOptionsHandler } from '@/lib/cors';

export async function GET(request: NextRequest) {
  try {
    const result = await fetchData();
    return corsResponse({ success: true, data: result });
  } catch (error) {
    return corsResponse({ success: false, error: 'Error' }, 500);
  }
}

export async function OPTIONS() {
  return corsOptionsHandler({
    methods: ['GET', 'POST', 'OPTIONS'],
  });
}
```

### Environment-Based CORS Configuration

```typescript
// lib/cors-config.ts
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? [
      'https://misopin.com',
      'https://www.misopin.com',
      'https://admin.misopin.com',
    ]
  : ['http://localhost:3000', 'http://localhost:3001'];

export function validateOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin');

  if (!origin) return '*'; // No origin header (same-origin or non-browser)

  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }

  // Development: allow all localhost
  if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
    return origin;
  }

  return ALLOWED_ORIGINS[0]; // Fallback to first allowed origin
}

// Usage
export async function GET(request: NextRequest) {
  const allowedOrigin = validateOrigin(request);

  return NextResponse.json(
    { success: true, data: result },
    {
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    }
  );
}
```

---

## Transaction Handling

### Your Current Pattern (From `/api/public/reservations/route.ts`)

```typescript
const reservation = await prisma.$transaction(async (tx) => {
  // 1. Check availability with lock
  const canCreate = await canCreateReservation(tx, preferredDate, serviceType);

  if (!canCreate) {
    throw new Error('RESERVATION_FULL');
  }

  // 2. Create reservation
  const newReservation = await tx.reservations.create({
    data: {
      id: crypto.randomUUID(),
      patientName: body.patient_name,
      serviceId: serviceId,
      // ... other fields
    }
  });

  return newReservation;
});
```

### Best Practices

#### 1. **Nested Writes (Recommended for Simple Relations)**
```typescript
// Create reservation with service lookup - Prisma handles transaction automatically
const reservation = await prisma.reservations.create({
  data: {
    id: crypto.randomUUID(),
    patientName: body.patient_name,
    phone: body.phone,
    birthDate: new Date(body.birth_date),
    preferredDate: new Date(body.preferred_date),

    // Connect to existing service by unique field
    serviceRecord: {
      connect: { code: body.service_code }  // Prisma validates FK exists
    }
  },
  include: {
    serviceRecord: true  // Return with service data
  }
});

// Prisma automatically:
// - Validates service exists
// - Creates reservation with correct serviceId
// - Rolls back if service not found
```

**Benefits**:
- Automatic transaction handling
- Automatic FK validation
- Type-safe relations
- Single database round-trip

#### 2. **Interactive Transactions (Complex Logic)**
```typescript
// Complex business logic requiring multiple operations
const result = await prisma.$transaction(async (tx) => {
  // 1. Look up service to get duration
  const service = await tx.services.findUnique({
    where: { code: serviceCode },
    select: { id: true, name: true, durationMinutes: true }
  });

  if (!service) {
    throw new ResourceNotFoundError('Service', serviceCode);
  }

  // 2. Check time slot availability (with row lock)
  const existingReservations = await tx.reservations.findMany({
    where: {
      serviceId: service.id,
      preferredDate: reservationDate,
      timeSlotStart: timeSlot,
      status: { notIn: ['CANCELLED', 'REJECTED'] }
    }
  });

  if (existingReservations.length >= MAX_CONCURRENT) {
    throw new ApiError(409, 'TIME_SLOT_FULL', 'Time slot is full');
  }

  // 3. Create reservation
  const reservation = await tx.reservations.create({
    data: {
      id: crypto.randomUUID(),
      patientName: body.patient_name,
      serviceId: service.id,
      serviceName: service.name,
      estimatedDuration: service.durationMinutes,
      timeSlotStart: timeSlot,
      // ... other fields
    }
  });

  // 4. Update service usage counter
  await tx.services.update({
    where: { id: service.id },
    data: {
      usageCount: { increment: 1 }
    }
  });

  return reservation;
});
```

#### 3. **Transaction Isolation Levels**
```typescript
// For high-concurrency scenarios (time slot booking)
const reservation = await prisma.$transaction(
  async (tx) => {
    // Transaction logic
  },
  {
    isolationLevel: 'Serializable',  // Strongest isolation
    maxWait: 5000,  // Max time to wait for lock
    timeout: 10000  // Max transaction execution time
  }
);
```

**Isolation Levels**:
- `ReadUncommitted`: Lowest isolation (not recommended)
- `ReadCommitted`: Default for PostgreSQL
- `RepeatableRead`: Prevents non-repeatable reads
- `Serializable`: Highest isolation (use for critical operations)

#### 4. **Rollback Patterns**
```typescript
try {
  const result = await prisma.$transaction(async (tx) => {
    // Operation 1
    const user = await tx.users.create({ data: userData });

    // Operation 2 - depends on operation 1
    const profile = await tx.profiles.create({
      data: {
        userId: user.id,
        ...profileData
      }
    });

    // Business validation
    if (profile.age < 18) {
      // Throwing error automatically rolls back entire transaction
      throw new ValidationError('User must be 18 or older');
    }

    return { user, profile };
  });

  return corsResponse({ success: true, data: result });

} catch (error) {
  // Transaction was automatically rolled back
  if (error instanceof ValidationError) {
    return corsResponse({ success: false, error: error.message }, 400);
  }

  return corsResponse({ success: false, error: 'Transaction failed' }, 500);
}
```

#### 5. **Optimistic vs Pessimistic Locking**

**Optimistic Locking (Version Field)**:
```typescript
// Use version field to detect conflicts
const updated = await prisma.reservations.updateMany({
  where: {
    id: reservationId,
    version: currentVersion  // Only update if version matches
  },
  data: {
    status: 'CONFIRMED',
    version: { increment: 1 }
  }
});

if (updated.count === 0) {
  throw new ApiError(409, 'CONFLICT', 'Reservation was modified by another user');
}
```

**Pessimistic Locking (SELECT FOR UPDATE)**:
```typescript
// Lock row during transaction
const reservation = await prisma.$transaction(async (tx) => {
  // This locks the row until transaction completes
  const existing = await tx.$queryRaw`
    SELECT * FROM reservations
    WHERE id = ${reservationId}
    FOR UPDATE
  `;

  // Update reservation
  return await tx.reservations.update({
    where: { id: reservationId },
    data: { status: 'CONFIRMED' }
  });
});
```

---

## Quick Reference Checklist

### POST Handler Checklist
- [ ] Input validation with Zod
- [ ] TypeScript type safety for request/response
- [ ] Structured error handling with custom error classes
- [ ] Rate limiting for public endpoints
- [ ] CORS headers on all responses
- [ ] Logging for debugging (dev) and monitoring (prod)
- [ ] Transaction handling for multi-step operations
- [ ] Proper HTTP status codes (400, 401, 403, 404, 409, 500)

### Prisma Query Checklist
- [ ] Use `include` for related data (when all fields needed)
- [ ] Use `select` for specific fields (performance optimization)
- [ ] Proper indexes on foreign key columns
- [ ] Transaction for operations with dependencies
- [ ] Nested writes for simple create-with-relation
- [ ] Error handling for FK constraint violations

### Frontend Cascading Select Checklist
- [ ] Disable dependent selects until parent selected
- [ ] Loading states during API calls
- [ ] Error handling with user-friendly messages
- [ ] Reset child selects when parent changes
- [ ] Cache API responses (1-5 minutes)
- [ ] Debounce rapid changes (300ms)
- [ ] Accessible labels and ARIA attributes

### CORS Checklist
- [ ] OPTIONS handler for preflight requests
- [ ] CORS headers on all response types (success & error)
- [ ] Environment-based origin validation
- [ ] Max-Age header for OPTIONS caching
- [ ] Credentials handling (if cookies needed)

---

## Additional Resources

### Official Documentation
- [Next.js 15 Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Prisma Relation Queries](https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries)
- [Prisma Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [MDN: Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [CORS Specification](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

### TypeScript
- [Zod Documentation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Performance
- [Web Vitals](https://web.dev/vitals/)
- [Database Indexing Best Practices](https://use-the-index-luke.com/)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Maintainer**: Development Team
