# Service Management User Guide

**시술 관리 사용 가이드**

---

## Overview

The Service Management UI allows administrators to create, edit, and manage medical services without requiring database access.

**Access**: `/admin/services`

---

## Features Overview

### Main Page

```
┌─────────────────────────────────────────────────────┐
│  시술 관리                           [+ 새 시술 추가] │
├─────────────────────────────────────────────────────┤
│  🔍 Search  | 📁 Category  | 🎯 Status  | 🔄 Refresh│
├─────────────────────────────────────────────────────┤
│  시술명  │ 코드 │ 시간 │ 한도 │ 예약수 │ 상태 │ 작업 │
│─────────┼─────┼─────┼─────┼───────┼─────┼──────│
│  보톡스  │ WRI │ 30분 │ 8건  │   15   │  ●  │ 편집 │
└─────────────────────────────────────────────────────┘
```

---

## Creating a New Service

### Step 1: Click "새 시술 추가" Button

### Step 2: Fill in Required Fields

**Required Fields** (marked with *):

1. **시술 코드** (Service Code)
   - Format: Uppercase letters and underscores only
   - Example: `LASER_TREATMENT`
   - Cannot be changed after creation

2. **시술명** (Service Name)
   - Korean or English
   - Example: `레이저 치료`
   - Max 100 characters

3. **시술 시간** (Duration)
   - In minutes
   - Range: 10-480 minutes
   - Recommended: 30-minute increments
   - Example: `40` minutes

**Optional Fields**:

4. **카테고리** (Category)
   - Example: `피부과`, `성형`
   - Helps with filtering and organization

5. **설명** (Description)
   - Brief description of the service
   - Max 500 characters

6. **준비 시간** (Buffer Time)
   - Default: 10 minutes
   - Range: 0-60 minutes
   - Time between appointments

7. **표시 순서** (Display Order)
   - Lower numbers appear first
   - Default: 0

8. **시술 활성화** (Active Status)
   - Toggle on/off
   - Default: ON

### Step 3: Review Total Time

The form automatically calculates:
```
총 소요 시간: 50분
(시술 40분 + 준비 10분)
```

### Step 4: Click "생성" to Save

You'll see a success notification:
```
✅ 시술이 생성되었습니다
```

---

## Editing an Existing Service

### Step 1: Click "편집" Button

### Step 2: Modify Fields

**Note**: Service Code cannot be changed

**Important**: When changing duration, watch for cascade effect preview:

```
┌─────────────────────────────────────────┐
│  ⚠️ 예약 한도 변경 예상                   │
│                                         │
│  현재: 하루 최대 8건 예약 가능            │
│  변경 후: 하루 최대 6건 예약 가능         │
│                                         │
│  ▼ 2건 감소                              │
└─────────────────────────────────────────┘
```

This preview helps you understand how duration changes affect booking capacity.

### Step 3: Click "수정" to Save

Success notification:
```
✅ 시술이 수정되었습니다
```

If cascade effects occurred:
```
ℹ️ 예약 한도 변경 영향
최대 예약 건수가 8건에서 6건으로 변경되었습니다
```

---

## Deleting a Service

### Step 1: Click "삭제" Button

**Note**: Button is disabled if service has existing reservations

### Step 2: Choose Delete Type

#### Option 1: 비활성화 (Recommended)

```
✓ 비활성화 (권장)

시술을 숨기지만 데이터는 보존됩니다.
기존 예약 기록은 유지되며 언제든지 다시 활성화할 수 있습니다.
```

**Use when**:
- Service has existing reservations
- You might need the service again
- You want to preserve historical data

**Effects**:
- Service hidden from new reservations
- Existing reservations remain intact
- Can be reactivated later
- Data preserved in database

#### Option 2: 완전 삭제 (Dangerous)

```
○ 완전 삭제

시술 데이터를 완전히 제거합니다.
이 작업은 되돌릴 수 없습니다.
```

**Only available when**:
- No existing reservations
- No service limits configured
- No time slots configured

**Effects**:
- Permanently removes service
- Cannot be undone
- All data lost

**Warning**:
```
⚠️ 경고: 이 작업은 되돌릴 수 없습니다!
시술 데이터가 영구적으로 삭제됩니다.
```

### Step 3: Confirm Deletion

Click "비활성화" or "완전 삭제" to proceed.

---

## Searching and Filtering

### Search Box

```
🔍 시술명 또는 코드 검색...
```

- Type service name or code
- Real-time filtering
- Case-insensitive

**Examples**:
- Search "보톡스" → finds services with "보톡스" in name
- Search "WRINKLE" → finds services with "WRINKLE" in code

### Category Filter

```
📁 Category ▼
```

**Options**:
- 모든 카테고리 (All)
- Dynamically populated from existing services

### Status Filter

```
🎯 Status ▼
```

**Options**:
- 모든 상태 (All)
- 활성 (Active only)
- 비활성 (Inactive only)

### Sort Options

```
정렬 ▼
```

**Options**:
- 이름순 (Name, A-Z or Z-A)
- 시간순 (Duration, shortest/longest)
- 등록일순 (Created date, newest/oldest)

### Refresh Button

```
🔄 Refresh
```

Reloads the service list from the server.

---

## Understanding the Service Table

### Columns Explained

1. **시술명** (Service Name)
   - Main service name
   - Description (if provided)
   - Category tag

2. **코드** (Code)
   - Unique service identifier
   - Monospace font
   - Used for API calls

3. **시술시간** (Duration)
   - Main procedure time
   - Buffer time shown below
   - Example: `40분 (+10분 준비)`

4. **일일한도** (Daily Limit)
   - Total daily time limit
   - Maximum bookings calculated
   - Example: `4시간 (최대 6건)`
   - Shows `-` if no limit set

5. **예약수** (Reservation Count)
   - Number of existing reservations
   - Blue highlight if > 0
   - Prevents deletion if > 0

6. **상태** (Status)
   - Badge: "활성" (Active) or "비활성" (Inactive)
   - Active: Available for new bookings
   - Inactive: Hidden from public

7. **작업** (Actions)
   - 편집 (Edit) - Always enabled
   - 삭제 (Delete) - Disabled if has reservations

---

## Understanding Cascade Effects

### What are Cascade Effects?

When you change a service's duration, it affects the maximum number of bookings allowed per day.

### Example Scenario

**Current State**:
- Service: 보톡스
- Duration: 30 minutes
- Daily Limit: 240 minutes (4 hours)
- Max Bookings: 240 ÷ 30 = 8 bookings/day

**After Changing Duration to 40 minutes**:
- Duration: 40 minutes
- Daily Limit: 240 minutes (unchanged)
- Max Bookings: 240 ÷ 40 = 6 bookings/day

**Cascade Effect**:
- ▼ 2건 감소 (2 bookings decreased)

### Why This Matters

- Affects appointment availability
- May require adjusting daily limits
- Impacts schedule capacity
- Could disappoint patients if slots reduce

### Recommendations

When changing duration:

1. **Review the preview** - Check the cascade effect alert
2. **Consider timing** - Avoid changes during busy periods
3. **Adjust limits** - Update daily limits if needed
4. **Communicate** - Inform staff of changes
5. **Monitor** - Watch booking patterns after change

---

## Common Workflows

### Adding a New Medical Service

```
1. Click [+ 새 시술 추가]
2. Enter code: BODY_CONTOURING
3. Enter name: 바디 컨투어링
4. Select category: 바디케어
5. Set duration: 60 minutes
6. Set buffer: 15 minutes
7. Click [생성]
8. ✅ Service created!
```

### Temporarily Disabling a Service

```
1. Find service in list
2. Click [편집]
3. Toggle off "시술 활성화"
4. Click [수정]
5. Service now hidden from public
6. Can reactivate anytime
```

### Updating Service Duration

```
1. Find service in list
2. Click [편집]
3. Change duration (e.g., 30 → 45 minutes)
4. Review cascade effect preview
5. Adjust if needed
6. Click [수정]
7. ✅ Updated with cascade effects notification
```

### Cleaning Up Unused Services

```
1. Apply filter: 비활성 (Inactive)
2. Review inactive services
3. For services with no reservations:
   - Click [삭제]
   - Choose "완전 삭제"
   - Confirm deletion
4. For services with reservations:
   - Keep as inactive
   - Data preserved for history
```

---

## Troubleshooting

### "Cannot delete - has reservations"

**Problem**: Delete button is disabled

**Cause**: Service has existing reservation records

**Solution**:
- Use "비활성화" instead
- Service hidden but data preserved
- Delete button shows tooltip with reason

### "Duplicate service code"

**Problem**: Error when creating service

**Cause**: Code already exists in database

**Solution**:
- Use unique code
- Check existing services first
- Consider: SERVICE_NAME_V2

### "Changes not visible"

**Problem**: Updates don't appear in list

**Cause**: Browser cache or stale data

**Solution**:
- Click refresh button (🔄)
- Check filters aren't hiding service
- Clear search box

### "Cascade effect not showing"

**Problem**: Duration change doesn't show impact

**Cause**: Service has no daily limit configured

**Solution**:
- This is normal behavior
- Cascade only shows if limit exists
- Go to "서비스 한도 설정" to configure limits

---

## Best Practices

### Service Codes

✅ **Good**:
- `BOTOX_WRINKLE`
- `LASER_FACIAL`
- `BODY_CONTOURING`

❌ **Bad**:
- `botox` (lowercase)
- `Botox-Treatment` (hyphen not allowed)
- `시술1` (Korean characters)

### Service Names

✅ **Good**:
- `주름 보톡스 시술`
- `레이저 페이셜 케어`
- `바디 컨투어링`

✅ **Also Good**:
- `Wrinkle Botox Treatment`
- `Laser Facial Care`

### Durations

✅ **Recommended**:
- Multiples of 10 or 15
- 30, 45, 60, 90 minutes
- Consistent with actual procedure time

❌ **Avoid**:
- Odd numbers (37 minutes)
- Too short (< 10 minutes)
- Too long (> 4 hours)

### Categories

✅ **Consistent**:
- 피부과
- 성형
- 바디케어
- 레이저

❌ **Inconsistent**:
- 피부 (shortened)
- 성형외과 (too specific)
- body (English mixed with Korean)

---

## Keyboard Shortcuts

### General
- `Tab` - Move between fields
- `Enter` - Submit form
- `Esc` - Close dialog

### Navigation
- `Tab` + `Shift` - Move backwards
- Arrow keys - Navigate dropdowns

---

## Mobile Usage

### Responsive Features

- Horizontal scroll for table
- Stacked filters on small screens
- Touch-friendly buttons
- Readable text sizes

### Tips for Mobile

1. Use landscape mode for better table view
2. Filters appear stacked vertically
3. Dialogs adapt to screen size
4. Tap and scroll table horizontally

---

## Advanced Features

### Display Order

Control the order services appear in dropdown menus:

```
Lower number = Higher priority

0 - 주름 보톡스 (most important)
1 - 볼륨 필러
2 - 레이저 치료
10 - 기타 상담 (least important)
```

### Buffer Time

Time reserved between appointments:

```
시술 시간: 40분
준비 시간: 10분
───────────────
총 소요 시간: 50분

Next appointment can start: 50 minutes later
```

---

## Integration with Other Features

### Service Limits

Access from: "서비스 한도 설정" button

- Set daily time limits per service
- Automatically calculates max bookings
- Uses service duration for calculation

### Reservation System

- Active services appear in booking form
- Inactive services hidden from public
- Duration affects time slot availability
- Buffer time included in scheduling

### Calendar Integration

- Services determine appointment lengths
- Display order affects dropdown menus
- Category helps organize calendar views

---

## FAQ

**Q: Can I change a service code after creation?**

A: No, service codes are permanent identifiers and cannot be changed. If you need a different code, create a new service and migrate data.

**Q: What happens to existing reservations when I delete a service?**

A: Soft delete (비활성화) preserves all data. Hard delete (완전 삭제) is only available when there are no reservations.

**Q: How do I reactivate an inactive service?**

A: Click 편집, toggle "시술 활성화" to ON, and save.

**Q: Can I have duplicate service names?**

A: Yes, but codes must be unique. It's better to use unique names for clarity.

**Q: What's the maximum duration I can set?**

A: 480 minutes (8 hours). Most procedures should be much shorter.

**Q: How does buffer time work?**

A: It's added to the procedure time to calculate total slot length. Example: 30min procedure + 10min buffer = 40min total slot.

**Q: Can I bulk edit multiple services?**

A: Not currently. Each service must be edited individually.

**Q: How do I set daily limits?**

A: Use the "서비스 한도 설정" button on the reservations page.

---

## Support

For technical issues or questions:

1. Check this guide
2. Review error messages
3. Try refreshing the page
4. Contact system administrator

---

## Changelog

**Version 1.0** (2025-11-10)
- Initial release
- Full CRUD operations
- Cascade effect preview
- Advanced filtering
- Korean localization

---

**Last Updated**: November 10, 2025
**Version**: 1.0
