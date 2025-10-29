# Editable Attributes Reference Guide

Complete reference for all data-editable attributes added to Misopin-renew static pages.

## Naming Convention

**Format**: `{page-name}-{section}-{element-type}`

**Pages**:
- acne
- botox
- diet
- filler
- hair-removal
- jeomin
- lifting
- milia
- mole
- peeling
- skinbooster
- tattoo

**Sections**:
- `hero` - Main banner section
- `intro` - Introduction section
- `principle` - Treatment principle/mechanism
- `process` - Treatment steps
- `banner` - Closing banner/CTA

---

## Common Attribute Patterns

### Hero Section (All Pages)

```html
<!-- Section wrapper -->
<div id="sub_main_banner"
     data-section="hero"
     data-editable-bg="{page}-hero-background"
     data-label="히어로 배경">

  <!-- Category -->
  <p data-editable="{page}-hero-category"
     data-label="카테고리">
    볼륨/리프팅
  </p>

  <!-- Breadcrumb -->
  <span data-editable="{page}-hero-breadcrumb"
        data-label="브레드크럼">
    필러
  </span>
</div>
```

**Example IDs**:
- `botox-hero-background`
- `botox-hero-category`
- `botox-hero-breadcrumb`

---

### Intro Section (All Pages)

```html
<!-- Section wrapper -->
<section class="first-section" data-section="intro">

  <!-- Label/Tag -->
  <div class="first-section-label"
       data-editable="{page}-intro-label"
       data-label="라벨">
    ANTI-WRINKLE
  </div>

  <!-- Title -->
  <h2 data-editable="{page}-intro-title"
      data-label="소개 제목">
    주름과 라인 한 번에 개선하는 보톡스
  </h2>

  <!-- USP Text -->
  <p class="usp-text"
     data-editable="{page}-intro-usp"
     data-label="USP 문구"
     data-type="html">
    빠른 효과, 자연스러운 표정 회복을 위한<br>
    미소핀의 프리미엄 보톡스
  </p>

  <!-- Descriptions (1-3 paragraphs) -->
  <p data-editable="{page}-intro-desc1"
     data-label="설명 1"
     data-type="html">
    설명 텍스트...
  </p>

  <!-- Main Image -->
  <img data-editable="{page}-intro-image"
       data-label="소개 이미지"
       src="..."
       alt="...">
</section>
```

**Example IDs**:
- `botox-intro-label`
- `botox-intro-title`
- `botox-intro-usp`
- `botox-intro-desc1`
- `botox-intro-desc2`
- `botox-intro-image`

---

### Principle Section (Most Pages)

```html
<!-- Section wrapper -->
<section class="has-background" data-section="principle">

  <!-- Label -->
  <div class="text-label"
       data-editable="{page}-principle-label"
       data-label="원리 라벨">
    Treatment Principle
  </div>

  <!-- Title -->
  <h2 data-editable="{page}-principle-title"
      data-label="원리 제목">
    보톡스 작용 원리
  </h2>

  <!-- Description -->
  <p data-editable="{page}-principle-desc"
     data-label="원리 설명">
    설명 텍스트...
  </p>

  <!-- Flow Steps (typically 3) -->
  <div class="flow-step">
    <h4 data-editable="{page}-principle-step1-title"
        data-label="원리 1단계 제목">
      보톡스 주입
    </h4>
    <p data-editable="{page}-principle-step1-desc"
       data-label="원리 1단계 설명">
      보툴리눔 톡신 A형
    </p>
  </div>

  <!-- Duration Info -->
  <p data-editable="{page}-principle-duration"
     data-label="지속기간"
     data-type="html">
    지속기간은 <strong>6개월~1년</strong> 정도입니다.
  </p>
</section>
```

**Example IDs**:
- `botox-principle-label`
- `botox-principle-title`
- `botox-principle-desc`
- `botox-principle-step1-title`
- `botox-principle-step1-desc`
- `botox-principle-step2-title`
- `botox-principle-step2-desc`
- `botox-principle-step3-title`
- `botox-principle-step3-desc`
- `botox-principle-duration`

---

### Process Section (Most Pages)

```html
<!-- Section wrapper -->
<section data-section="process">

  <!-- Title -->
  <h2 data-editable="{page}-process-title"
      data-label="시술단계 제목">
    시술단계
  </h2>

  <!-- Subtitle -->
  <p data-editable="{page}-process-subtitle"
     data-label="시술단계 부제목"
     data-type="html">
    미소핀에서는 모든 시술을 안전하고<br>
    검증된 과정으로 시행합니다.
  </p>

  <!-- Process Steps (typically 4) -->
  <div class="process-step">
    <h4 data-editable="{page}-process-step1-title"
        data-label="1단계 제목">
      전문의 상담
    </h4>
    <p data-editable="{page}-process-step1-desc"
       data-label="1단계 설명">
      개인별 주름 상태와 피부 타입 분석
    </p>
  </div>
</section>
```

**Example IDs**:
- `botox-process-title`
- `botox-process-subtitle`
- `botox-process-step1-title`
- `botox-process-step1-desc`
- `botox-process-step2-title`
- `botox-process-step2-desc`
- `botox-process-step3-title`
- `botox-process-step3-desc`
- `botox-process-step4-title`
- `botox-process-step4-desc`

---

### Banner Section (All Pages)

```html
<!-- Section wrapper -->
<section class="banner-section"
         data-section="banner"
         data-editable-bg="{page}-banner-background"
         data-label="배너 배경">

  <!-- Label -->
  <div class="text-label"
       data-editable="{page}-banner-label"
       data-label="배너 라벨">
    Youth begins with authenticity
  </div>

  <!-- Title -->
  <h2 data-editable="{page}-banner-title"
      data-label="배너 제목">
    나다움에서 시작되는 진짜 동안
  </h2>

  <!-- Descriptions (typically 2) -->
  <p data-editable="{page}-banner-desc1"
     data-label="배너 설명 1">
    진정성이 만드는 변치 않는 아름다움,
  </p>

  <p data-editable="{page}-banner-desc2"
     data-label="배너 설명 2">
    아름다운 변화를 위해 미소핀이 함께합니다.
  </p>
</section>
```

**Example IDs**:
- `botox-banner-background`
- `botox-banner-label`
- `botox-banner-title`
- `botox-banner-desc1`
- `botox-banner-desc2`

---

## Attribute Types

### 1. TEXT (Default)
Simple text content without HTML formatting.

```html
<h2 data-editable="botox-intro-title"
    data-label="소개 제목">
  보톡스 시술
</h2>
```

**Characteristics**:
- No `data-type` attribute (defaults to text)
- Single-line or multi-line plain text
- No HTML tags inside

### 2. HTML
Text content with HTML formatting (line breaks, emphasis, etc.).

```html
<p data-editable="botox-intro-desc1"
   data-label="설명 1"
   data-type="html">
  보툴리눔 톡신을 이용해...<br>
  미간·이마·눈가 주름을...
</p>
```

**Characteristics**:
- `data-type="html"` attribute
- May contain `<br>`, `<strong>`, `<em>`, etc.
- Preserves formatting

### 3. IMAGE
Image elements.

```html
<img data-editable="botox-intro-image"
     data-label="소개 이미지"
     src="../images/botox/blog02.webp"
     alt="보톡스 시술">
```

**Characteristics**:
- Applied to `<img>` tags
- Edits `src` attribute
- Should have `alt` attribute

### 4. BACKGROUND
Background images on container elements.

```html
<section data-editable-bg="botox-hero-background"
         data-label="히어로 배경"
         style="background-image: url(...)">
```

**Characteristics**:
- Uses `data-editable-bg` (not `data-editable`)
- Applied to sections/divs with background images
- Edits `background-image` CSS property

---

## Complete ID List by Page

### Botox (34 elements)

**Hero** (3):
- `botox-hero-background` (BACKGROUND)
- `botox-hero-category` (TEXT)
- `botox-hero-breadcrumb` (TEXT)

**Intro** (6):
- `botox-intro-label` (TEXT)
- `botox-intro-title` (TEXT)
- `botox-intro-usp` (HTML)
- `botox-intro-desc1` (HTML)
- `botox-intro-desc2` (HTML)
- `botox-intro-image` (IMAGE)

**Principle** (10):
- `botox-principle-label` (TEXT)
- `botox-principle-title` (TEXT)
- `botox-principle-desc` (TEXT)
- `botox-principle-step1-title` (TEXT)
- `botox-principle-step1-desc` (TEXT)
- `botox-principle-step2-title` (TEXT)
- `botox-principle-step2-desc` (TEXT)
- `botox-principle-step3-title` (TEXT)
- `botox-principle-step3-desc` (TEXT)
- `botox-principle-duration` (HTML)

**Process** (10):
- `botox-process-title` (TEXT)
- `botox-process-subtitle` (HTML)
- `botox-process-step1-title` (TEXT)
- `botox-process-step1-desc` (TEXT)
- `botox-process-step2-title` (TEXT)
- `botox-process-step2-desc` (TEXT)
- `botox-process-step3-title` (TEXT)
- `botox-process-step3-desc` (TEXT)
- `botox-process-step4-title` (TEXT)
- `botox-process-step4-desc` (TEXT)

**Banner** (5):
- `botox-banner-background` (BACKGROUND)
- `botox-banner-label` (TEXT)
- `botox-banner-title` (TEXT)
- `botox-banner-desc1` (TEXT)
- `botox-banner-desc2` (TEXT)

---

## Usage Examples

### Reading Elements

```typescript
import { parseEditableAttributes } from '@/lib/static-pages/attribute-parser';

const html = fs.readFileSync('botox.html', 'utf-8');
const result = parseEditableAttributes(html, {
  includeBackgrounds: true,
  includeImages: true,
  validateAttributes: true,
});

// Access all elements
result.elements.forEach(element => {
  console.log(`ID: ${element.id}`);
  console.log(`Label: ${element.label}`);
  console.log(`Type: ${element.type}`);
  console.log(`Value: ${element.value}`);
  console.log(`Section: ${element.sectionName}`);
});
```

### Updating Elements

```typescript
// Update a specific element
const updatedHtml = updateElementValue(
  html,
  'botox-intro-title',
  '새로운 보톡스 시술 제목'
);

// Update image
const updatedHtml = updateElementValue(
  html,
  'botox-intro-image',
  '/images/new-botox-image.jpg'
);

// Update background
const updatedHtml = updateBackgroundImage(
  html,
  'botox-hero-background',
  '/images/new-hero-bg.jpg'
);
```

### Filtering Elements

```typescript
// Get all elements in a section
const heroElements = result.elements.filter(
  el => el.sectionName === 'hero'
);

// Get all text elements
const textElements = result.elements.filter(
  el => el.type === 'TEXT'
);

// Get all images
const images = result.elements.filter(
  el => el.type === 'IMAGE'
);
```

---

## Validation Rules

### Required Attributes

**For TEXT/HTML elements**:
- `data-editable` - Unique ID
- `data-label` - Korean label

**For IMAGE elements**:
- `data-editable` - Unique ID
- `data-label` - Korean label
- `src` - Image path
- `alt` - Alt text (recommended)

**For BACKGROUND elements**:
- `data-editable-bg` - Unique ID
- `data-label` - Korean label
- `data-section` - Section name
- `style` with `background-image` (recommended)

### Naming Rules

1. **IDs must be unique** across entire page
2. **IDs must follow format**: `{page}-{section}-{element}`
3. **Labels must be in Korean** for clarity
4. **Sections must be lowercase**: hero, intro, principle, process, banner

### Type Guidelines

- Use `TEXT` for simple headings, labels
- Use `HTML` for paragraphs with `<br>`, `<strong>`, etc.
- Use `IMAGE` for `<img>` tags
- Use `BACKGROUND` for container backgrounds

---

## Testing & Validation

### Run Parser Test

```bash
npx tsx scripts/test-parse-static-pages.ts
```

### Check Specific Page

```bash
npx tsx -e "
import { parseEditableAttributes } from './lib/static-pages/attribute-parser';
import * as fs from 'fs';

const html = fs.readFileSync('/path/to/botox.html', 'utf-8');
const result = parseEditableAttributes(html);
console.log(JSON.stringify(result, null, 2));
"
```

### Validate IDs

All IDs are automatically validated for:
- Uniqueness (no duplicates)
- Format compliance
- Required attributes
- Empty values

---

## Integration Points

### Database Schema

Elements should be stored with:
- `id` - Unique identifier (e.g., 'botox-intro-title')
- `pageSlug` - Page identifier (e.g., 'botox')
- `section` - Section name (e.g., 'intro')
- `label` - Korean label
- `type` - TEXT, HTML, IMAGE, or BACKGROUND
- `value` - Current content
- `updatedAt` - Last update timestamp

### API Endpoints

```
GET    /api/static-pages/:pageSlug/elements
GET    /api/static-pages/:pageSlug/elements/:id
PUT    /api/static-pages/:pageSlug/elements/:id
POST   /api/static-pages/:pageSlug/publish
```

### UI Component

Should support:
- Inline editing for TEXT
- WYSIWYG editor for HTML
- Image upload for IMAGE
- Background image picker for BACKGROUND
- Live preview
- Section filtering

---

## Notes

1. **Empty Background Values**: Background images use inline styles, so `data-editable-bg` elements may have empty initial values. The parser extracts values from `style` attribute.

2. **Alt Text**: All images should have descriptive alt text for accessibility. Consider making this a required field in the CMS.

3. **Content Limits**: Consider adding character limits for different element types (e.g., titles ≤ 100 chars).

4. **Versioning**: Track content changes to allow rollback and history viewing.

5. **Multi-language**: Currently Korean-only labels. Consider i18n for multi-language support.

---

**Last Updated**: 2025-10-29
**Total Elements**: 272 across 12 pages
**Validation Status**: 100% success, 0 errors, 0 duplicates
