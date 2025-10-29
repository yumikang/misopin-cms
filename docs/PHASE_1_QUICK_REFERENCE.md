# Phase 1 Quick Reference & Execution Checklist

## 🎯 Phase Overview
- **Goal**: Database + Parser + Updater + Tests
- **Duration**: 1-2 days
- **Tasks**: 24 granular tasks
- **Critical**: Yes (blocks all future phases)

---

## 📋 Daily Execution Plan

### Day 1 - Morning Session (3 hours)

#### Block 1: Schema Foundation (45 min)
```bash
# Start here at 9:00 AM
[ ] PHASE1-001: Add EditMode enum (5 min)
[ ] PHASE1-002: Add ElementType enum (5 min) | PARALLEL with 001
[ ] PHASE1-003: Extend static_pages model (10 min)
[ ] PHASE1-004: Create editable_elements model (15 min)
[ ] PHASE1-005: Extend versions model (10 min) | PARALLEL with 004

✅ Checkpoint: npx prisma validate
```

#### Block 2: Parser Foundation (45 min)
```bash
# PARALLEL with Block 1
[ ] PHASE1-011: Create parser files (5 min)
[ ] PHASE1-012: Define types (10 min)
[ ] PHASE1-013: Basic parser structure (20 min)
[ ] PHASE1-014: Parse data-editable (30 min)

✅ Checkpoint: npx tsc --noEmit
```

#### Block 3: Updater Foundation (45 min)
```bash
# PARALLEL with Block 2
[ ] PHASE1-017: Create updater files (5 min)
[ ] PHASE1-018: Basic updater structure (15 min)
[ ] PHASE1-019: Update logic (25 min)

✅ Checkpoint: npx tsc --noEmit
```

#### Block 4: Finalize Schema (30 min)
```bash
[ ] PHASE1-006: Validate complete schema (5 min)
[ ] PHASE1-007: Create migration file (5 min)
[ ] PHASE1-008: Enhance migration - enums (10 min)
[ ] PHASE1-009: Enhance migration - tables (15 min)

✅ Checkpoint: Migration SQL reviewed
```

---

### Day 1 - Afternoon Session (3 hours)

#### Block 5: Complete Parser (60 min)
```bash
# Start here at 1:00 PM
[ ] PHASE1-015: Background image parsing (25 min)
[ ] PHASE1-016: Helper functions (15 min)

✅ Checkpoint: Parser fully functional
```

#### Block 6: Complete Updater (40 min)
```bash
[ ] PHASE1-020: Background updater (20 min)

✅ Checkpoint: Updater fully functional
```

#### Block 7: Migration (30 min)
```bash
[ ] PHASE1-010: Create editable_elements table SQL (20 min)
[ ] PHASE1-021: Run migration (10 min)

✅ Checkpoint: npx prisma db pull --print
✅ Critical: Database must be ready
```

#### Block 8: Testing (90 min)
```bash
[ ] PHASE1-022: Parser unit tests (30 min) | PARALLEL
[ ] PHASE1-023: Updater unit tests (25 min) | PARALLEL
[ ] PHASE1-024: Integration tests (20 min)

✅ Final: npm test passes all tests
```

---

## 🚀 Quick Start Commands

### Initial Setup
```bash
cd /Users/blee/Desktop/cms/misopin-cms

# Verify environment
echo $DATABASE_URL
npx prisma validate

# Create working branch
git checkout -b feature/tiptap-phase1
```

### During Development
```bash
# Validate schema frequently
npx prisma validate

# Format schema
npx prisma format

# Check TypeScript
npx tsc --noEmit

# Run tests
npm test -- --watch
```

### Migration Execution
```bash
# Create migration (after schema changes)
npx prisma migrate dev --name add_tiptap_editing_system

# If issues, rollback
npx prisma migrate reset

# Verify in database
psql $DATABASE_URL -c "\\d editable_elements"
```

---

## 🎯 Task Quick Reference

### 5-Minute Tasks (Quick Wins)
- PHASE1-001: EditMode enum
- PHASE1-002: ElementType enum
- PHASE1-006: Validate schema
- PHASE1-007: Create migration
- PHASE1-011: Parser files
- PHASE1-017: Updater files

### 10-Minute Tasks
- PHASE1-003: Extend static_pages
- PHASE1-005: Extend versions
- PHASE1-008: Migration enums
- PHASE1-012: Type definitions
- PHASE1-021: Run migration

### 15-20 Minute Tasks
- PHASE1-004: Create editable_elements model
- PHASE1-009: Migration tables
- PHASE1-016: Helper functions
- PHASE1-018: Basic updater
- PHASE1-020: Background updater
- PHASE1-024: Integration tests

### 25-30 Minute Tasks
- PHASE1-010: Migration table SQL
- PHASE1-014: Parse data-editable
- PHASE1-015: Background parsing
- PHASE1-019: Update logic
- PHASE1-022: Parser tests
- PHASE1-023: Updater tests

---

## ✅ Validation Checkpoints

### After Schema Changes
```bash
npx prisma validate
npx prisma format
npx prisma generate --dry-run

# Expected: ✅ All checks pass
```

### After TypeScript Changes
```bash
npx tsc --noEmit

# Expected: ✅ No errors
```

### After Migration
```bash
npx prisma migrate status

# Verify tables
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"

# Expected tables:
# - editable_elements (NEW)
# - static_pages (MODIFIED)
# - static_page_versions (MODIFIED)
```

### After Parser Implementation
```bash
# Quick smoke test
node -e "
const { parseEditableAttributes } = require('./lib/static-pages/attribute-parser');
const html = '<div data-editable=\"test\">Hello</div>';
const result = parseEditableAttributes(html);
console.log(result);
"

# Expected: { elements: [...], warnings: [], errors: [], stats: {...} }
```

### After Updater Implementation
```bash
# Quick smoke test
node -e "
const { updateElementByAttribute } = require('./lib/static-pages/attribute-updater');
const html = '<div data-editable=\"test\">Old</div>';
const result = updateElementByAttribute(html, 'test', 'New', 'TEXT');
console.log(result.success, result.html.includes('New'));
"

# Expected: true true
```

---

## 🔧 Common Issues & Solutions

### Issue: Prisma validation fails
```bash
# Solution 1: Check syntax
npx prisma format

# Solution 2: Check for duplicate models/enums
grep -n "^model\|^enum" prisma/schema.prisma

# Solution 3: Reset and regenerate
rm -rf node_modules/.prisma
npx prisma generate
```

### Issue: Migration fails
```bash
# Check current migration status
npx prisma migrate status

# If stuck, resolve manually
npx prisma migrate resolve --applied [migration-name]

# Or reset (WARNING: data loss in dev)
npx prisma migrate reset
```

### Issue: TypeScript errors in parser/updater
```bash
# Regenerate Prisma types
npx prisma generate

# Check imports
npx tsc --noEmit --listFiles | grep types
```

### Issue: Tests fail
```bash
# Run specific test
npm test -- attribute-parser.test.ts --verbose

# Check test file paths
ls -la lib/static-pages/__tests__/

# Ensure test dependencies
npm install --save-dev @types/jest jest ts-jest
```

---

## 📊 Progress Tracking

### Progress Indicators
```
Day 1 Morning Complete When:
✅ Schema validated
✅ Migration SQL ready
✅ Parser compiles
✅ Updater compiles

Day 1 Afternoon Complete When:
✅ Migration applied
✅ All unit tests pass
✅ Integration test passes
✅ TypeScript errors = 0

Phase 1 Complete When:
✅ All 24 tasks checked off
✅ Database has new tables
✅ Parser extracts all types
✅ Updater modifies safely
✅ Test coverage > 90%
```

### Key Metrics
```bash
# Test coverage
npm test -- --coverage

# Target: >90% for parser and updater

# TypeScript errors
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# Target: 0

# Migration status
npx prisma migrate status

# Target: "Database schema is up to date!"
```

---

## 🎓 Testing Strategy

### Unit Test Structure
```typescript
// lib/static-pages/__tests__/[module].test.ts

describe('ModuleName', () => {
  describe('Feature Group', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = ...;

      // Act
      const result = ...;

      // Assert
      expect(result).toBe(...);
    });

    it('should handle edge case', () => { ... });
    it('should handle error case', () => { ... });
  });
});
```

### Test Coverage Targets
- **Parser**: 95% (critical path)
- **Updater**: 95% (critical path)
- **Types**: 100% (used everywhere)
- **Integration**: 90% (end-to-end flow)

### Test Data Samples
```typescript
// Simple HTML
const simpleHtml = '<div data-editable="test">Content</div>';

// Rich HTML
const richHtml = '<p data-editable="desc">Line 1<br><strong>Bold</strong></p>';

// Image
const imageHtml = '<img data-editable="img" src="/test.jpg" alt="Test">';

// Background
const bgHtml = '<div id="banner" style="background-image: url(\'/bg.jpg\');"></div>';

// Complete page
const pageHtml = fs.readFileSync('__tests__/fixtures/sample-page.html', 'utf-8');
```

---

## 📁 File Organization

### New Files Created in Phase 1
```
lib/static-pages/
├── types.ts                           # PHASE1-012
├── attribute-parser.ts                # PHASE1-013-016
├── attribute-updater.ts               # PHASE1-018-020
└── __tests__/
    ├── attribute-parser.test.ts       # PHASE1-022
    ├── attribute-updater.test.ts      # PHASE1-023
    └── integration.test.ts            # PHASE1-024

prisma/
├── schema.prisma                      # PHASE1-001-006 (MODIFIED)
└── migrations/
    └── [timestamp]_add_tiptap_editing_system/
        └── migration.sql              # PHASE1-007-010

docs/
├── PHASE_1_TASK_BREAKDOWN.md         # This document
└── PHASE_1_QUICK_REFERENCE.md        # Quick reference
```

### Files to Review Before Starting
```
✅ Read: /Users/blee/Desktop/cms/misopin-cms/docs/TIPTAP_IMPLEMENTATION_PLAN.md
✅ Review: /Users/blee/Desktop/cms/misopin-cms/prisma/schema.prisma
✅ Check: /Users/blee/Desktop/cms/misopin-cms/package.json (dependencies)
```

---

## 🎯 Phase 1 Completion Checklist

### Before Marking Complete
```bash
✅ All 24 tasks completed
✅ npx prisma validate (passes)
✅ npx tsc --noEmit (0 errors)
✅ npm test (all pass)
✅ npm test -- --coverage (>90%)
✅ git status (all changes committed)
✅ Migration applied to dev database
✅ Documentation updated
✅ Code reviewed (self or peer)
✅ No console.log/debugger statements
✅ No TODO comments for core functionality
```

### Phase 1 → Phase 2 Handoff
```bash
✅ Database schema complete and migrated
✅ Parser tested with real HTML samples
✅ Updater tested with all element types
✅ Type definitions exported correctly
✅ All tests passing in CI/CD
✅ Phase 2 dependencies satisfied

Ready to proceed to: API Implementation
```

---

## 💡 Pro Tips

### Speed Up Development
1. **Keep schema file open**: Fast validation feedback
2. **Run tests in watch mode**: `npm test -- --watch`
3. **Use TypeScript in IDE**: Real-time error checking
4. **Keep database client open**: Quick verification
5. **Use git branches**: Easy rollback if needed

### Avoid Common Pitfalls
- ❌ Don't skip validation checkpoints
- ❌ Don't modify migration after creation
- ❌ Don't commit without running tests
- ❌ Don't use `any` types in TypeScript
- ❌ Don't forget to sanitize HTML input

### Optimization Opportunities
- ✅ Batch similar tasks (all enums together)
- ✅ Run independent tasks in parallel
- ✅ Use code snippets for repetitive work
- ✅ Keep terminal sessions for each task category
- ✅ Use IDE multi-cursor for similar edits

---

## 📞 Support & Resources

### Documentation References
- Prisma: https://www.prisma.io/docs
- Cheerio: https://cheerio.js.org/
- TypeScript: https://www.typescriptlang.org/docs/

### Project-Specific
- Main Plan: `/Users/blee/Desktop/cms/misopin-cms/docs/TIPTAP_IMPLEMENTATION_PLAN.md`
- Schema: `/Users/blee/Desktop/cms/misopin-cms/prisma/schema.prisma`
- Package: `/Users/blee/Desktop/cms/misopin-cms/package.json`

### When Stuck
1. Check error messages carefully
2. Review task description in detail breakdown
3. Verify dependencies are complete
4. Run validation checkpoint commands
5. Check existing code patterns in project

---

**Version**: 1.0
**Last Updated**: 2025-10-29
**Next Review**: After Phase 1 completion
