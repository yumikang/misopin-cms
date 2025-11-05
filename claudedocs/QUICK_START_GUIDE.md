# Quick Start Guide - Admin Time-Slot Implementation

**Quick Reference for Developers**
**Start Here**: This is your TL;DR version of the complete plan.

---

## 30-Second Overview

**What**: Transform admin reservations from simple time strings to period-aware time slots with capacity visualization.

**Why**: Enable admin staff to see real-time capacity and prevent overbooking.

**How**: Fix broken POST endpoint → Add time-slot calculator → Build UI components → Integrate.

**Timeline**: 3-4 days (12-16 hours)

**Risk**: MEDIUM (backward compatible, feature-flagged)

---

## Critical Files

| File | Current State | Action | Priority |
|------|---------------|--------|----------|
| `/app/api/reservations/route.ts` | ❌ POST uses mock data | Fix database integration | 🔴 CRITICAL |
| `/app/api/reservations/route.ts` | ❌ OPTIONS uses hardcoded slots | Use time-slot-calculator | 🔴 HIGH |
| `/app/admin/reservations/page.tsx` | ⚠️ Simple dropdown | Add TimeSlotSelector | 🟡 HIGH |
| `/lib/reservations/time-slot-calculator.ts` | ✅ Ready to use | Already working! | 🟢 NONE |

---

## 5-Minute Implementation Checklist

### Phase 1: Fix API (2-3 hours)
```typescript
// 1. Fix POST endpoint (route.ts line 190-230)
// Replace mock data with:
const newReservation = await prisma.reservations.create({
  data: {
    patientName: body.patient_name,
    phone: body.patient_phone,
    preferredDate: new Date(body.reservation_date),
    preferredTime: body.reservation_time,
    service: body.department,
    period: body.period,
    timeSlotStart: body.timeSlotStart,
    estimatedDuration: body.estimatedDuration,
    status: 'PENDING'
    // ... other fields
  }
});

// 2. Fix OPTIONS endpoint (route.ts line 367-398)
// Replace hardcoded slots with:
import { calculateAvailableTimeSlots } from '@/lib/reservations/time-slot-calculator';

const result = await calculateAvailableTimeSlots(service, date);
return NextResponse.json({
  slots: result.slots,
  metadata: result.metadata
});
```

### Phase 2: Build UI (2-3 hours)
```typescript
// 3. Create TimeSlotSelector component
// File: /components/admin/TimeSlotSelector.tsx
// Copy implementation from TECHNICAL_SPECIFICATIONS.md

// 4. Create CapacityIndicator component
// File: /components/admin/CapacityIndicator.tsx
// Copy implementation from TECHNICAL_SPECIFICATIONS.md
```

### Phase 3: Integrate (1-2 hours)
```typescript
// 5. Update admin form (page.tsx line 639-654)
// Replace simple dropdown with:
<TimeSlotSelector
  date={formData.reservation_date}
  service={formData.department}
  onSelect={(slot) => setFormData({
    ...formData,
    period: slot.period,
    timeSlotStart: slot.time,
    estimatedDuration: slot.capacity.total
  })}
/>
```

---

## Most Important Code Snippets

### API: Create Reservation (Fixed)
```typescript
// app/api/reservations/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // 1. Validate availability
  await validateTimeSlotAvailability(
    body.department,
    body.reservation_date,
    body.reservation_time,
    body.period
  );

  // 2. Create in database
  const reservation = await prisma.reservations.create({
    data: {
      patientName: body.patient_name,
      phone: body.patient_phone,
      email: body.patient_email,
      birthDate: body.birth_date || new Date('2000-01-01'),
      gender: body.gender || 'MALE',
      treatmentType: body.treatment_type || 'FIRST_VISIT',
      preferredDate: new Date(body.reservation_date),
      preferredTime: body.reservation_time,
      service: body.department,
      period: body.period,
      timeSlotStart: body.timeSlotStart,
      timeSlotEnd: body.timeSlotEnd,
      estimatedDuration: body.estimatedDuration,
      status: 'PENDING',
      notes: body.notes
    }
  });

  return NextResponse.json({
    reservation: transformReservation(reservation),
    message: '예약이 등록되었습니다.'
  }, { status: 201 });
}
```

### UI: Time Slot Selector (Minimal)
```typescript
// components/admin/TimeSlotSelector.tsx
export const TimeSlotSelector = ({ date, service, onSelect }) => {
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    fetch(`/api/reservations?date=${date}&service=${service}`, {
      method: 'OPTIONS'
    })
      .then(res => res.json())
      .then(data => setSlots(data.slots));
  }, [date, service]);

  return (
    <div className="space-y-4">
      {/* Morning Slots */}
      <div>
        <Badge>오전</Badge>
        <div className="grid grid-cols-3 gap-2">
          {slots.filter(s => s.period === 'MORNING').map(slot => (
            <Button
              key={slot.time}
              onClick={() => onSelect(slot)}
              disabled={!slot.available}
              variant={slot.available ? 'outline' : 'ghost'}
            >
              {slot.time}
              <CapacityIndicator {...slot.capacity} compact />
            </Button>
          ))}
        </div>
      </div>

      {/* Afternoon Slots */}
      <div>
        <Badge>오후</Badge>
        {/* Same as morning */}
      </div>
    </div>
  );
};
```

### Database: Check Capacity
```typescript
// Quick capacity check
const capacityCheck = await prisma.reservations.aggregate({
  where: {
    preferredDate: new Date(date),
    period: period,
    timeSlotStart: time,
    status: { in: ['PENDING', 'CONFIRMED'] }
  },
  _sum: {
    estimatedDuration: true
  }
});

const consumed = capacityCheck._sum.estimatedDuration || 0;
const remaining = 360 - consumed; // 360 = 6 hours * 60 minutes
const available = remaining >= requiredDuration;
```

---

## Common Issues & Solutions

### Issue 1: "POST doesn't save to database"
**Cause**: Using mock data array instead of Prisma
**Solution**: Replace lines 190-230 in route.ts with Prisma create

### Issue 2: "Time slots show incorrect availability"
**Cause**: OPTIONS uses hardcoded slots instead of real data
**Solution**: Replace lines 367-398 with time-slot-calculator

### Issue 3: "Component won't render slots"
**Cause**: OPTIONS endpoint not returning expected format
**Solution**: Ensure OPTIONS returns `{ slots: [], metadata: {} }`

### Issue 4: "Concurrent bookings overbook"
**Cause**: No transaction locking
**Solution**: Add `FOR UPDATE` lock in availability check

---

## Testing Checklist

```bash
# 1. API Tests
✅ POST creates reservation in database
✅ OPTIONS returns real-time availability
✅ GET filters by period and time slot
✅ Concurrent bookings handled correctly

# 2. UI Tests
✅ TimeSlotSelector displays periods correctly
✅ CapacityIndicator shows right colors
✅ Form submission includes time slot data
✅ Disabled slots are not clickable

# 3. E2E Tests
✅ Complete booking flow works
✅ Capacity updates in real-time
✅ Status transitions function correctly
✅ No data loss scenarios
```

---

## Deployment Commands

```bash
# Development
npm run dev                    # Start dev server
npm run test                   # Run tests
npm run build                  # Build for production

# Database
npx prisma studio              # View database
npx prisma generate            # Regenerate client

# Deployment
docker build -t misopin-cms:v2.0 .
docker run -p 3000:3000 misopin-cms:v2.0

# Rollback (if needed)
docker run -p 3000:3000 misopin-cms:v1.9
```

---

## Feature Flags

```bash
# .env.local
NEXT_PUBLIC_FEATURE_TIMESLOT=true     # Enable time slot selector
NEXT_PUBLIC_FEATURE_CAPACITY=true     # Enable capacity visualization
NEXT_PUBLIC_FEATURE_CALENDAR=false    # Optional calendar view
```

---

## Performance Targets

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| API Response | <200ms | <400ms | >1s |
| UI Render | <100ms | <200ms | >500ms |
| Database Query | <100ms | <200ms | >500ms |
| Page Load | <1s | <2s | >3s |

---

## Support & Resources

**Full Documentation**:
- 📋 [ADMIN_TIMESLOT_TRANSFORMATION_PLAN.md](./ADMIN_TIMESLOT_TRANSFORMATION_PLAN.md) - Complete strategic plan
- 🔧 [TECHNICAL_SPECIFICATIONS.md](./TECHNICAL_SPECIFICATIONS.md) - Detailed technical specs
- 📖 [This file](./QUICK_START_GUIDE.md) - Quick reference

**Key Files to Review**:
1. `/lib/reservations/time-slot-calculator.ts` - Core logic (already working)
2. `/app/api/public/reservations/time-slots/route.ts` - Reference implementation
3. `/prisma/schema.prisma` - Database schema (lines 226-266)

**Need Help?**
- Review the full plan for detailed implementation steps
- Check TECHNICAL_SPECIFICATIONS.md for code examples
- All code snippets are copy-paste ready

---

## Success Criteria

**Phase 1 Complete** when:
- ✅ POST saves to database (not mock array)
- ✅ OPTIONS returns real availability
- ✅ Tests pass

**Phase 2 Complete** when:
- ✅ TimeSlotSelector component works
- ✅ CapacityIndicator shows correct colors
- ✅ Component tests pass

**Phase 3 Complete** when:
- ✅ Form creates time-slot reservations
- ✅ Data persists correctly
- ✅ E2E tests pass

**Production Ready** when:
- ✅ Zero downtime deployment
- ✅ Error rate <1%
- ✅ Performance targets met
- ✅ Documentation complete

---

## Time Estimates

| Phase | Solo Developer | Team (2 devs) |
|-------|----------------|---------------|
| Phase 1: API | 2-3 hours | 1-2 hours |
| Phase 2: UI | 2-3 hours | 1-2 hours |
| Phase 3: Integration | 1-2 hours | 1 hour |
| Testing | 2 hours | 1 hour |
| **Total** | **12-16 hours** | **8-12 hours** |

**Recommendation**: Budget 4 days for solo developer, 3 days for team.

---

## Next Steps

1. **Read this guide** (5 minutes)
2. **Review critical files** listed above (15 minutes)
3. **Start with Phase 1** - Fix POST endpoint (2 hours)
4. **Follow the plan** - Work through each task sequentially
5. **Test thoroughly** - Use the testing checklist
6. **Deploy gradually** - Use feature flags for rollout

**Good luck! 🚀**

---

**Pro Tips**:
- ✅ Use time-slot-calculator library (already tested and working)
- ✅ Copy code from TECHNICAL_SPECIFICATIONS.md (production-ready)
- ✅ Test each phase before moving to next
- ✅ Feature flags allow safe rollback
- ✅ Backward compatibility means no migration needed

**Red Flags to Watch**:
- ❌ POST still using mock data after Phase 1
- ❌ OPTIONS still using hardcoded slots after Phase 1
- ❌ Components not showing capacity indicators after Phase 2
- ❌ Error rate >1% after deployment

---

**END OF QUICK START GUIDE**
