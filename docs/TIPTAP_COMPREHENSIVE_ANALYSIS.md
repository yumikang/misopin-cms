# TipTap Implementation - Comprehensive Analysis

**Analysis Date**: 2025-10-29
**Analyzer**: Claude Code (Structured Thinking Analysis)
**Project**: Misopin CMS - Static Page Editor Migration

---

## Executive Summary

This analysis evaluates the proposed migration from a pattern-based HTML parser to a TipTap WYSIWYG editor using `data-editable` attributes for a medical clinic's static page management system.

**Critical Finding**: The current plan is architecturally sound but requires refinement in several areas to minimize risk and ensure successful delivery.

**Recommendation**: Proceed with Phase 1, but implement the risk mitigation strategies outlined in Section 4 before moving to production.

---

## 1. Problem Analysis

### 1.1 Core Problems with Current System

#### Problem 1: Non-Intuitive HTML Tag Exposure
**Severity**: HIGH
**Impact**: User Experience, Error Rate, Training Cost

**Current State**:
```html
<!-- Users must manually edit HTML in textarea -->
<textarea>
  <h2>Title Here</h2>
  <p>Description with<br>manual line breaks</p>
</textarea>
```

**Issues**:
- Non-technical users must understand HTML tags (`<br>`, `<p>`, `<h2>`)
- High error rate (10% according to success metrics)
- 5-minute average editing time (target: 1 minute)
- Training overhead for new users
- Risk of malformed HTML breaking page layout

**Evidence from Codebase**:
- Current parser uses 5 complex patterns (HTMLParser.ts lines 50-64)
- Each pattern requires different parsing logic
- No validation for user input quality
- Manual HTML tag management in textarea

#### Problem 2: Pattern-Based Parser Fragility
**Severity**: MEDIUM
**Impact**: Maintainability, Scalability, Reliability

**Technical Debt**:
```typescript
// Current parser has 5 fragile patterns:
1. parseSectionTags() - relies on <section> tags
2. parseContentClasses() - hardcoded class names
3. parseContainerDivs() - specific div structures
4. parseBannerImages() - regex-based background image extraction
5. parseLegalDocuments() - complex h2 + content grouping
```

**Weaknesses**:
- **Selector Generation Instability**: CSS selector generation (lines 335-377) relies on DOM structure that can change
- **Pattern Assumptions**: Each pattern assumes specific HTML structures that may not exist in all pages
- **Maintenance Burden**: Adding new page layouts requires new parser patterns
- **No Semantic Markers**: Parser guesses intent from structure, not explicit markers

**Real Risk**: If HTML structure changes (e.g., designer adds wrapper div), parser breaks silently.

#### Problem 3: Section Identification Ambiguity
**Severity**: MEDIUM
**Impact**: User Experience, Content Organization

**Current Behavior**:
- Parser auto-generates IDs: `section-0`, `container-1`, `legal-article-2`
- Users see generic labels: "section-0 제목", "카드 1 제목"
- No logical grouping by business meaning
- Difficult to find specific content to edit

**User Friction**:
- Admin must mentally map "section-3-p-2" to "여드름 치료 설명"
- No visual preview of what section represents
- Trial-and-error to find correct content

### 1.2 Root Cause Analysis

**Why Current System Fails**:

```
Root Cause Chain:
1. No Semantic Markup
   → Parser must infer structure from DOM patterns
   → Fragile, error-prone pattern matching

2. Direct HTML Exposure
   → Users edit raw HTML in textarea
   → High cognitive load, error rate

3. Implicit Section Boundaries
   → No explicit markers for editable regions
   → Parser generates generic IDs
   → Poor UX in admin interface
```

**Solution Requirement**: System must:
1. ✅ Mark editable regions explicitly (`data-editable`)
2. ✅ Provide WYSIWYG editing (TipTap)
3. ✅ Enable semantic labeling (business-meaningful names)
4. ✅ Support mixed content types (text, HTML, images, backgrounds)

---

## 2. Architecture Design Analysis

### 2.1 Data-Editable Attribute Structure

#### Proposed Design Review

**Naming Convention**:
```html
<!-- Pattern: {section}-{type}-{index} -->
<h2 data-editable="section-0-title"
    data-section="first-section">
    착! 가라앉는 여드름
</h2>
```

**Evaluation**:

✅ **Strengths**:
- Simple, predictable naming pattern
- Section grouping via `data-section` attribute
- Type indication in ID (`-title`, `-description`, `-image`)
- Sequential ordering with index

⚠️ **Weaknesses**:
- **Index Fragility**: If sections reordered, indices break
- **Limited Semantics**: "section-0" vs "hero-section" (which is clearer?)
- **No Content Type Inference**: Relies on naming convention, not explicit `data-type`

**Recommendation**: Enhance attribute design:

```html
<!-- IMPROVED VERSION -->
<h2 data-editable="hero-title"
    data-section="hero"
    data-type="html"
    data-label="메인 제목">
    착! 가라앉는 여드름
</h2>

<img data-editable="hero-image"
     data-section="hero"
     data-type="image"
     data-label="히어로 이미지"
     src="../images/acne/hero.webp">
```

**Benefits**:
- Semantic IDs (self-documenting)
- Explicit type declaration (no inference needed)
- User-friendly labels for admin UI
- Reordering doesn't break IDs

### 2.2 Database Schema Design

#### Proposed Schema Evaluation

**New Tables**:

1. **editable_elements** (lines 119-146 in plan)

```prisma
model editable_elements {
  id           String       @id @default(cuid())
  pageId       String
  elementId    String       // data-editable value
  elementType  ElementType
  selector     String       // CSS selector
  label        String
  currentValue String       @db.Text
  sectionName  String?
  order        Int          @default(0)

  @@unique([pageId, elementId])
  @@index([pageId])
  @@index([sectionName])
}
```

**Analysis**:

✅ **Strengths**:
- Caches parsed HTML structure (performance optimization)
- Supports section grouping
- Maintains current values for quick access
- Proper indexes for query performance

⚠️ **Issues**:

1. **Data Duplication**: `currentValue` duplicates HTML file content
   - **Risk**: Source of truth confusion (DB vs file)
   - **Sync Problem**: DB can become stale if file edited externally

2. **Missing Validation Metadata**: No constraints on content
   - Max length?
   - Required fields?
   - Allowed HTML tags?

3. **No Change History**: Can't track when `currentValue` last changed
   - When was it last synced from file?
   - Who made the last change?

**Critical Design Question**: Should DB be source of truth or cache?

**Recommendation**: Clarify data flow:

```yaml
Option A - File as Source of Truth (RECOMMENDED):
  - DB caches parsed structure for performance
  - Every edit writes to file first, then updates DB
  - DB has lastSyncedAt timestamp
  - Periodic sync validation job

Option B - DB as Source of Truth:
  - HTML files are generated from DB
  - Deployment process: DB → HTML files → static site
  - Version control in DB, files are artifacts
  - Requires build/deploy step
```

**Plan recommends Option A implicitly**, but doesn't address sync risks.

#### Enhanced Schema Recommendation

```prisma
model editable_elements {
  id           String       @id @default(cuid())
  pageId       String
  elementId    String
  elementType  ElementType
  selector     String
  label        String

  // Value management
  currentValue String       @db.Text
  lastSyncedAt DateTime     @default(now()) // NEW
  syncStatus   SyncStatus   @default(SYNCED) // NEW

  // Validation rules (optional)
  validation   Json?        // { maxLength, requiredTags, etc }

  // Organization
  sectionName  String?
  order        Int          @default(0)

  page         static_pages @relation(...)

  @@unique([pageId, elementId])
  @@index([pageId, syncStatus]) // NEW
}

enum SyncStatus {
  SYNCED       // DB matches file
  OUT_OF_SYNC  // File changed externally
  PENDING      // Edit in progress
}
```

2. **EditMode Enum** (lines 111-114)

```prisma
enum EditMode {
  PARSER      // Legacy pattern-based
  ATTRIBUTE   // New data-editable
}
```

✅ **Excellent**: Enables gradual migration, backward compatibility

**Missing**: What happens during transition?
- Can pages use BOTH modes simultaneously?
- How to migrate from PARSER to ATTRIBUTE?
- What about rollback if ATTRIBUTE fails?

**Recommendation**: Add migration tracking:

```prisma
model static_pages {
  // ... existing fields
  editMode         EditMode    @default(PARSER)
  migrationStatus  MigrationStatus? // NEW
  migratedAt       DateTime?
  migratedBy       String?
}

enum MigrationStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  ROLLED_BACK
}
```

### 2.3 Parser Logic Architecture

#### Attribute Parser Design (lines 282-395 in plan)

**Core Function**:
```typescript
export function parseEditableAttributes(html: string): EditableElement[]
```

**Logic Flow**:
```
1. Load HTML with Cheerio
2. Find all [data-editable] elements
3. For each element:
   - Determine type (TEXT|HTML|IMAGE|BACKGROUND)
   - Extract current value
   - Generate selector
   - Auto-generate label from ID
4. Auto-detect background images (no data-editable)
5. Return EditableElement[]
```

**Critical Analysis**:

✅ **Strengths**:
- Simple, explicit element selection
- Type inference logic (lines 307-320)
- Handles mixed content (editable + auto-detected)
- Generates stable selectors

⚠️ **Weaknesses**:

1. **Type Inference Fragility** (lines 311-320):
```typescript
if ($elem.is('img')) {
  type = 'IMAGE';
} else if ($elem.find('br, strong, em, a').length > 0) {
  type = 'HTML'; // ← PROBLEM: False positives
} else {
  type = 'TEXT';
}
```

**Issue**: `<p>Simple text</p>` becomes TEXT, but `<p>Text with <strong>bold</strong></p>` becomes HTML.
- Inconsistent editing experience
- Users may accidentally strip formatting
- No clear UX indicator of type difference

**Fix**: Use explicit `data-type` attribute instead of inference.

2. **Label Generation** (lines 359-373):
```typescript
function generateLabel($elem, id: string): string {
  const parts = id.split('-');
  const type = parts[parts.length - 1]; // "title" from "section-0-title"

  const labelMap: Record<string, string> = {
    'label': '라벨',
    'title': '제목',
    'description': '설명',
    // ...
  };

  return labelMap[type] || type;
}
```

**Problems**:
- Only uses last segment of ID
- `section-0-title` → "제목" (not helpful)
- `hero-main-title` → "제목" (same label!)
- No context about which section

**Better Approach**: Use `data-label` attribute or combine section + type:
```typescript
// Option 1: Explicit label
<h2 data-editable="hero-title" data-label="메인 히어로 제목">

// Option 2: Smart generation
function generateLabel($elem, id: string, section: string): string {
  const type = labelMap[parts[parts.length - 1]];
  const sectionName = formatSectionName(section); // "first-section" → "첫 번째 섹션"
  return `${sectionName} ${type}`; // "첫 번째 섹션 제목"
}
```

3. **Background Image Auto-Detection** (lines 334-354):

```typescript
$('[style*="background-image"]').each((i, elem) => {
  if ($elem.attr('data-editable')) return; // Skip if already marked

  const style = $elem.attr('style') || '';
  const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);

  const id = `bg-${$elem.attr('id') || $elem.attr('class')?.split(' ')[0] || `auto-${i}`}`;
  // ...
});
```

**Risk Analysis**:
- **ID Instability**: Auto-generated IDs change if HTML structure changes
- **False Positives**: Catches ALL background images (decorative sprites, icons)
- **No User Control**: Users can't opt-out of auto-detection

**Recommendation**:
- Require explicit `data-editable` for ALL editable backgrounds
- Provide migration tool to add attributes to existing backgrounds
- Remove auto-detection (too risky)

### 2.4 Update Logic Architecture

#### HTML Updater Design (lines 397-458)

**Core Functions**:
```typescript
function updateElementByAttribute(
  html: string,
  elementId: string,
  newValue: string,
  elementType: 'TEXT'|'HTML'|'IMAGE'|'BACKGROUND'
): string

function updateBackgroundImage(
  html: string,
  selector: string,
  newImageUrl: string
): string
```

**Analysis**:

✅ **Correct Approach**:
- Type-specific update logic
- Cheerio-based DOM manipulation (safer than regex)
- Separate function for background images (complex regex replacement)

⚠️ **Critical Issue**: **No HTML Sanitization**

```typescript
case 'HTML':
  $elem.html(newValue); // ← SECURITY RISK: No sanitization!
  break;
```

**Attack Vector**:
```javascript
// Malicious input from TipTap editor (if DOMPurify bypassed)
const newValue = '<img src=x onerror="alert(document.cookie)">';

// Injected into HTML file
<div data-editable="section-0-desc">
  <img src=x onerror="alert(document.cookie)"> <!-- XSS vulnerability -->
</div>
```

**Even though plan mentions DOMPurify** (line 816), updater doesn't enforce it.

**Fix**: Add server-side sanitization:
```typescript
import { JSDOM } from 'jsdom';
import DOMPurify from 'isomorphic-dompurify';

function updateElementByAttribute(...) {
  // ...
  switch (elementType) {
    case 'HTML':
      const sanitized = DOMPurify.sanitize(newValue, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'target'],
      });
      $elem.html(sanitized);
      break;
    // ...
  }
}
```

#### Background Image Regex (lines 447-453)

```typescript
const newStyle = style.replace(
  /url\(['"]?[^'")\s]+['"]?\)/,
  `url('${newImageUrl}')`
);
```

**Issues**:
- **First Match Only**: If multiple `url()` in style, only first is replaced
- **No Validation**: Doesn't check if `newImageUrl` is valid path
- **Injection Risk**: `newImageUrl` could contain `')` breaking CSS

**Fix**:
```typescript
function updateBackgroundImage(html, selector, newImageUrl): string {
  // Validate URL
  if (!isValidImagePath(newImageUrl)) {
    throw new Error('Invalid image URL');
  }

  // Escape special characters
  const escaped = newImageUrl.replace(/['"\(\)]/g, '\\$&');

  const $elem = $(selector);
  const style = $elem.attr('style') || '';

  // Target background-image specifically
  const newStyle = style.replace(
    /background-image:\s*url\(['"]?[^'")\s]+['"]?\)/i,
    `background-image: url('${escaped}')`
  );

  $elem.attr('style', newStyle);
  return $.html();
}
```

---

## 3. Implementation Strategy Analysis

### 3.1 Critical Path Identification

**Phase Dependencies**:
```
Phase 1 (DB + Parser) ──→ Phase 2 (API)
                            │
                            ▼
                       Phase 3 (TipTap)
                            │
                            ▼
                       Phase 4 (UI)
                            │
                            ├──→ Phase 5 (HTML Marking)
                            │         │
                            │         ▼
                            └──────→ Phase 6 (Test + Deploy)
```

**Critical Path**: Phase 1 → 2 → 3 → 4 → 5 → 6 (fully sequential)

**Bottleneck Analysis**:

| Phase | Duration | Bottleneck | Parallelization Opportunity |
|-------|----------|------------|----------------------------|
| Phase 1 | 1-2 days | DB migration approval | ❌ Must be sequential |
| Phase 2 | 1-2 days | API contract design | ⚠️ Can start API design during Phase 1 |
| Phase 3 | 2 days | TipTap learning curve | ✅ Can prototype alongside Phase 2 |
| Phase 4 | 1-2 days | UI/UX design | ⚠️ Depends on API contract |
| Phase 5 | 1 day | Manual HTML marking | ✅ Can start on 1-2 pages early |
| Phase 6 | 1 day | Testing dependencies | ❌ Must be last |

**Optimization Recommendations**:

1. **Parallel Track: HTML Marking Early**
   - Start marking `acne.html` during Phase 1
   - Validate parser logic with real data early
   - Uncover attribute design issues before full implementation

2. **Parallel Track: TipTap Prototype**
   - Build standalone TipTap component during Phase 1-2
   - Test editor behavior independently
   - Identify integration challenges early

3. **Phase 2-3 Overlap**:
   - Design API contracts in Phase 1
   - Implement API and TipTap components in parallel
   - Integration in Phase 4

**Revised Timeline with Parallelization**:
```
Day 1-2:  Phase 1 (DB) + HTML marking prototype + API design
Day 3:    Phase 2 (API implementation)
Day 3-4:  Phase 3 (TipTap components) [parallel with Phase 2]
Day 5:    Phase 4 (UI integration)
Day 6:    Phase 5 (Bulk HTML marking with script)
Day 7:    Phase 6 (Testing + deploy)
```

**Time Savings**: 7 days → 7 days (but higher confidence, earlier issue detection)

### 3.2 Parallelization Analysis

**Independent Operations**:

✅ **Can Parallelize**:
- DB schema design + HTML marking design
- API implementation + TipTap component development
- Backend testing + Frontend component testing
- Documentation + Code implementation

❌ **Cannot Parallelize**:
- DB migration → API implementation (API needs new tables)
- API → UI integration (UI calls API endpoints)
- HTML marking → Parsing validation (need marked HTML to test parser)
- Implementation → Production testing (need complete system)

**Resource Considerations**:
- **Solo Developer**: Limited parallelization benefit
- **Small Team (2-3)**: Can split backend/frontend work
- **Recommendation**: Even solo, prototype in parallel to validate assumptions

### 3.3 Phase-by-Phase Recommendations

#### Phase 1: Database Foundation (Days 1-2)

**Proposed Tasks** (lines 713-727):
1. ✅ Prisma schema update
2. ✅ Migration execution
3. ✅ attribute-parser.ts implementation
4. ✅ attribute-updater.ts implementation
5. ✅ Unit tests

**Enhanced Tasks**:
1. **Pre-Migration Validation**:
   ```bash
   # Backup production database
   pg_dump misopin_cms > backup_pre_tiptap_$(date +%Y%m%d).sql

   # Test migration on staging first
   prisma migrate dev --name add_editable_elements --create-only
   # Review generated SQL before applying
   ```

2. **Schema Enhancements**:
   - Add `lastSyncedAt`, `syncStatus` to `editable_elements`
   - Add `migrationStatus` to `static_pages`
   - Add validation constraints

3. **Parser Improvements**:
   - Remove type inference, require `data-type` attribute
   - Improve label generation (use `data-label` or semantic names)
   - Remove auto-detection of background images
   - Add validation for required attributes

4. **Updater Security**:
   - Implement server-side HTML sanitization
   - Add URL validation for images
   - Escape special characters in CSS values

5. **Early HTML Marking**:
   - Mark `acne.html` with enhanced attributes
   - Test parser with real data
   - Validate attribute naming convention

**Completion Criteria**:
- ✅ Migration runs successfully on staging
- ✅ Parser extracts all elements from marked `acne.html`
- ✅ Updater successfully modifies HTML and preserves structure
- ✅ Unit tests cover edge cases (missing attributes, malformed HTML, XSS attempts)
- ✅ **NEW**: Rollback plan documented and tested

#### Phase 2: API Implementation (Day 3)

**Proposed Tasks** (lines 729-741):
1. ✅ GET `/api/static-pages/[id]/editable`
2. ✅ POST `/api/static-pages/[id]/update-element`
3. ✅ POST `/api/static-pages/[id]/reparse`
4. ✅ Image upload integration
5. ✅ API testing

**Enhanced Tasks**:

1. **API Contract Design** (do in Phase 1):
```typescript
// GET /api/static-pages/[id]/editable
{
  pageId: string
  pageTitle: string
  editMode: 'PARSER' | 'ATTRIBUTE'
  sections: {
    [sectionName: string]: {
      name: string
      order: number
      elements: Array<{
        elementId: string
        elementType: 'TEXT' | 'HTML' | 'IMAGE' | 'BACKGROUND'
        label: string
        currentValue: string
        validation?: {
          maxLength?: number
          required?: boolean
          allowedTags?: string[]
        }
      }>
    }
  }
  totalElements: number
  lastParsedAt: string | null
  syncStatus: 'SYNCED' | 'OUT_OF_SYNC'
}
```

2. **Caching Strategy**:
   - Check `lastParsedAt` vs `lastEdited` (lines 494-497)
   - Add cache invalidation header
   - Support `?forceReparse=true` query param

3. **Error Handling**:
   - Validate `editMode` before parsing
   - Handle missing `data-editable` attributes gracefully
   - Return detailed error messages with context

4. **Transaction Safety** (lines 511-536):
   - ✅ Good: Uses Prisma transaction for delete + insert
   - ⚠️ Add: Concurrent request protection (optimistic locking)
   ```typescript
   const page = await prisma.static_pages.findUnique({
     where: { id, version: expectedVersion } // Add version check
   });
   if (!page) {
     throw new Error('Page modified by another user');
   }
   ```

5. **Backup Integration** (lines 622-625):
   - ✅ Good: Creates backup before update
   - ⚠️ Add: Verify backup integrity
   - ⚠️ Add: Atomic file operations (write to temp, then rename)

**Completion Criteria**:
- ✅ All API endpoints return correct data structure
- ✅ Postman/Insomnia test collection passes
- ✅ Error scenarios handled (missing file, invalid element, concurrent edits)
- ✅ **NEW**: API response time < 500ms for parse, < 200ms for update
- ✅ **NEW**: Backup verification passes

#### Phase 3: TipTap Components (Days 3-4)

**Proposed Tasks** (lines 743-755):
1. ✅ TipTap package installation
2. ✅ EditableTextField component
3. ✅ EditableHtmlField component (TipTap)
4. ✅ EditableImageField component
5. ✅ EditableSectionGroup component

**Enhanced Tasks**:

1. **TipTap Configuration**:
```typescript
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import DOMPurify from 'isomorphic-dompurify';

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      // Disable features not needed
      heading: { levels: [2, 3] }, // Only h2, h3
      codeBlock: false,
      blockquote: false,
    }),
    Placeholder.configure({
      placeholder: '내용을 입력하세요...',
    }),
  ],
  content: sanitizedInitialValue,
  onUpdate: ({ editor }) => {
    const html = editor.getHTML();
    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h2', 'h3', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: [],
    });
    onChange(sanitized);
  },
});
```

2. **Component Design**:

**EditableTextField**:
```typescript
interface EditableTextFieldProps {
  elementId: string
  label: string
  value: string
  onChange: (value: string) => void
  maxLength?: number
  required?: boolean
}

// Simple input for plain text (no TipTap needed)
<input
  type="text"
  value={value}
  onChange={(e) => onChange(e.target.value)}
  maxLength={maxLength}
/>
```

**EditableHtmlField**:
```typescript
interface EditableHtmlFieldProps {
  elementId: string
  label: string
  value: string
  onChange: (value: string) => void
  allowedTags?: string[]
  placeholder?: string
}

// Full TipTap editor with toolbar
<TipTapEditor
  content={value}
  onUpdate={onChange}
  allowedTags={allowedTags}
/>
```

**EditableImageField**:
```typescript
interface EditableImageFieldProps {
  elementId: string
  label: string
  currentUrl: string
  onChange: (newUrl: string) => void
  uploadEndpoint: string
  alt?: string
}

// Image preview + upload button
<div>
  <img src={currentUrl} alt={alt} />
  <input type="file" onChange={handleUpload} accept="image/*" />
  <progress value={uploadProgress} />
</div>
```

3. **DOMPurify Integration**:
   - ⚠️ Plan mentions it (line 213) but doesn't show implementation
   - Must sanitize on both client AND server
   - Configure allowed tags per element type

4. **Auto-Save**:
   - Debounced onChange (wait 2s after typing stops)
   - Visual indicator (saving... / saved / error)
   - Retry logic on failure

**Completion Criteria**:
- ✅ TipTap editor renders and accepts input
- ✅ Toolbar buttons work (bold, italic, line break)
- ✅ HTML output is sanitized
- ✅ Image upload shows progress and preview
- ✅ **NEW**: Keyboard shortcuts work (Cmd+B for bold, etc.)
- ✅ **NEW**: Mobile touch input works properly

#### Phase 4: UI Integration (Day 5)

**Proposed Tasks** (lines 757-769):
1. ✅ Create edit page
2. ✅ Section grouping UI
3. ✅ Save/cancel buttons
4. ✅ Loading/error states
5. ✅ Responsive design

**Enhanced Tasks**:

1. **Page Layout**:
```tsx
// app/admin/static-pages/[id]/edit/page.tsx
export default function EditStaticPage({ params }: { params: { id: string } }) {
  const { data, isLoading, error } = useSWR(`/api/static-pages/${id}/editable`);

  return (
    <div className="edit-page">
      <header>
        <h1>{data?.pageTitle}</h1>
        <div className="actions">
          <button onClick={handleSave} disabled={!hasChanges}>저장</button>
          <button onClick={handleCancel}>취소</button>
          <button onClick={handlePreview}>미리보기</button>
        </div>
      </header>

      <main className="sections">
        {Object.entries(data?.sections || {}).map(([name, section]) => (
          <EditableSectionGroup
            key={name}
            section={section}
            onElementChange={handleElementChange}
          />
        ))}
      </main>

      <aside className="sidebar">
        <VersionHistory pageId={id} />
        <ChangeIndicator hasChanges={hasChanges} />
      </aside>
    </div>
  );
}
```

2. **State Management**:
```typescript
// Track changes locally before saving
const [editedElements, setEditedElements] = useState<Map<string, string>>(new Map());
const [isSaving, setIsSaving] = useState(false);

const handleElementChange = (elementId: string, newValue: string) => {
  setEditedElements(prev => new Map(prev).set(elementId, newValue));
};

const handleSave = async () => {
  setIsSaving(true);
  try {
    // Save all changed elements
    for (const [elementId, newValue] of editedElements) {
      await fetch(`/api/static-pages/${id}/update-element`, {
        method: 'POST',
        body: JSON.stringify({ elementId, newValue, elementType: '...' }),
      });
    }
    setEditedElements(new Map()); // Clear changes
    toast.success('저장되었습니다');
  } catch (error) {
    toast.error('저장 실패');
  } finally {
    setIsSaving(false);
  }
};
```

3. **UX Improvements**:
   - Unsaved changes warning (beforeunload event)
   - Keyboard shortcuts (Cmd+S to save)
   - Undo/redo support (editor-level)
   - Live character count for text fields
   - Validation feedback (required fields, max length)

4. **Responsive Design**:
   - Mobile: Single column layout
   - Tablet: Sidebar below content
   - Desktop: Sidebar on right

**Completion Criteria**:
- ✅ All sections display correctly
- ✅ Edits update local state
- ✅ Save button persists changes
- ✅ Loading states show during async operations
- ✅ Error messages are helpful and actionable
- ✅ **NEW**: Mobile UX is tested and works
- ✅ **NEW**: Browser back button doesn't lose unsaved changes

#### Phase 5: HTML Marking (Day 6)

**Proposed Tasks** (lines 771-781):
1. ✅ Mark `acne.html` as template
2. ✅ Auto-marking script
3. ✅ Bulk mark 11 remaining pages
4. ✅ Parser validation

**Critical Enhancement**: Automation + Validation

**Script Design**:
```typescript
// scripts/add-data-attributes.ts
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface MarkingRule {
  selector: string
  elementId: string
  sectionName: string
  elementType: 'TEXT' | 'HTML' | 'IMAGE' | 'BACKGROUND'
  label: string
}

const acneMarkingRules: MarkingRule[] = [
  {
    selector: '.first-section .heading-main',
    elementId: 'hero-title',
    sectionName: 'hero',
    elementType: 'HTML',
    label: '메인 제목',
  },
  {
    selector: '.first-section .text-lead',
    elementId: 'hero-description',
    sectionName: 'hero',
    elementType: 'HTML',
    label: '메인 설명',
  },
  // ... more rules
];

function applyMarkingRules(htmlPath: string, rules: MarkingRule[]) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const $ = cheerio.load(html, { decodeEntities: false });

  rules.forEach(rule => {
    const $elem = $(rule.selector);
    if ($elem.length === 0) {
      console.warn(`Selector not found: ${rule.selector}`);
      return;
    }

    $elem.attr('data-editable', rule.elementId);
    $elem.attr('data-section', rule.sectionName);
    $elem.attr('data-type', rule.elementType.toLowerCase());
    $elem.attr('data-label', rule.label);
  });

  fs.writeFileSync(htmlPath, $.html(), 'utf-8');
  console.log(`Marked ${rules.length} elements in ${htmlPath}`);
}

// Apply to all pages
const pages = ['acne', 'botox', 'diet', /* ... */];
pages.forEach(page => {
  const htmlPath = path.join(__dirname, `../Misopin-renew/dist/${page}.html`);
  const rules = generateRulesForPage(page); // Page-specific rules
  applyMarkingRules(htmlPath, rules);
});
```

**Validation Script**:
```typescript
// scripts/validate-marking.ts
import { parseEditableAttributes } from '../lib/static-pages/attribute-parser';

function validateMarking(htmlPath: string) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const elements = parseEditableAttributes(html);

  const issues: string[] = [];

  // Check for duplicate IDs
  const ids = elements.map(e => e.id);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) {
    issues.push(`Duplicate IDs: ${duplicates.join(', ')}`);
  }

  // Check for missing required attributes
  elements.forEach(elem => {
    if (!elem.sectionName) {
      issues.push(`Missing data-section: ${elem.id}`);
    }
    if (!elem.label) {
      issues.push(`Missing data-label: ${elem.id}`);
    }
  });

  // Check for empty values
  elements.forEach(elem => {
    if (!elem.currentValue || elem.currentValue.trim() === '') {
      issues.push(`Empty value: ${elem.id}`);
    }
  });

  if (issues.length > 0) {
    console.error(`Validation failed for ${htmlPath}:`);
    issues.forEach(issue => console.error(`  - ${issue}`));
    return false;
  }

  console.log(`✅ ${htmlPath}: ${elements.length} elements validated`);
  return true;
}
```

**Workflow**:
```bash
# 1. Mark acne.html manually (template)
# 2. Generate rules from marked template
npm run extract-marking-rules -- acne.html > marking-rules.json

# 3. Apply rules to other pages (with page-specific adjustments)
npm run apply-marking -- botox.html --rules marking-rules.json

# 4. Validate all marked pages
npm run validate-marking -- dist/*.html

# 5. Test parser
npm run test-parser -- acne.html
```

**Completion Criteria**:
- ✅ All 12 pages have `data-editable` attributes
- ✅ No duplicate element IDs within a page
- ✅ All elements have required attributes (data-section, data-label)
- ✅ Parser successfully extracts all elements
- ✅ **NEW**: Validation script passes for all pages
- ✅ **NEW**: Git diff reviewed (ensure no unintended changes)

#### Phase 6: Testing + Deployment (Day 7)

**Proposed Tasks** (lines 783-795):
1. ✅ Integration tests
2. ✅ Performance optimization
3. ✅ User guide
4. ✅ Production deployment

**Comprehensive Testing Checklist**:

**1. Unit Tests**:
```typescript
// Parser tests
describe('parseEditableAttributes', () => {
  it('extracts TEXT elements', () => { /* ... */ });
  it('extracts HTML elements with formatting', () => { /* ... */ });
  it('extracts IMAGE elements', () => { /* ... */ });
  it('extracts BACKGROUND elements', () => { /* ... */ });
  it('handles missing data-section gracefully', () => { /* ... */ });
  it('handles duplicate IDs', () => { /* ... */ });
  it('handles malformed HTML', () => { /* ... */ });
});

// Updater tests
describe('updateElementByAttribute', () => {
  it('updates TEXT element', () => { /* ... */ });
  it('sanitizes HTML on update', () => { /* ... */ });
  it('prevents XSS injection', () => { /* ... */ });
  it('handles missing element gracefully', () => { /* ... */ });
  it('preserves HTML structure', () => { /* ... */ });
});
```

**2. Integration Tests**:
```typescript
// API tests
describe('GET /api/static-pages/[id]/editable', () => {
  it('returns parsed elements for ATTRIBUTE mode', () => { /* ... */ });
  it('caches results when lastParsedAt is recent', () => { /* ... */ });
  it('reparses when forceReparse=true', () => { /* ... */ });
  it('handles PARSER mode pages (legacy)', () => { /* ... */ });
});

describe('POST /api/static-pages/[id]/update-element', () => {
  it('updates element and creates backup', () => { /* ... */ });
  it('updates DB and file atomically', () => { /* ... */ });
  it('creates version history entry', () => { /* ... */ });
  it('handles concurrent updates', () => { /* ... */ });
  it('rolls back on error', () => { /* ... */ });
});
```

**3. E2E Tests** (using Playwright):
```typescript
test('Edit acne.html page', async ({ page }) => {
  // Navigate to edit page
  await page.goto('/admin/static-pages/acne-edit');

  // Wait for content to load
  await page.waitForSelector('[data-section="hero"]');

  // Edit title
  const titleEditor = page.locator('[data-element-id="hero-title"] .ProseMirror');
  await titleEditor.fill('새로운 제목');

  // Upload image
  await page.locator('[data-element-id="hero-image"] input[type="file"]')
    .setInputFiles('test-image.webp');
  await page.waitForSelector('.upload-success');

  // Save changes
  await page.click('button:has-text("저장")');
  await page.waitForSelector('.toast-success');

  // Verify changes persisted
  await page.reload();
  await expect(titleEditor).toHaveText('새로운 제목');
});
```

**4. Performance Tests**:
```typescript
// Load time tests
test('Parse large page in <500ms', async () => {
  const start = Date.now();
  const result = await fetch('/api/static-pages/acne/editable');
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(500);
});

// Memory tests
test('Parser handles 100+ elements without memory leak', () => {
  // Monitor memory usage during parsing
});
```

**5. Security Tests**:
```typescript
// XSS prevention
test('Sanitizes malicious HTML', async () => {
  const malicious = '<img src=x onerror="alert(1)">';
  const response = await fetch('/api/static-pages/acne/update-element', {
    method: 'POST',
    body: JSON.stringify({
      elementId: 'hero-title',
      newValue: malicious,
      elementType: 'HTML',
    }),
  });

  const updated = await response.json();
  expect(updated.success).toBe(true);

  // Verify HTML file doesn't contain onerror
  const html = fs.readFileSync('dist/acne.html', 'utf-8');
  expect(html).not.toContain('onerror');
});

// SQL injection prevention (Prisma handles this, but verify)
test('Handles malicious element IDs', async () => {
  const malicious = "hero-title'; DROP TABLE editable_elements; --";
  // Should fail gracefully, not execute SQL
});
```

**6. Migration Tests**:
```typescript
// Test PARSER → ATTRIBUTE migration
test('Migrate page from PARSER to ATTRIBUTE mode', async () => {
  // Start with PARSER mode page
  const page = await prisma.static_pages.findUnique({ where: { id: 'test-page' } });
  expect(page.editMode).toBe('PARSER');

  // Mark HTML with data-editable attributes
  // Reparse
  await fetch('/api/static-pages/test-page/reparse?forceReparse=true');

  // Update editMode
  await prisma.static_pages.update({
    where: { id: 'test-page' },
    data: { editMode: 'ATTRIBUTE' },
  });

  // Verify editable_elements populated
  const elements = await prisma.editable_elements.findMany({
    where: { pageId: 'test-page' },
  });
  expect(elements.length).toBeGreaterThan(0);
});
```

**Performance Optimization**:
```typescript
// 1. Caching parsed elements in DB (already in plan)
// 2. Lazy load sections (don't load all elements at once)
// 3. Debounce auto-save
// 4. Optimize Cheerio parsing (reuse $ instance)
// 5. Add DB indexes (already in schema)
// 6. Compress API responses (gzip)
```

**User Guide**:
```markdown
# Static Page Editor User Guide

## Editing a Page

1. Navigate to Admin → Static Pages
2. Click "Edit" on the page you want to modify
3. Sections are grouped logically (Hero, Features, etc.)
4. Click any text/image to edit
5. Changes auto-save after 2 seconds
6. Click "Save" to finalize all changes

## Text Editing

- **Bold**: Cmd+B or click B button
- **Italic**: Cmd+I or click I button
- **Line Break**: Shift+Enter

## Image Uploading

1. Click "Change Image" button
2. Select new image (JPG, PNG, WebP)
3. Image is automatically converted to WebP and optimized
4. Preview updates immediately

## Version History

- Every save creates a version
- View history in right sidebar
- Click any version to restore

## Tips

- Don't worry about breaking the page - we have backups!
- Use "Preview" button to see changes before publishing
- Contact admin if you see any errors
```

**Deployment Checklist**:
```yaml
Pre-Deployment:
  - [ ] All tests pass (unit, integration, E2E)
  - [ ] Code review completed
  - [ ] Database migration tested on staging
  - [ ] Backup of production DB created
  - [ ] Rollback plan documented
  - [ ] Performance benchmarks met

Deployment Steps:
  1. [ ] Enable maintenance mode
  2. [ ] Deploy database migration
  3. [ ] Deploy application code
  4. [ ] Run post-deployment smoke tests
  5. [ ] Mark 1-2 pages with data-editable attributes
  6. [ ] Test editing functionality on production
  7. [ ] Disable maintenance mode
  8. [ ] Monitor error logs for 24 hours

Post-Deployment:
  - [ ] Gradual migration of remaining pages
  - [ ] User training session
  - [ ] Monitor performance metrics
  - [ ] Collect user feedback
```

**Completion Criteria**:
- ✅ All test suites pass
- ✅ Performance benchmarks met (parse <500ms, update <200ms)
- ✅ User guide published
- ✅ Production deployment successful
- ✅ **NEW**: Zero critical bugs in first 48 hours
- ✅ **NEW**: User satisfaction >4/5 (collect feedback)

---

## 4. Risk Assessment

### 4.1 Technical Risks

#### Risk 1: Database Migration Failure
**Severity**: CRITICAL
**Probability**: LOW
**Impact**: System downtime, data loss

**Scenario**:
```sql
-- Migration fails mid-transaction
ALTER TABLE "static_pages" ADD COLUMN "editMode" TEXT DEFAULT 'PARSER';
-- ✅ Success

CREATE TABLE "editable_elements" (...);
-- ❌ ERROR: Out of disk space / Permission denied / Connection lost
-- Result: Partial migration, inconsistent state
```

**Mitigation**:
1. **Test on Staging**: Run migration on staging DB first (exact copy of production)
2. **Backup Before Migration**:
   ```bash
   pg_dump -U postgres -h 141.164.60.51 -d misopin_cms > backup_pre_migration.sql
   ```
3. **Transaction Wrapper**: Prisma migrations are atomic, but verify:
   ```bash
   prisma migrate deploy --preview-feature
   # Review generated SQL
   prisma migrate deploy
   ```
4. **Rollback Plan**:
   ```bash
   # If migration fails, restore from backup
   psql -U postgres -h 141.164.60.51 -d misopin_cms < backup_pre_migration.sql
   ```
5. **Disk Space Check**: Ensure DB server has >20% free space
6. **Off-Peak Deployment**: Run migration during low-traffic hours

**Residual Risk**: LOW (with proper testing and backup)

#### Risk 2: Data Synchronization Drift
**Severity**: HIGH
**Probability**: MEDIUM
**Impact**: DB shows stale data, editing conflicts

**Scenario**:
```
1. Admin edits page via UI → DB updated
2. Developer edits HTML file directly → File updated, DB not synced
3. Admin loads page in UI → sees stale DB data
4. Admin saves changes → overwrites developer's changes!
```

**Root Cause**: DB caches parsed HTML, but HTML file is source of truth

**Mitigation**:
1. **Sync Detection**:
   ```typescript
   // Before showing edit UI, check sync status
   const fileModTime = fs.statSync(htmlPath).mtime;
   const lastParsedAt = new Date(page.lastParsedAt);

   if (fileModTime > lastParsedAt) {
     // File changed externally, reparse
     await reparseAndSync(pageId);
   }
   ```

2. **Sync Status Indicator**:
   ```tsx
   {syncStatus === 'OUT_OF_SYNC' && (
     <Alert severity="warning">
       HTML file was modified externally. Click "Refresh" to sync.
       <button onClick={handleReparse}>Refresh</button>
     </Alert>
   )}
   ```

3. **Periodic Sync Job**:
   ```typescript
   // Cron job: Every hour, check for drift
   cron.schedule('0 * * * *', async () => {
     const pages = await prisma.static_pages.findMany({
       where: { editMode: 'ATTRIBUTE' },
     });

     for (const page of pages) {
       const fileModTime = fs.statSync(page.filePath).mtime;
       if (fileModTime > new Date(page.lastParsedAt)) {
         await reparseAndSync(page.id);
       }
     }
   });
   ```

4. **Lock File During Edit**:
   ```typescript
   // When edit session starts, create lock file
   fs.writeFileSync(`${htmlPath}.lock`, `Editing by ${userId} at ${new Date()}`);

   // On save or cancel, remove lock
   fs.unlinkSync(`${htmlPath}.lock`);

   // Check for lock before external edits
   if (fs.existsSync(`${htmlPath}.lock`)) {
     console.warn('File is being edited in UI, skip external edit');
   }
   ```

5. **File Watcher** (optional):
   ```typescript
   // Watch HTML files for external changes
   chokidar.watch('Misopin-renew/dist/*.html').on('change', async (path) => {
     const page = await prisma.static_pages.findFirst({
       where: { filePath: { endsWith: path.split('/').pop() } },
     });

     if (page) {
       await prisma.static_pages.update({
         where: { id: page.id },
         data: {
           lastParsedAt: null, // Force reparse on next access
           syncStatus: 'OUT_OF_SYNC',
         },
       });
     }
   });
   ```

**Residual Risk**: LOW (with sync detection and periodic jobs)

#### Risk 3: HTML Sanitization Bypass
**Severity**: CRITICAL
**Probability**: MEDIUM
**Impact**: XSS vulnerability, site defacement

**Attack Vectors**:
1. **Client-Side Bypass**:
   ```javascript
   // Attacker modifies client-side DOMPurify config
   DOMPurify.sanitize(payload, { ALLOWED_TAGS: ['script'] });
   ```

2. **Server-Side Missing Sanitization**:
   ```typescript
   // Updater directly inserts unsanitized HTML (current risk in plan)
   $elem.html(newValue); // No sanitization!
   ```

3. **Mutation XSS**:
   ```html
   <!-- Input passes sanitization -->
   <p>Innocent text</p>

   <!-- But browser mutates it into: -->
   <p>Innocent text</p><script>alert(1)</script>
   ```

**Mitigation**:
1. **Defense in Depth**:
   ```typescript
   // Layer 1: Client-side sanitization (UX feedback)
   const clientSanitized = DOMPurify.sanitize(input, CLIENT_CONFIG);

   // Layer 2: Server-side sanitization (security enforcement)
   const serverSanitized = DOMPurify.sanitize(input, SERVER_CONFIG);

   // Layer 3: Content Security Policy
   res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'");
   ```

2. **Strict Sanitization Config**:
   ```typescript
   const SANITIZE_CONFIG = {
     ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h2', 'h3', 'ul', 'ol', 'li', 'a'],
     ALLOWED_ATTR: ['href'], // Only href for links
     ALLOW_DATA_ATTR: false,
     ALLOW_UNKNOWN_PROTOCOLS: false,
     SAFE_FOR_TEMPLATES: true,
   };
   ```

3. **Output Encoding**:
   ```typescript
   // When rendering user content, use React's automatic escaping
   <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
   ```

4. **Regular Security Audits**:
   ```bash
   # Run security scanner
   npm audit
   npm audit fix

   # Test with OWASP XSS payloads
   npm run test:security
   ```

**Residual Risk**: LOW (with defense in depth)

#### Risk 4: Cheerio Parser Brittleness
**Severity**: MEDIUM
**Probability**: MEDIUM
**Impact**: Elements not parsed, updates fail

**Scenario**:
```html
<!-- Original HTML -->
<div data-editable="hero-title">Title</div>

<!-- After external edit (prettier, minifier, etc.) -->
<div
  data-editable="hero-title"
  class="new-class">Title</div>

<!-- Parser may fail to find element if selector is too specific -->
```

**Mitigation**:
1. **Stable Selectors**: Use only `data-editable` attribute
   ```typescript
   // ✅ Good: Selector based only on data-editable
   const $elem = $(`[data-editable="${elementId}"]`);

   // ❌ Bad: Selector based on class/ID that can change
   const $elem = $(`#hero .title[data-editable="${elementId}"]`);
   ```

2. **Attribute Preservation**:
   ```typescript
   // When updating, preserve all attributes except target
   const $elem = $(`[data-editable="${elementId}"]`);
   const attrs = $elem.attr(); // Get all attributes
   $elem.html(newValue);
   // Attributes are preserved automatically by Cheerio
   ```

3. **Validation After Update**:
   ```typescript
   // After updating HTML, verify element still exists
   const updatedHtml = $.html();
   const $verify = cheerio.load(updatedHtml);
   const $found = $verify(`[data-editable="${elementId}"]`);

   if ($found.length === 0) {
     throw new Error(`Element ${elementId} lost during update`);
   }
   ```

4. **Schema Validation**:
   ```typescript
   // Validate HTML structure before and after
   const schema = {
     requiredAttributes: ['data-editable', 'data-section', 'data-type'],
     allowedTags: ['div', 'p', 'h1', 'h2', 'h3', 'img'],
   };

   validateHtmlSchema(html, schema);
   ```

**Residual Risk**: LOW (with stable selectors and validation)

#### Risk 5: Image Upload Failure
**Severity**: MEDIUM
**Probability**: LOW
**Impact**: Broken images, poor UX

**Failure Modes**:
1. Upload interrupted (network error)
2. Disk full on server
3. Image processing fails (WebP conversion)
4. File permissions issue

**Mitigation**:
1. **Chunked Upload with Resume**:
   ```typescript
   // Use tus protocol for resumable uploads
   import { Upload } from 'tus-js-client';

   const upload = new Upload(file, {
     endpoint: '/api/upload',
     retryDelays: [0, 1000, 3000],
     onSuccess: () => { /* ... */ },
     onError: () => { /* ... */ },
   });
   ```

2. **Atomic File Operations**:
   ```typescript
   // Upload to temp location first
   const tempPath = `/tmp/upload-${uuid}.webp`;
   await sharp(buffer).webp().toFile(tempPath);

   // Verify file integrity
   const stats = fs.statSync(tempPath);
   if (stats.size === 0) {
     throw new Error('Empty file');
   }

   // Move to final location atomically
   fs.renameSync(tempPath, finalPath);
   ```

3. **Cleanup on Failure**:
   ```typescript
   try {
     await uploadImage(file);
   } catch (error) {
     // Clean up temp files
     fs.unlinkSync(tempPath);
     // Restore original image
     fs.copyFileSync(backupPath, originalPath);
     throw error;
   }
   ```

4. **Progress Feedback**:
   ```tsx
   <ProgressBar value={uploadProgress} />
   <button disabled={isUploading}>
     {isUploading ? 'Uploading...' : 'Upload Image'}
   </button>
   ```

**Residual Risk**: LOW (with retry logic and atomicity)

### 4.2 Migration Risks

#### Risk 6: Incomplete HTML Marking
**Severity**: HIGH
**Probability**: MEDIUM
**Impact**: Some content not editable, user frustration

**Scenario**:
```html
<!-- acne.html marked correctly -->
<h2 data-editable="hero-title">Title</h2>

<!-- botox.html has different structure, marking missed -->
<div class="hero">
  <h2>Title</h2> <!-- Missing data-editable! -->
</div>
```

**Mitigation**:
1. **Automated Marking Script** (as proposed in Phase 5)
2. **Validation Report**:
   ```typescript
   // Generate coverage report
   const report = {
     totalElements: 150,
     markedElements: 142,
     unmarkedElements: [
       { page: 'botox.html', selector: '.hero h2', reason: 'Missing data-editable' },
       // ...
     ],
     coverage: '94.7%',
   };
   ```

3. **Visual Marking Tool** (optional):
   ```tsx
   // Admin UI: Highlight unmarked elements
   <div className="marking-mode">
     {unmarkedElements.map(elem => (
       <div className="unmarked" onClick={() => addMarking(elem)}>
         {elem.preview}
       </div>
     ))}
   </div>
   ```

4. **Incremental Migration**:
   ```yaml
   Week 1: Mark and migrate acne.html (pilot)
   Week 2: Mark and migrate 3 more pages
   Week 3: Mark and migrate remaining 8 pages
   # Allows time to identify and fix marking issues
   ```

**Residual Risk**: MEDIUM → LOW (with validation and incremental approach)

#### Risk 7: Version History Migration
**Severity**: LOW
**Probability**: HIGH
**Impact**: Historical data format mismatch

**Issue**: Existing version history uses `sections` JSON, new system uses `changedData`

**Example**:
```json
// Old format
{
  "version": 1,
  "sections": [
    { "id": "section-0-heading", "content": "Old title" }
  ]
}

// New format
{
  "version": 2,
  "changeType": "element_update",
  "changedData": {
    "elementId": "hero-title",
    "oldValue": "Old title",
    "newValue": "New title"
  }
}
```

**Mitigation**:
1. **Keep Both Formats**:
   ```prisma
   model static_page_versions {
     sections     Json      // Old format (for legacy versions)
     changedData  Json?     // New format (for new versions)
   }
   ```

2. **Display Adapter**:
   ```typescript
   function formatVersionHistory(version: static_page_versions) {
     if (version.changedData) {
       // New format
       return `Updated ${version.changedData.elementId}`;
     } else {
       // Old format
       return `Changed ${version.sections.length} sections`;
     }
   }
   ```

3. **No Need to Migrate**: Old versions stay in old format, new versions use new format

**Residual Risk**: NONE (handled by keeping both formats)

#### Risk 8: Rollback Complexity
**Severity**: MEDIUM
**Probability**: LOW
**Impact**: Cannot revert to old system if new system fails

**Scenario**: New system has critical bug, need to rollback to PARSER mode

**Mitigation**:
1. **Dual-Mode Support** (already in plan):
   ```typescript
   if (page.editMode === 'PARSER') {
     // Use old parser
     return legacyParse(html);
   } else {
     // Use new attribute parser
     return parseEditableAttributes(html);
   }
   ```

2. **Feature Flag**:
   ```typescript
   const USE_ATTRIBUTE_EDITOR = process.env.FEATURE_ATTRIBUTE_EDITOR === 'true';

   if (!USE_ATTRIBUTE_EDITOR) {
     // Force all pages to PARSER mode
     return <LegacyEditor />;
   }
   ```

3. **Rollback Steps**:
   ```sql
   -- Revert editMode for all pages
   UPDATE static_pages SET "editMode" = 'PARSER';

   -- Optionally: Drop new tables (keep data for investigation)
   -- DROP TABLE editable_elements;

   -- Redeploy previous application version
   ```

4. **Keep Old Code**: Don't delete legacy parser until new system proven stable

**Residual Risk**: LOW (dual-mode support enables quick rollback)

### 4.3 Operational Risks

#### Risk 9: Performance Degradation
**Severity**: MEDIUM
**Probability**: MEDIUM
**Impact**: Slow admin UI, poor UX

**Bottlenecks**:
1. **Parsing 100+ elements on every page load**
2. **N+1 DB queries for elements**
3. **Large HTML files (>1MB) slow to parse**

**Mitigation**:
1. **Caching** (already in plan):
   ```typescript
   // Only reparse if file changed
   if (fileModTime > lastParsedAt) {
     await reparse();
   } else {
     // Use cached elements from DB
     return cachedElements;
   }
   ```

2. **Lazy Loading**:
   ```tsx
   // Load first section immediately, defer others
   <Suspense fallback={<Skeleton />}>
     <EditableSectionGroup section={firstSection} />
   </Suspense>

   <Suspense fallback={<Skeleton />}>
     <LazyEditableSectionGroup sectionId={otherId} />
   </Suspense>
   ```

3. **Batch DB Queries**:
   ```typescript
   // ✅ Good: Single query
   const elements = await prisma.editable_elements.findMany({
     where: { pageId },
     orderBy: { order: 'asc' },
   });

   // ❌ Bad: N queries
   for (const section of sections) {
     const elements = await prisma.editable_elements.findMany({
       where: { pageId, sectionName: section.name },
     });
   }
   ```

4. **Performance Monitoring**:
   ```typescript
   // Add timing logs
   console.time('parse');
   const elements = parseEditableAttributes(html);
   console.timeEnd('parse'); // Should be <500ms
   ```

**Residual Risk**: LOW (with caching and optimization)

#### Risk 10: User Training Gap
**Severity**: MEDIUM
**Probability**: HIGH
**Impact**: Users don't adopt new system, continue manual editing

**Mitigation**:
1. **Guided Onboarding**:
   ```tsx
   // First-time user tour
   <Joyride
     steps={[
       { target: '.section-group', content: 'Sections are organized here' },
       { target: '.tiptap-editor', content: 'Click to edit text' },
       { target: '.save-button', content: 'Save your changes' },
     ]}
   />
   ```

2. **Contextual Help**:
   ```tsx
   <Tooltip title="Click to edit. Use Cmd+B for bold, Cmd+I for italic.">
     <EditableHtmlField />
   </Tooltip>
   ```

3. **Training Session**:
   - 30-minute demo for all users
   - Record video for future reference
   - Provide quick reference card

4. **Feedback Channel**:
   ```tsx
   <button onClick={openFeedback}>
     Having trouble? Send feedback
   </button>
   ```

**Residual Risk**: MEDIUM (requires active user engagement)

---

## 5. Success Criteria

### 5.1 Functional Success Criteria

| Criterion | Measurement | Target | Current |
|-----------|-------------|--------|---------|
| **Editable Elements Coverage** | % of page content editable | 100% | 0% |
| **Edit Success Rate** | % of edits saved without error | >98% | ~90% |
| **HTML Validity** | % of updates preserving valid HTML | 100% | ~90% |
| **Version History Completeness** | % of edits tracked in history | 100% | 100% |
| **Rollback Success** | % of rollbacks restoring correct state | 100% | N/A |

**Validation**:
```typescript
// Automated test suite
describe('Functional Success Criteria', () => {
  test('All marked elements are editable', () => {
    const elements = parseEditableAttributes(html);
    elements.forEach(elem => {
      expect(isEditable(elem)).toBe(true);
    });
  });

  test('Edits save successfully', async () => {
    const result = await updateElement('hero-title', 'New value');
    expect(result.success).toBe(true);
  });

  test('HTML remains valid after update', async () => {
    await updateElement('hero-desc', '<p>Valid HTML</p>');
    const html = fs.readFileSync('acne.html', 'utf-8');
    expect(isValidHTML(html)).toBe(true);
  });
});
```

### 5.2 Performance Success Criteria

| Criterion | Measurement | Target | Acceptable |
|-----------|-------------|--------|------------|
| **Parse Time** | Time to parse 100 elements | <500ms | <1000ms |
| **Update Time** | Time to save single element | <200ms | <500ms |
| **Page Load Time** | Time to load edit UI | <2s | <3s |
| **Auto-Save Latency** | Delay between typing and save | 2s | 5s |
| **Image Upload Time** | Time to upload + process 5MB image | <10s | <20s |

**Monitoring**:
```typescript
// Performance tracking
const metrics = {
  parseTime: performance.measure('parse', 'parseStart', 'parseEnd'),
  updateTime: performance.measure('update', 'updateStart', 'updateEnd'),
  // ...
};

// Alert if metrics exceed threshold
if (metrics.parseTime > 1000) {
  console.error('Parse time exceeded threshold:', metrics.parseTime);
  Sentry.captureMessage('Slow parse', { extra: metrics });
}
```

### 5.3 User Experience Success Criteria

| Criterion | Measurement | Target | Current |
|-----------|-------------|--------|---------|
| **Edit Time** | Average time to edit page | <1 min | ~5 min |
| **HTML Knowledge Required** | % of users needing HTML training | 0% | 100% |
| **Error Rate** | % of edits requiring correction | <2% | ~10% |
| **User Satisfaction** | NPS or satisfaction score | >4/5 | N/A |
| **Training Time** | Time to onboard new user | <15 min | ~60 min |

**Measurement**:
```typescript
// Usage analytics
trackEvent('edit_page', {
  pageId: 'acne',
  editDuration: 45, // seconds
  elementsEdited: 3,
  errorsEncountered: 0,
});

// User feedback survey
<Survey
  questions={[
    'How easy was it to edit the page? (1-5)',
    'Did you need HTML knowledge? (Yes/No)',
    'Any features missing?',
  ]}
  onSubmit={submitFeedback}
/>
```

### 5.4 Security Success Criteria

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| **XSS Prevention** | % of XSS payloads blocked | 100% |
| **SQL Injection Prevention** | % of SQLi attempts blocked | 100% |
| **File Access Control** | % of unauthorized file access blocked | 100% |
| **HTML Sanitization** | % of malicious HTML sanitized | 100% |

**Testing**:
```typescript
// Security test suite
const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  // ... OWASP XSS cheat sheet
];

XSS_PAYLOADS.forEach(payload => {
  test(`Blocks XSS payload: ${payload}`, async () => {
    const result = await updateElement('hero-title', payload);
    const html = fs.readFileSync('acne.html', 'utf-8');
    expect(html).not.toContain('alert');
    expect(html).not.toContain('onerror');
  });
});
```

### 5.5 Reliability Success Criteria

| Criterion | Measurement | Target |
|-----------|-------------|--------|
| **Uptime** | % of time system is available | >99.9% |
| **Backup Success** | % of backups created successfully | 100% |
| **Data Loss Prevention** | % of edits preserved on failure | 100% |
| **Concurrent Edit Handling** | % of conflicts resolved correctly | 100% |

**Monitoring**:
```typescript
// Reliability checks
setInterval(async () => {
  // Health check
  const isHealthy = await checkSystemHealth();
  if (!isHealthy) {
    alertOps('System unhealthy');
  }

  // Verify backups
  const backups = fs.readdirSync(backupDir);
  if (backups.length < 20) {
    alertOps('Backup count low');
  }
}, 60000); // Every minute
```

---

## 6. Recommendations for Phase 1

Based on the comprehensive analysis, here are specific recommendations for proceeding with Phase 1:

### 6.1 Phase 1 Enhancement Checklist

**Before Starting**:
- [ ] Review and approve this analysis document
- [ ] Set up staging environment (exact copy of production)
- [ ] Create production database backup
- [ ] Document rollback procedure
- [ ] Set up error monitoring (Sentry, LogRocket, etc.)

**Database Schema**:
- [ ] Add `lastSyncedAt`, `syncStatus` to `editable_elements`
- [ ] Add `migrationStatus` to `static_pages`
- [ ] Add `SyncStatus` enum
- [ ] Add index on `[pageId, syncStatus]`
- [ ] Test migration on staging DB first

**Parser Implementation**:
- [ ] Remove type inference, require explicit `data-type` attribute
- [ ] Improve label generation (use `data-label` or semantic names)
- [ ] Remove auto-detection of background images (require explicit marking)
- [ ] Add validation for required attributes
- [ ] Add error handling for malformed HTML

**Updater Implementation**:
- [ ] Add server-side HTML sanitization (DOMPurify)
- [ ] Add URL validation for images
- [ ] Escape special characters in CSS values
- [ ] Add validation after update (verify element still exists)
- [ ] Implement atomic file operations (write to temp, then rename)

**HTML Marking**:
- [ ] Design enhanced attribute schema (add `data-type`, `data-label`)
- [ ] Manually mark `acne.html` as template
- [ ] Test parser with marked `acne.html`
- [ ] Iterate on attribute design based on test results
- [ ] Document attribute naming conventions

**Testing**:
- [ ] Write unit tests for parser (20+ test cases)
- [ ] Write unit tests for updater (15+ test cases)
- [ ] Write security tests (XSS, SQLi prevention)
- [ ] Write integration tests (parser + updater)
- [ ] Set up automated test running (CI/CD)

**Documentation**:
- [ ] Document attribute schema and naming conventions
- [ ] Document parser logic and edge cases
- [ ] Document updater logic and security measures
- [ ] Create migration guide for PARSER → ATTRIBUTE
- [ ] Create rollback procedure

### 6.2 Enhanced Attribute Schema (Recommended)

```html
<!-- Enhanced schema with explicit metadata -->
<h2 data-editable="hero-title"
    data-section="hero"
    data-type="html"
    data-label="메인 제목"
    data-max-length="100"
    data-required="true">
    착! 가라앉는 여드름
</h2>

<p data-editable="hero-description"
   data-section="hero"
   data-type="html"
   data-label="메인 설명"
   data-allowed-tags="p,br,strong,em">
    피부 속 염증·피지선·각질층의 균형을 회복해<br>
    원인부터 개선하는 구조적 접근을 지향합니다
</p>

<img data-editable="hero-image"
     data-section="hero"
     data-type="image"
     data-label="히어로 이미지"
     data-alt="여드름 치료 시술"
     src="../images/acne/hero.webp"
     alt="여드름 치료 시술">

<div data-editable="hero-background"
     data-section="hero"
     data-type="background"
     data-label="히어로 배경"
     style="background-image: url('../images/acne/bg.webp')">
</div>
```

**Benefits**:
- No type inference (explicit `data-type`)
- User-friendly labels (explicit `data-label`)
- Validation rules embedded (max-length, required, allowed-tags)
- Semantic element IDs (self-documenting)
- Alt text for images (accessibility)

### 6.3 Risk Mitigation Priorities

**Must Address Before Production**:
1. ✅ Server-side HTML sanitization (Security)
2. ✅ Database migration testing on staging (Reliability)
3. ✅ Backup verification (Data safety)
4. ✅ Sync detection logic (Data consistency)

**Should Address in Phase 1**:
1. ⚠️ Enhanced attribute schema (Maintainability)
2. ⚠️ Validation after update (Reliability)
3. ⚠️ Atomic file operations (Data safety)

**Can Address Later**:
1. 📋 File watcher for external changes (Nice-to-have)
2. 📋 Visual marking tool (Nice-to-have)
3. 📋 Advanced performance optimizations (Only if needed)

### 6.4 Success Metrics for Phase 1

**Phase 1 Completion Criteria**:
- ✅ Migration runs successfully on staging
- ✅ Parser extracts 100% of marked elements from `acne.html`
- ✅ Updater successfully modifies all element types (TEXT, HTML, IMAGE, BACKGROUND)
- ✅ HTML structure preserved after 10+ updates
- ✅ XSS payloads blocked (20+ test cases pass)
- ✅ Unit tests pass (40+ tests total)
- ✅ Performance benchmarks met (parse <500ms, update <200ms)
- ✅ Rollback tested successfully

**Phase 1 Success Indicators**:
```yaml
Technical:
  - Migration completes in <5 minutes
  - Parser accuracy: 100% (all elements found)
  - Updater accuracy: 100% (all updates successful)
  - Test coverage: >80%
  - Zero critical security vulnerabilities

Operational:
  - Staging environment matches production
  - Rollback procedure documented and tested
  - Error monitoring configured
  - Backup verification automated
```

---

## 7. Conclusion

### 7.1 Overall Assessment

**Architecture**: ✅ **SOUND** with enhancements
**Feasibility**: ✅ **HIGH** with proper risk mitigation
**Timeline**: ✅ **REALISTIC** (7-10 days)
**Risk Level**: ⚠️ **MEDIUM → LOW** with recommended mitigations

### 7.2 Key Findings

**Strengths of Current Plan**:
1. ✅ Clear separation of concerns (parser, updater, API, UI)
2. ✅ Gradual migration path (dual-mode support)
3. ✅ Existing backup system leveraged
4. ✅ Proper database indexing and relationships
5. ✅ Realistic phase breakdown

**Areas Requiring Enhancement**:
1. ⚠️ **Security**: Server-side sanitization not enforced
2. ⚠️ **Data Sync**: No mechanism to detect file/DB drift
3. ⚠️ **Attribute Design**: Type inference fragile, labels generic
4. ⚠️ **Validation**: Missing input validation and integrity checks
5. ⚠️ **Error Handling**: Insufficient coverage of edge cases

**Critical Risks**:
1. 🔴 **XSS vulnerability** if sanitization not enforced
2. 🔴 **Data loss** if file/DB sync fails
3. 🟡 **User adoption failure** without proper training
4. 🟡 **Performance degradation** without caching
5. 🟡 **Incomplete marking** without validation

### 7.3 Go/No-Go Decision

**Recommendation**: ✅ **GO** with conditions

**Conditions for Proceeding**:
1. **Immediate**: Implement server-side HTML sanitization
2. **Immediate**: Test database migration on staging
3. **Phase 1**: Enhance attribute schema with explicit metadata
4. **Phase 1**: Implement sync detection logic
5. **Phase 1**: Add comprehensive test coverage

**Confidence Level**: **HIGH** (85%) with mitigations, **MEDIUM** (60%) without

### 7.4 Next Steps

**Immediate Actions** (Today):
1. Review this analysis with stakeholders
2. Approve/modify enhanced attribute schema
3. Set up staging environment
4. Create production backup

**Phase 1 Start** (Next 1-2 Days):
1. Implement enhanced database schema
2. Develop parser with validation
3. Develop updater with sanitization
4. Mark `acne.html` as pilot
5. Write comprehensive tests

**Phase 1 Validation** (Day 3):
1. Run full test suite
2. Performance benchmarks
3. Security audit
4. Staging deployment
5. Go/No-Go for Phase 2

---

## Appendix A: Quick Reference

### Parser API
```typescript
parseEditableAttributes(html: string): EditableElement[]
```

### Updater API
```typescript
updateElementByAttribute(
  html: string,
  elementId: string,
  newValue: string,
  elementType: 'TEXT'|'HTML'|'IMAGE'|'BACKGROUND'
): string
```

### Database Schema
```prisma
model editable_elements {
  id           String       @id @default(cuid())
  pageId       String
  elementId    String
  elementType  ElementType
  selector     String
  label        String
  currentValue String       @db.Text
  sectionName  String?
  order        Int          @default(0)
  lastSyncedAt DateTime     @default(now())
  syncStatus   SyncStatus   @default(SYNCED)

  @@unique([pageId, elementId])
  @@index([pageId, syncStatus])
}

enum SyncStatus {
  SYNCED
  OUT_OF_SYNC
  PENDING
}
```

### Attribute Schema
```html
<element data-editable="semantic-id"
         data-section="section-name"
         data-type="text|html|image|background"
         data-label="User Friendly Label">
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-29
**Review Status**: Pending Stakeholder Approval
