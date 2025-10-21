# ClinicInfo Quick Reference

## Quick Start Commands

```bash
# 1. Add schema → Generate types
npx prisma generate

# 2. Create & apply migration
npx prisma migrate dev --name add_clinic_info_table

# 3. Run seed script
npm run db:seed:clinic

# 4. Verify in Prisma Studio
npx prisma studio

# 5. Run tests
npx tsx prisma/test-clinic-info.ts
```

---

## Essential Schema Structure

```prisma
model ClinicInfo {
  // IDs & Keys
  id String @id @default(cuid())

  // Contact (required)
  phonePrimary String
  phoneSecondary String?

  // Address (required)
  addressFull String
  addressFloor String?

  // Business Hours (flexible strings)
  hoursWeekday String
  hoursSaturday String
  hoursSunday String?
  hoursHoliday String?
  hoursLunchBreak String?

  // SNS (all optional)
  snsInstagram String?
  snsKakao String?
  snsNaverBlog String?

  // Business Info (required)
  businessRegistration String
  representativeName String

  // System Fields
  version Int @default(1)
  isActive Boolean @default(true)
  lastUpdatedBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([isActive])
  @@map("clinic_info")
}
```

---

## Common Queries

### Get Active Clinic Info
```typescript
const activeClinic = await prisma.clinicInfo.findFirst({
  where: { isActive: true }
});
```

### Update Clinic Info (with optimistic locking)
```typescript
const updated = await prisma.clinicInfo.update({
  where: {
    id: clinic.id,
    version: clinic.version, // Prevents concurrent update conflicts
  },
  data: {
    phonePrimary: '02-9999-8888',
    version: { increment: 1 },
    lastUpdatedBy: userId,
  },
});
```

### Create New Active Clinic (deactivate old)
```typescript
// Deactivate old records
await prisma.clinicInfo.updateMany({
  where: { isActive: true },
  data: { isActive: false },
});

// Create new active record
const newClinic = await prisma.clinicInfo.create({
  data: {
    phonePrimary: '02-1234-5678',
    addressFull: 'Seoul Address',
    hoursWeekday: '09:00-18:00',
    hoursSaturday: '09:00-13:00',
    businessRegistration: '123-45-67890',
    representativeName: 'Name',
    isActive: true,
  },
});
```

---

## Validation Checklist

### Pre-Implementation
- [ ] PostgreSQL running
- [ ] `DATABASE_URL` environment variable set
- [ ] Prisma CLI installed (`npx prisma --version`)

### Post-Migration
- [ ] Table `clinic_info` exists in database
- [ ] Index `clinic_info_isActive_idx` created
- [ ] All columns have correct types and constraints

### Post-Seeding
- [ ] Exactly 1 record with `isActive = true`
- [ ] All required fields populated
- [ ] Korean text displays correctly
- [ ] Timestamps auto-populate

### Testing
- [ ] Can query active clinic info
- [ ] Update increments version correctly
- [ ] Single-record pattern enforced
- [ ] Optimistic locking prevents conflicts

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Migration fails | Check `DATABASE_URL`, verify Postgres running |
| Multiple active records | Run seed script again (it deactivates old records) |
| Version conflict | Re-fetch record before update |
| Korean text shows ??? | Verify database encoding is UTF-8 |
| Table already exists | `DROP TABLE clinic_info CASCADE;` then re-migrate |

---

## File Locations

| Purpose | Path |
|---------|------|
| Schema | `/Users/blee/Desktop/cms/misopin-cms/prisma/schema.prisma` |
| Migration | `/Users/blee/Desktop/cms/misopin-cms/prisma/migrations/[timestamp]_add_clinic_info_table/` |
| Seed Script | `/Users/blee/Desktop/cms/misopin-cms/prisma/seed-clinic-info.ts` |
| Test Script | `/Users/blee/Desktop/cms/misopin-cms/prisma/test-clinic-info.ts` |
| Detailed Guide | `/Users/blee/Desktop/cms/misopin-cms/claudedocs/clinic-info-implementation-guide.md` |

---

## Next Steps

1. ✅ Complete Phase 1 (Database Setup) - THIS GUIDE
2. ⏭️ Phase 2: Create API Routes (`/api/admin/clinic-info`)
3. ⏭️ Phase 3: Build Admin UI (edit form)
4. ⏭️ Phase 4: Create Frontend Component (display info)

---

## Key Design Decisions

- **Single-Record Pattern**: Only one clinic info active at a time via `isActive` flag
- **String-Based Hours**: Flexible format for Korean text (no rigid time parsing)
- **Optimistic Locking**: `version` field prevents concurrent update conflicts
- **Optional Fields**: SNS links and secondary contact are optional
- **Idempotent Seeding**: Safe to run seed script multiple times

---

## Time Estimate

- **Minimal Path**: 1.5 hours (skip testing, use defaults)
- **Standard Path**: 2-3 hours (recommended, includes testing)
- **Thorough Path**: 3-4 hours (comprehensive testing, team review)
