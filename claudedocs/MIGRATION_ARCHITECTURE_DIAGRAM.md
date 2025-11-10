# MIGRATION ARCHITECTURE DIAGRAMS
## Visual Reference for Zero-Downtime Migration

---

## CURRENT STATE (Before Migration)

### Database Schema
```
┌─────────────────────────────────────────────────────────────────┐
│                    RESERVATIONS TABLE                           │
├─────────────────────────────────────────────────────────────────┤
│ id                  | String                                    │
│ patientName         | String                                    │
│ phone               | String                                    │
│ preferredDate       | DateTime                                  │
│ preferredTime       | String  ← ⚠️  UNSTRUCTURED (e.g. "09:00") │
│ service             | ServiceType  ← ⚠️  HARDCODED ENUM         │
│ status              | ReservationStatus                         │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Foreign Key: service
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              SERVICE_RESERVATION_LIMITS TABLE                   │
├─────────────────────────────────────────────────────────────────┤
│ id                  | String                                    │
│ serviceType         | ServiceType  ← ⚠️  ENUM (unique)          │
│ dailyLimit          | Int  ← ⚠️  COUNT-BASED                    │
│ isActive            | Boolean                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    SERVICETYPE ENUM                             │
├─────────────────────────────────────────────────────────────────┤
│ • WRINKLE_BOTOX                                                 │
│ • VOLUME_LIFTING         ← ⚠️  HARDCODED, REQUIRES CODE CHANGE  │
│ • SKIN_CARE                                                     │
│ • REMOVAL_PROCEDURE                                             │
│ • BODY_CARE                                                     │
│ • OTHER_CONSULTATION                                            │
└─────────────────────────────────────────────────────────────────┘

LIMITATIONS:
❌ Cannot add services without developer
❌ No time-based scheduling
❌ No duration tracking
❌ Count-based limits only (not time-based)
```

---

## TARGET STATE (After Migration)

### Database Schema
```
┌─────────────────────────────────────────────────────────────────┐
│                    RESERVATIONS TABLE                           │
├─────────────────────────────────────────────────────────────────┤
│ id                  | String                                    │
│ patientName         | String                                    │
│ phone               | String                                    │
│ preferredDate       | DateTime                                  │
│ period              | Period  ← ✅ MORNING/AFTERNOON            │
│ serviceId           | String  ← ✅ FOREIGN KEY                  │
│ serviceName         | String  ← ✅ SNAPSHOT                     │
│ estimatedDuration   | Int     ← ✅ TIME IN MINUTES              │
│ status              | ReservationStatus                         │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Foreign Key: serviceId
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICES TABLE                             │
├─────────────────────────────────────────────────────────────────┤
│ id                  | String                                    │
│ code                | String  (unique)  ← ✅ DYNAMIC            │
│ name                | String            ← ✅ KOREAN NAME        │
│ nameEn              | String?           ← ✅ ENGLISH NAME       │
│ durationMinutes     | Int               ← ✅ PROCEDURE TIME     │
│ bufferMinutes       | Int               ← ✅ PREP/CLEANUP TIME  │
│ category            | String?                                   │
│ basePrice           | Int?                                      │
│ isActive            | Boolean           ← ✅ ADMIN CONTROLLED   │
│ isVisible           | Boolean                                   │
│ displayOrder        | Int                                       │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   CLINIC_TIME_SLOTS TABLE                       │
├─────────────────────────────────────────────────────────────────┤
│ id                  | String                                    │
│ dayOfWeek           | Int       ← ✅ 0=Sun, 6=Sat              │
│ period              | Period    ← ✅ MORNING/AFTERNOON          │
│ startTime           | String    ← ✅ "09:00"                    │
│ endTime             | String    ← ✅ "12:00"                    │
│ totalMinutes        | Int       ← ✅ TIME-BASED CAPACITY        │
│ isActive            | Boolean                                   │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      PERIOD ENUM                                │
├─────────────────────────────────────────────────────────────────┤
│ • MORNING            ← ✅ SIMPLE, STABLE ENUM                   │
│ • AFTERNOON                                                     │
└─────────────────────────────────────────────────────────────────┘

CAPABILITIES:
✅ Admin can add services via UI
✅ Time-based scheduling (period)
✅ Duration tracking (minutes)
✅ Time-based capacity management
✅ Flexible clinic hours per day
```

---

## MIGRATION FLOW: PHASE BY PHASE

### Phase 1: Additive Changes
```
BEFORE PHASE 1:
┌──────────────┐
│ reservations │
│   service    │ ← ServiceType enum
│ preferredTime│ ← String
└──────────────┘

AFTER PHASE 1 (Coexistence):
┌──────────────────────────────────────────┐
│           reservations                   │
│ OLD:                                     │
│   service          (ServiceType enum)    │ ← Still works!
│   preferredTime    (String)              │ ← Still works!
│ NEW (nullable):                          │
│   serviceId        (String?)             │ ← Added (NULL)
│   serviceName      (String?)             │ ← Added (NULL)
│   estimatedDuration (Int?)               │ ← Added (NULL)
│   period           (Period?)             │ ← Added (NULL)
└──────────────────────────────────────────┘
                    │
                    │ Foreign Key (nullable)
                    ▼
           ┌────────────┐
           │  services  │ ← NEW table (6 rows seeded)
           └────────────┘

           ┌────────────────────┐
           │ clinic_time_slots  │ ← NEW table (11 rows seeded)
           └────────────────────┘

STATUS: ✅ Old system works exactly as before
        ✅ New tables ready for data
        ✅ Fully reversible
```

---

### Phase 2: Data Migration
```
BEFORE PHASE 2:
┌──────────────────────────────────────────┐
│           reservations                   │
│ OLD (populated):                         │
│   service = WRINKLE_BOTOX                │
│   preferredTime = "09:00"                │
│ NEW (NULL):                              │
│   serviceId = NULL                       │
│   period = NULL                          │
└──────────────────────────────────────────┘

AFTER PHASE 2 (Dual-populated):
┌──────────────────────────────────────────┐
│           reservations                   │
│ OLD (preserved!):                        │
│   service = WRINKLE_BOTOX                │ ← ✅ Unchanged
│   preferredTime = "09:00"                │ ← ✅ Unchanged
│ NEW (migrated):                          │
│   serviceId = "srv_wrinkle_botox"        │ ← ✅ Populated
│   serviceName = "주름/보톡스"              │ ← ✅ Populated
│   estimatedDuration = 40                 │ ← ✅ Calculated
│   period = MORNING                       │ ← ✅ Parsed
└──────────────────────────────────────────┘
                    │
                    │ Foreign Key
                    ▼
           ┌────────────────────────────────┐
           │         services               │
           │ srv_wrinkle_botox → 주름/보톡스 │ ← Lookup table
           └────────────────────────────────┘

MIGRATION LOGIC:
┌────────────────────────────────────────────────────────────┐
│ UPDATE reservations r SET                                  │
│   serviceId = (SELECT id FROM services WHERE code = r.service::text),
│   serviceName = (SELECT name FROM services WHERE code = r.service::text),
│   estimatedDuration = (SELECT durationMinutes + bufferMinutes FROM services ...),
│   period = CASE                                            │
│     WHEN preferredTime LIKE '%AM%' THEN 'MORNING'          │
│     WHEN preferredTime LIKE '%PM%' THEN 'AFTERNOON'        │
│     WHEN CAST(SPLIT_PART(preferredTime, ':', 1) AS INT) < 12 THEN 'MORNING'
│     ELSE 'AFTERNOON'                                       │
│   END;                                                     │
└────────────────────────────────────────────────────────────┘

STATUS: ✅ Both old and new fields populated
        ✅ Data transformation complete
        ⚠️  Rollback: UPDATE to NULL (old data safe)
```

---

### Phase 3: Application Switchover
```
APPLICATION LOGIC (with Feature Flag):

┌─────────────────────────────────────────────────────────┐
│            Feature Flag Controller                      │
│  USE_DYNAMIC_SERVICES = false → Use OLD system          │
│  USE_DYNAMIC_SERVICES = true  → Use NEW system          │
│  ROLLOUT_PERCENTAGE = 5/25/50/100 → Gradual rollout     │
└─────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
  ┌──────────┐          ┌──────────┐
  │ OLD PATH │          │ NEW PATH │
  │ (enum)   │          │ (dynamic)│
  └──────────┘          └──────────┘

OLD PATH (Phase 3 start - 0% rollout):
┌────────────────────────────────────────┐
│ POST /api/public/reservations          │
│  Read: body.service (enum)             │
│  Check: service_reservation_limits     │ ← Count-based
│  Create: { service, preferredTime }    │
│  Dual-write: populate new fields too   │
└────────────────────────────────────────┘

NEW PATH (Phase 3 end - 100% rollout):
┌────────────────────────────────────────┐
│ POST /api/public/reservations          │
│  Read: body.service (lookup by code)   │
│  Check: clinic_time_slots + duration   │ ← Time-based
│  Create: { serviceId, period }         │
│  Dual-write: populate old fields too   │ ← Rollback safety!
└────────────────────────────────────────┘

GRADUAL ROLLOUT:
Week 1: 5%   → Monitor error rate
Week 2: 25%  → Monitor performance
Week 3: 50%  → Monitor user feedback
Week 4: 100% → Full new system

STATUS: ✅ Instant rollback via feature flag
        ✅ Dual-write maintains data consistency
        ✅ Gradual validation
```

---

### Phase 4: Cleanup
```
BEFORE PHASE 4 (Dual-schema):
┌──────────────────────────────────────────┐
│           reservations                   │
│ OLD (redundant):                         │
│   service = WRINKLE_BOTOX                │ ← To be removed
│   preferredTime = "09:00"                │ ← To be removed
│ NEW (active):                            │
│   serviceId = "srv_wrinkle_botox"        │
│   period = MORNING                       │
└──────────────────────────────────────────┘

AFTER PHASE 4 (Clean):
┌──────────────────────────────────────────┐
│           reservations                   │
│   serviceId = "srv_wrinkle_botox"        │ ← Required
│   serviceName = "주름/보톡스"              │ ← Required
│   estimatedDuration = 40                 │ ← Required
│   period = MORNING                       │ ← Required
└──────────────────────────────────────────┘
                    │
                    │ Foreign Key (required)
                    ▼
           ┌────────────┐
           │  services  │
           └────────────┘

REMOVED:
❌ service field (enum)
❌ preferredTime field (string)
❌ ServiceType enum
❌ service_reservation_limits table

STATUS: ⚠️  IRREVERSIBLE - no rollback
        ✅ Clean schema
        ✅ Optimized indexes
```

---

## DATA FLOW COMPARISON

### Current System (Count-Based)
```
User requests reservation
        │
        ▼
┌───────────────────────┐
│ Check availability:   │
│ COUNT(reservations)   │  ← Simple count
│   WHERE               │
│     date = X          │
│     service = Y       │
│   < dailyLimit        │
└───────────────────────┘
        │
        ▼
    Available? Yes/No
```

### New System (Time-Based)
```
User requests reservation
        │
        ▼
┌───────────────────────────────────────┐
│ 1. Get service details:               │
│    duration = durationMinutes +       │
│                bufferMinutes           │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 2. Get clinic time slot:              │
│    totalMinutes for dayOfWeek+period  │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 3. Calculate booked time:             │
│    SUM(estimatedDuration)             │
│      WHERE date = X AND period = Y    │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 4. Check capacity:                    │
│    bookedTime + newDuration           │
│      <= totalMinutes?                 │
└───────────────────────────────────────┘
        │
        ▼
    Available? Yes/No
```

---

## ROLLBACK FLOW DIAGRAM

```
                    ┌─────────────┐
                    │ Issue       │
                    │ Detected?   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         PHASE 1      PHASE 2      PHASE 3
              │            │            │
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │ DROP    │  │ UPDATE  │  │ FEATURE │
        │ TABLES  │  │ TO NULL │  │ FLAG=0% │
        └─────────┘  └─────────┘  └─────────┘
              │            │            │
              ▼            ▼            ▼
        ✅ <1 min    ✅ <5 min    ✅ <30 sec
        ✅ Data safe ✅ Data safe ✅ Data safe

        PHASE 4
           │
           ▼
      ┌─────────┐
      │ NO      │
      │ ROLLBACK│ ⚠️  IRREVERSIBLE
      └─────────┘
           │
           ▼
    ┌──────────────┐
    │ Fix Forward  │
    │ OR           │
    │ DB Restore   │ ⚠️  Data loss risk!
    └──────────────┘
```

---

## ADMIN UI WORKFLOW (Post-Migration)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN SERVICE MANAGEMENT                     │
└─────────────────────────────────────────────────────────────────┘

BEFORE (Manual, Developer-Dependent):
Developer
  └─ Edit schema.prisma
      └─ Create migration
          └─ Deploy to production
              └─ Downtime possible
                  └─ 3-5 days

AFTER (Self-Service, Admin-Managed):
Clinic Admin
  └─ Login to Admin Panel
      └─ Navigate to "서비스 관리"
          └─ Click "새 시술 추가"
              └─ Fill form:
                  ├─ 시술 코드: HAIR_REMOVAL
                  ├─ 이름: 제모 시술
                  ├─ 시술 시간: 60분
                  └─ 준비 시간: 15분
              └─ Save (instant!)
                  └─ Available immediately
                      └─ 5 minutes

ADMIN UI FEATURES:
┌──────────────────────────────────────────┐
│ Service List Table                       │
├──────────────────────────────────────────┤
│ Name       | Duration | Active | Actions │
│ 주름/보톡스  | 40분     | ✅     | Edit 🖊  │
│ 볼륨/리프팅  | 60분     | ✅     | Edit 🖊  │
│ 피부케어    | 70분     | ✅     | Edit 🖊  │
│ 제거시술    | 50분     | ❌     | Edit 🖊  │
│                                          │
│ [+ 새 시술 추가]                          │
└──────────────────────────────────────────┘

CAPABILITIES:
✅ Add new service (no developer)
✅ Edit duration (instant update)
✅ Deactivate service (soft delete)
✅ Reorder display
✅ Set pricing
✅ Category management
```

---

## SYSTEM STATE MATRIX

| Component | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|-----------|---------|---------|---------|---------|
| **services table** | ✅ Created | ✅ Populated | ✅ Active | ✅ Primary |
| **clinic_time_slots** | ✅ Created | ✅ Populated | ✅ Active | ✅ Active |
| **reservations.serviceId** | ⚪ NULL | ✅ Populated | ✅ Active | ✅ Required |
| **reservations.period** | ⚪ NULL | ✅ Populated | ✅ Active | ✅ Required |
| **reservations.service** | ✅ Active | ✅ Active | ✅ Dual-write | ❌ Removed |
| **reservations.preferredTime** | ✅ Active | ✅ Active | ✅ Dual-write | ❌ Removed |
| **ServiceType enum** | ✅ Exists | ✅ Exists | ✅ Exists | ❌ Dropped |
| **service_reservation_limits** | ✅ Active | ✅ Active | ⚪ Unused | ❌ Dropped |
| **Application code** | 🔴 Old only | 🔴 Old only | 🟡 Flag-based | 🟢 New only |
| **Admin UI** | ❌ None | ❌ None | ⚪ Preview | ✅ Active |
| **Rollback risk** | 🟢 Low | 🟡 Medium | 🟢 Low | 🔴 High |

**Legend**:
- ✅ Active/Required
- ⚪ Exists but optional/NULL
- ❌ Removed/Non-existent
- 🔴 Old system only
- 🟡 Hybrid (feature flag)
- 🟢 New system only

---

## VALIDATION CHECKPOINTS

```
PHASE 1 VALIDATION:
┌─────────────────────────────────────┐
│ ✅ SELECT COUNT(*) FROM services    │ → 6
│ ✅ SELECT COUNT(*) FROM clinic_time_slots │ → 11
│ ✅ SELECT COUNT(*) FROM reservations WHERE serviceId IS NULL │ → All
│ ✅ SELECT COUNT(*) FROM reservations WHERE service IS NOT NULL │ → All
└─────────────────────────────────────┘

PHASE 2 VALIDATION:
┌─────────────────────────────────────┐
│ ✅ SELECT COUNT(*) FROM reservations WHERE serviceId IS NOT NULL │ → All
│ ✅ SELECT COUNT(*) FROM reservations WHERE period IS NOT NULL │ → ≥95%
│ ✅ SELECT COUNT(*) FROM reservations WHERE service IS NOT NULL │ → All
│ ✅ Verify service mapping: service::text = services.code │ → 100%
└─────────────────────────────────────┘

PHASE 3 VALIDATION:
┌─────────────────────────────────────┐
│ ✅ Reservation creation rate stable │
│ ✅ Error rate <5% increase          │
│ ✅ Dual-write functioning           │
│ ✅ Feature flag rollout: 5% → 100%  │
└─────────────────────────────────────┘

PHASE 4 VALIDATION:
┌─────────────────────────────────────┐
│ ✅ Old fields removed                │
│ ✅ ServiceType enum dropped          │
│ ✅ Application functional            │
│ ✅ Performance acceptable            │
└─────────────────────────────────────┘
```

---

## SUCCESS METRICS DASHBOARD

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION SUCCESS DASHBOARD                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Data Integrity:          100% ✅                               │
│  ├─ Reservations preserved: [████████████████] 100%            │
│  ├─ Service mapping:        [████████████████] 100%            │
│  └─ Period parsing:         [███████████████▒] 98%             │
│                                                                 │
│  System Stability:         ✅                                   │
│  ├─ Error rate change:      +2.1% (acceptable)                 │
│  ├─ Response time:          425ms (baseline: 410ms)            │
│  └─ Downtime:               0 seconds                          │
│                                                                 │
│  Migration Progress:       100% ✅                              │
│  ├─ Phase 1: ✅ Complete                                        │
│  ├─ Phase 2: ✅ Complete                                        │
│  ├─ Phase 3: ✅ Complete                                        │
│  └─ Phase 4: ✅ Complete                                        │
│                                                                 │
│  Business Value:           ✅                                   │
│  ├─ Service add time:       5 min (was: 3-5 days)              │
│  ├─ Developer dependency:   Eliminated                         │
│  └─ Admin flexibility:      Full control                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## TIMELINE VISUALIZATION

```
Week 0  Week 1  Week 2  Week 3  Week 4  Week 5  Week 6
  │       │       │       │       │       │       │
  │       │       │       │       │       │       │
  ▼       ▼       ▼       ▼       ▼       ▼       ▼
┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
│Prep│ │ P1 │ │ P2 │ │ P3 │ │ P3 │ │ P4 │ │Done│
└────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘
        ▲       ▲       ▲       ▲       ▲       ▲
        │       │       │       │       │       │
    Add Tables  Migrate Switch- Full    Clean   🎉
    & Fields    Data    over    Rollout Schema
                        5%→100%

Risk Level by Week:
Week 1: 🟢 LOW
Week 2: 🔴 CRITICAL (data migration)
Week 3: 🟡 MEDIUM
Week 4: 🟡 MEDIUM
Week 5: 🟡 MEDIUM (cleanup)
Week 6: 🟢 LOW
```

---

**END OF ARCHITECTURE DIAGRAMS**
