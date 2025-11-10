# Time Slot Calculator - Quick Reference Guide

## TL;DR

```typescript
import { calculateAvailableTimeSlots, validateTimeSlotAvailability, cacheManager } from '@/lib/reservations/time-slot-calculator';

// Get available slots
const slots = await calculateAvailableTimeSlots('WRINKLE_BOTOX', '2025-11-04');

// Validate before booking
await validateTimeSlotAvailability('WRINKLE_BOTOX', '2025-11-04', '09:00', 'MORNING');

// Invalidate cache after changes
cacheManager.invalidate('2025-11-04');
```

## Common Use Cases

### 1. Display Available Time Slots

```typescript
const result = await calculateAvailableTimeSlots('WRINKLE_BOTOX', '2025-11-04');

// Filter only available slots
const available = result.slots.filter(slot => slot.available);

// Group by period
const morning = available.filter(s => s.period === 'MORNING');
const afternoon = available.filter(s => s.period === 'AFTERNOON');

// Display to user
morning.forEach(slot => {
  console.log(`${slot.time} - ${slot.remaining}분 남음`);
});
```

### 2. Create Reservation with Validation

```typescript
try {
  // Validate first
  await validateTimeSlotAvailability(
    serviceCode,
    date,
    time,
    period
  );

  // Create reservation
  const reservation = await prisma.reservation.create({
    data: { /* ... */ }
  });

  // Invalidate cache
  cacheManager.invalidate(date);

  return { success: true };

} catch (error) {
  if (error instanceof ReservationError && error.code === 'TIME_SLOT_FULL') {
    return {
      success: false,
      message: '시간대가 마감되었습니다',
      alternatives: error.metadata?.suggestedTimes,
    };
  }
  throw error;
}
```

### 3. Show Alternative Times When Full

```typescript
try {
  await validateTimeSlotAvailability('WRINKLE_BOTOX', '2025-11-04', '09:00', 'MORNING');
} catch (error) {
  if (error instanceof ReservationError && error.metadata?.suggestedTimes) {
    console.log('대체 가능한 시간:');
    error.metadata.suggestedTimes.forEach(time => {
      console.log(`- ${time}`);
    });
  }
}
```

## Response Structure

### TimeSlotCalculationResult

```typescript
{
  date: "2025-11-04",
  serviceCode: "WRINKLE_BOTOX",
  slots: [
    {
      time: "09:00",
      period: "MORNING",
      available: true,
      remaining: 180,      // minutes
      total: 180,
      status: "available"  // "available" | "limited" | "full"
    },
    // ... more slots
  ],
  metadata: {
    totalSlots: 14,
    availableSlots: 12,
    fullSlots: 2,
    queriedAt: Date,
    cacheHit: false
  }
}
```

## Error Codes Reference

| Code | Meaning | Metadata | Action |
|------|---------|----------|--------|
| `SERVICE_NOT_FOUND` | Invalid service code | None | Check service code |
| `INVALID_DATE` | Bad date format | None | Use YYYY-MM-DD format |
| `NO_CLINIC_HOURS` | Clinic closed | None | Show closure notice |
| `TIME_SLOT_FULL` | Slot fully booked | suggestedTimes | Show alternatives |
| `INSUFFICIENT_TIME` | Not enough capacity | remainingMinutes, requiredMinutes | Show different slot |
| `DATABASE_ERROR` | DB query failed | None | Retry or contact admin |

## Status Values

| Status | Meaning | Color | Action |
|--------|---------|-------|--------|
| `available` | Slot has enough capacity | Green | Allow booking |
| `limited` | Some time left, not enough for service | Yellow | Show different slot |
| `full` | No capacity remaining | Red | Disable booking |

## Cache Management

### When to Invalidate

```typescript
// After creating reservation
await createReservation({...});
cacheManager.invalidate(dateString);

// After updating reservation
await updateReservation({...});
cacheManager.invalidate(oldDate);
if (newDate !== oldDate) {
  cacheManager.invalidate(newDate);
}

// After canceling reservation
await cancelReservation({...});
cacheManager.invalidate(dateString);

// During maintenance
cacheManager.invalidateAll();
```

### Cache Statistics

```typescript
const stats = cacheManager.getStats();
console.log(stats);
// { size: 12, entries: ['2025-11-04', '2025-11-05', ...] }
```

## Performance Tips

### ✅ Do This

```typescript
// Single call for all slots
const result = await calculateAvailableTimeSlots('WRINKLE_BOTOX', '2025-11-04');
const morningSlots = result.slots.filter(s => s.period === 'MORNING');
```

### ❌ Don't Do This

```typescript
// Multiple calls (inefficient)
const slot1 = await validateTimeSlotAvailability('WRINKLE_BOTOX', '2025-11-04', '09:00', 'MORNING');
const slot2 = await validateTimeSlotAvailability('WRINKLE_BOTOX', '2025-11-04', '09:30', 'MORNING');
// ... (uses cache but still wasteful)
```

## Debugging

### Check Slot Details

```typescript
const result = await calculateAvailableTimeSlots('WRINKLE_BOTOX', '2025-11-04');

// Find specific slot
const slot = result.slots.find(s => s.time === '09:00' && s.period === 'MORNING');

console.log({
  time: slot.time,
  available: slot.available,
  status: slot.status,
  remaining: slot.remaining,
  total: slot.total,
  reservedBy: slot.reservedBy, // Only in development
});
```

### Monitor Performance

```typescript
const start = performance.now();
const result = await calculateAvailableTimeSlots('WRINKLE_BOTOX', '2025-11-04');
const end = performance.now();

console.log({
  responseTime: `${end - start}ms`,
  cacheHit: result.metadata.cacheHit,
  totalSlots: result.metadata.totalSlots,
  availableSlots: result.metadata.availableSlots,
});
```

## Type Safety

### Import Types

```typescript
import type {
  TimeSlot,
  TimeSlotCalculationResult,
  ReservationError,
  ReservationErrorMetadata,
} from '@/lib/reservations/time-slot-calculator';

import { ErrorCode } from '@/lib/reservations/time-slot-calculator';
```

### Type Guards

```typescript
function isReservationError(error: unknown): error is ReservationError {
  return error instanceof ReservationError;
}

try {
  await validateTimeSlotAvailability(...);
} catch (error) {
  if (isReservationError(error)) {
    console.log(error.code); // Type-safe
    console.log(error.metadata?.suggestedTimes); // Type-safe
  }
}
```

## Common Patterns

### React Component Example

```typescript
function TimeSlotPicker({ serviceCode, date }: Props) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSlots() {
      try {
        const result = await calculateAvailableTimeSlots(serviceCode, date);
        setSlots(result.slots.filter(s => s.available));
      } catch (error) {
        console.error('Failed to load slots:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSlots();
  }, [serviceCode, date]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {slots.map(slot => (
        <button key={`${slot.period}-${slot.time}`} onClick={() => selectSlot(slot)}>
          {slot.time} ({slot.remaining}분 남음)
        </button>
      ))}
    </div>
  );
}
```

### API Route Example

```typescript
// app/api/slots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { calculateAvailableTimeSlots, ReservationError } from '@/lib/reservations/time-slot-calculator';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const serviceCode = searchParams.get('serviceCode');
  const date = searchParams.get('date');

  if (!serviceCode || !date) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const result = await calculateAvailableTimeSlots(serviceCode, date);
    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    if (error instanceof ReservationError) {
      return NextResponse.json({ error: error.toJSON() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Server Action Example

```typescript
'use server';

import { validateTimeSlotAvailability, cacheManager } from '@/lib/reservations/time-slot-calculator';

export async function bookTimeSlot(formData: FormData) {
  const serviceCode = formData.get('serviceCode') as string;
  const date = formData.get('date') as string;
  const time = formData.get('time') as string;
  const period = formData.get('period') as Period;

  try {
    // Validate
    await validateTimeSlotAvailability(serviceCode, date, time, period);

    // Create reservation
    const reservation = await prisma.reservation.create({
      data: { /* ... */ }
    });

    // Invalidate cache
    cacheManager.invalidate(date);

    return { success: true, id: reservation.id };

  } catch (error) {
    if (error instanceof ReservationError) {
      return { success: false, error: error.toJSON() };
    }
    throw error;
  }
}
```

## Testing

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { calculateAvailableTimeSlots } from '../time-slot-calculator';

describe('calculateAvailableTimeSlots', () => {
  it('should return all available slots when no reservations', async () => {
    vi.spyOn(prisma.service, 'findUnique').mockResolvedValue(mockService);
    vi.spyOn(prisma.clinicTimeSlot, 'findMany').mockResolvedValue(mockHours);
    vi.spyOn(prisma.reservation, 'findMany').mockResolvedValue([]);

    const result = await calculateAvailableTimeSlots('WRINKLE_BOTOX', '2025-11-04');

    expect(result.slots).toHaveLength(14);
    expect(result.metadata.availableSlots).toBe(14);
  });
});
```

## Troubleshooting

### Issue: Slots not updating after reservation

**Solution**: Invalidate cache
```typescript
cacheManager.invalidate(dateString);
```

### Issue: All slots showing as unavailable

**Diagnosis**: Check clinic hours for that day
```typescript
const dayOfWeek = new Date(dateString).getDay();
const hours = await prisma.clinicTimeSlot.findMany({ where: { dayOfWeek } });
console.log('Clinic hours:', hours);
```

### Issue: Slow response times

**Diagnosis**: Check cache hit rate
```typescript
const result = await calculateAvailableTimeSlots(...);
console.log('Cache hit:', result.metadata.cacheHit);
console.log('Cache stats:', cacheManager.getStats());
```

### Issue: Incorrect capacity calculation

**Diagnosis**: Verify service duration settings
```typescript
const service = await prisma.service.findUnique({
  where: { code: 'WRINKLE_BOTOX' },
  select: { durationMinutes: true, bufferMinutes: true },
});
console.log('Service config:', service);
// Should be: durationMinutes: 30, bufferMinutes: 10
```

## Cheat Sheet

```typescript
// Get all slots
const result = await calculateAvailableTimeSlots(code, date);

// Validate specific slot
await validateTimeSlotAvailability(code, date, time, period);

// After any reservation change
cacheManager.invalidate(date);

// Error handling
catch (error) {
  if (error instanceof ReservationError) {
    // Use error.code and error.metadata
  }
}

// Filter available slots
const available = result.slots.filter(s => s.available);

// Group by period
const morning = result.slots.filter(s => s.period === 'MORNING');
const afternoon = result.slots.filter(s => s.period === 'AFTERNOON');

// Find best slot (most remaining time)
const best = available.sort((a, b) => b.remaining - a.remaining)[0];
```

## Performance Benchmarks

| Scenario | Expected Performance |
|----------|---------------------|
| Cache hit | <5ms |
| Cache miss (0 reservations) | <30ms |
| Cache miss (50 reservations) | <50ms |
| Cache miss (100 reservations) | <80ms |
| Cache miss (500 reservations) | <150ms |

## Next Steps

1. **Integration**: See [README.md](./README.md) for detailed integration guide
2. **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for deep technical analysis
3. **Testing**: See [__tests__/time-slot-calculator.test.ts](./__tests__/time-slot-calculator.test.ts) for test cases
4. **Implementation**: Copy examples above and adapt to your use case

## Support

For issues or questions:
1. Check error code in [Error Codes Reference](#error-codes-reference)
2. Review [Troubleshooting](#troubleshooting) section
3. Check test cases for examples
4. Review architecture documentation

---

**Version**: 1.0.0
**Last Updated**: 2025-11-04
**Status**: Production Ready ✅
