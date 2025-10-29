# Phase 1: Database Schema and Parser Implementation - Detailed Task Breakdown

## Overview
**Goal**: Complete database schema, migration scripts, parser implementation, and updater implementation with validation and testing
**Duration**: 1-2 days
**Critical Path**: Yes - all subsequent phases depend on this
**Total Tasks**: 24 granular tasks

---

## Task Categories

### 🗄️ Category 1: Database Schema Design (Tasks 1-6)
### 🔄 Category 2: Migration Scripts (Tasks 7-10)
### 🔍 Category 3: Parser Implementation (Tasks 11-16)
### ✏️ Category 4: Updater Implementation (Tasks 17-20)
### ✅ Category 5: Validation & Testing (Tasks 21-24)

---

## Detailed Task List

### 🗄️ CATEGORY 1: DATABASE SCHEMA DESIGN

#### **Task 1.1: Update Prisma Schema - EditMode Enum**
- **ID**: PHASE1-001
- **Duration**: 5 min
- **Priority**: Critical Path
- **Dependencies**: None
- **Parallel Eligible**: No (must precede other schema changes)

**Description**:
Add `EditMode` enum to Prisma schema to support both legacy PARSER mode and new ATTRIBUTE mode

**Implementation**:
```prisma
// Add to prisma/schema.prisma after existing enums

enum EditMode {
  PARSER      // Legacy HTML parsing (current system)
  ATTRIBUTE   // New data-editable attribute system (TipTap)
}
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/prisma/schema.prisma`

**Acceptance Criteria**:
- ✅ EditMode enum exists with PARSER and ATTRIBUTE values
- ✅ No syntax errors in schema file
- ✅ Schema validates with `npx prisma validate`

**Testing Approach**:
```bash
npx prisma validate
```

---

#### **Task 1.2: Update Prisma Schema - ElementType Enum**
- **ID**: PHASE1-002
- **Duration**: 5 min
- **Priority**: Critical Path
- **Dependencies**: None
- **Parallel Eligible**: Yes (parallel with 1.1)

**Description**:
Add `ElementType` enum for different editable element types

**Implementation**:
```prisma
// Add to prisma/schema.prisma

enum ElementType {
  TEXT           // Plain text content
  HTML           // Rich HTML content (TipTap editor)
  IMAGE          // Image src attribute
  BACKGROUND     // Background image CSS
}
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/prisma/schema.prisma`

**Acceptance Criteria**:
- ✅ ElementType enum exists with all 4 types
- ✅ No syntax errors
- ✅ Schema validates

**Testing Approach**:
```bash
npx prisma validate
```

---

#### **Task 1.3: Extend static_pages Model**
- **ID**: PHASE1-003
- **Duration**: 10 min
- **Priority**: Critical Path
- **Dependencies**: PHASE1-001 (EditMode enum)
- **Parallel Eligible**: No

**Description**:
Add new fields to static_pages model for edit mode tracking and synchronization

**Implementation**:
```prisma
model static_pages {
  id                   String                 @id
  slug                 String                 @unique
  title                String
  filePath             String
  sections             Json

  // 🆕 NEW FIELDS - Enhanced tracking
  editMode             EditMode               @default(PARSER)
  lastParsedAt         DateTime?
  lastSyncedAt         DateTime?              // When DB last synced with file
  syncStatus           String?                // 'synced', 'pending', 'conflict'

  lastEdited           DateTime
  createdAt            DateTime               @default(now())
  static_page_versions static_page_versions[]
  editable_elements    editable_elements[]    // 🆕 NEW RELATION
}
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/prisma/schema.prisma`

**Acceptance Criteria**:
- ✅ All new fields added with correct types
- ✅ editMode defaults to PARSER for backward compatibility
- ✅ editable_elements relation defined
- ✅ Schema validates

**Testing Approach**:
```bash
npx prisma validate
npx prisma format
```

---

#### **Task 1.4: Create editable_elements Model**
- **ID**: PHASE1-004
- **Duration**: 15 min
- **Priority**: Critical Path
- **Dependencies**: PHASE1-002 (ElementType enum), PHASE1-003 (static_pages relation)
- **Parallel Eligible**: No

**Description**:
Create new editable_elements model with enhanced attribute schema

**Implementation**:
```prisma
model editable_elements {
  id           String       @id @default(cuid())
  pageId       String
  elementId    String       // data-editable attribute value
  elementType  ElementType  // TEXT | HTML | IMAGE | BACKGROUND

  // Enhanced schema based on Sequential Thinking recommendations
  selector     String       // CSS selector for targeting
  label        String       // User-friendly label for admin UI
  dataType     String?      // Optional: 'heading', 'paragraph', 'caption'
  dataLabel    String?      // Optional: Custom label from HTML attribute

  currentValue String       @db.Text
  sectionName  String?      // For grouping in UI
  order        Int          @default(0)

  // Sync tracking
  lastSyncedAt DateTime?    // When this element was last synced
  syncStatus   String?      // 'synced', 'modified', 'conflict'

  page         static_pages @relation(fields: [pageId], references: [id], onDelete: Cascade)

  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@unique([pageId, elementId])
  @@index([pageId])
  @@index([sectionName])
}
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/prisma/schema.prisma`

**Acceptance Criteria**:
- ✅ Model created with all fields
- ✅ Unique constraint on (pageId, elementId)
- ✅ Indexes on pageId and sectionName
- ✅ Cascade delete on page deletion
- ✅ Schema validates

**Testing Approach**:
```bash
npx prisma validate
npx prisma format
```

---

#### **Task 1.5: Extend static_page_versions Model**
- **ID**: PHASE1-005
- **Duration**: 10 min
- **Priority**: High
- **Dependencies**: PHASE1-003
- **Parallel Eligible**: Yes (parallel with 1.4)

**Description**:
Extend version tracking to include element-level changes

**Implementation**:
```prisma
model static_page_versions {
  id           String       @id
  pageId       String
  version      Int
  sections     Json         // Keep for backward compatibility

  // 🆕 NEW FIELDS - Enhanced change tracking
  changeType   String?      // 'element_update', 'bulk_update', 'reparse', 'migration'
  changedData  Json?        // { elementId, oldValue, newValue, elementType }

  changedBy    String
  changeNote   String?
  createdAt    DateTime     @default(now())
  static_pages static_pages @relation(fields: [pageId], references: [id], onDelete: Cascade)

  @@unique([pageId, version])
  @@index([pageId])
}
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/prisma/schema.prisma`

**Acceptance Criteria**:
- ✅ New fields added for change tracking
- ✅ Backward compatibility maintained
- ✅ Schema validates

**Testing Approach**:
```bash
npx prisma validate
```

---

#### **Task 1.6: Validate Complete Schema**
- **ID**: PHASE1-006
- **Duration**: 5 min
- **Priority**: Critical Path
- **Dependencies**: PHASE1-001 through PHASE1-005
- **Parallel Eligible**: No

**Description**:
Final validation of complete schema with all changes

**Implementation**:
```bash
npx prisma validate
npx prisma format
npx prisma generate --dry-run
```

**Files to Check**:
- `/Users/blee/Desktop/cms/misopin-cms/prisma/schema.prisma`

**Acceptance Criteria**:
- ✅ Schema passes all validation checks
- ✅ No syntax errors
- ✅ All relations properly defined
- ✅ All indexes and constraints valid
- ✅ Generated types preview looks correct

**Testing Approach**:
Manual review + automated validation

---

### 🔄 CATEGORY 2: MIGRATION SCRIPTS

#### **Task 2.1: Create Migration File Structure**
- **ID**: PHASE1-007
- **Duration**: 5 min
- **Priority**: Critical Path
- **Dependencies**: PHASE1-006 (validated schema)
- **Parallel Eligible**: No

**Description**:
Create properly named migration file with timestamp

**Implementation**:
```bash
# Migration will be created by Prisma
npx prisma migrate dev --name add_tiptap_editing_system --create-only
```

**Files Created**:
- `/Users/blee/Desktop/cms/misopin-cms/prisma/migrations/[timestamp]_add_tiptap_editing_system/migration.sql`

**Acceptance Criteria**:
- ✅ Migration file created with proper naming
- ✅ SQL generated by Prisma
- ✅ File structure follows Prisma conventions

**Testing Approach**:
Verify file exists and contains expected SQL

---

#### **Task 2.2: Enhance Migration SQL - Add Enums**
- **ID**: PHASE1-008
- **Duration**: 10 min
- **Priority**: Critical Path
- **Dependencies**: PHASE1-007
- **Parallel Eligible**: No

**Description**:
Review and enhance auto-generated migration SQL for enums

**Implementation**:
```sql
-- Expected in migration.sql

-- Create EditMode enum
CREATE TYPE "EditMode" AS ENUM ('PARSER', 'ATTRIBUTE');

-- Create ElementType enum
CREATE TYPE "ElementType" AS ENUM ('TEXT', 'HTML', 'IMAGE', 'BACKGROUND');
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/prisma/migrations/[timestamp]_add_tiptap_editing_system/migration.sql`

**Acceptance Criteria**:
- ✅ Both enums created with correct values
- ✅ SQL syntax is valid PostgreSQL
- ✅ Enum names match schema exactly

**Testing Approach**:
```bash
# Test SQL syntax
psql $DATABASE_URL -c "\d \"EditMode\""
```

---

#### **Task 2.3: Enhance Migration SQL - Extend Tables**
- **ID**: PHASE1-009
- **Duration**: 15 min
- **Priority**: Critical Path
- **Dependencies**: PHASE1-008
- **Parallel Eligible**: No

**Description**:
Add column alterations for static_pages and static_page_versions with proper defaults

**Implementation**:
```sql
-- Extend static_pages
ALTER TABLE "static_pages"
ADD COLUMN "editMode" "EditMode" NOT NULL DEFAULT 'PARSER',
ADD COLUMN "lastParsedAt" TIMESTAMP,
ADD COLUMN "lastSyncedAt" TIMESTAMP,
ADD COLUMN "syncStatus" TEXT DEFAULT 'synced';

-- Extend static_page_versions
ALTER TABLE "static_page_versions"
ADD COLUMN "changeType" TEXT,
ADD COLUMN "changedData" JSONB;

-- Add comments for documentation
COMMENT ON COLUMN "static_pages"."editMode" IS 'Editing mode: PARSER (legacy) or ATTRIBUTE (TipTap)';
COMMENT ON COLUMN "static_pages"."lastSyncedAt" IS 'Last time DB was synced with HTML file';
COMMENT ON COLUMN "static_page_versions"."changeType" IS 'Type of change: element_update, bulk_update, reparse, migration';
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/prisma/migrations/[timestamp]_add_tiptap_editing_system/migration.sql`

**Acceptance Criteria**:
- ✅ All columns added with correct types
- ✅ Default values set appropriately
- ✅ Comments added for clarity
- ✅ Backward compatibility maintained (PARSER default)

**Testing Approach**:
```bash
# Validate SQL syntax
psql $DATABASE_URL -f migration.sql --dry-run
```

---

#### **Task 2.4: Enhance Migration SQL - Create editable_elements Table**
- **ID**: PHASE1-010
- **Duration**: 20 min
- **Priority**: Critical Path
- **Dependencies**: PHASE1-008 (enums)
- **Parallel Eligible**: No

**Description**:
Create complete editable_elements table with indexes and constraints

**Implementation**:
```sql
-- Create editable_elements table
CREATE TABLE "editable_elements" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pageId" TEXT NOT NULL,
  "elementId" TEXT NOT NULL,
  "elementType" "ElementType" NOT NULL,

  -- Enhanced schema
  "selector" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "dataType" TEXT,
  "dataLabel" TEXT,

  "currentValue" TEXT NOT NULL,
  "sectionName" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,

  -- Sync tracking
  "lastSyncedAt" TIMESTAMP,
  "syncStatus" TEXT DEFAULT 'synced',

  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key
  CONSTRAINT "editable_elements_pageId_fkey"
    FOREIGN KEY ("pageId")
    REFERENCES "static_pages"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Create unique constraint
CREATE UNIQUE INDEX "editable_elements_pageId_elementId_key"
ON "editable_elements"("pageId", "elementId");

-- Create indexes
CREATE INDEX "editable_elements_pageId_idx"
ON "editable_elements"("pageId");

CREATE INDEX "editable_elements_sectionName_idx"
ON "editable_elements"("sectionName");

-- Add comments
COMMENT ON TABLE "editable_elements" IS 'Stores parsed editable elements from HTML with data-editable attributes';
COMMENT ON COLUMN "editable_elements"."elementId" IS 'Value from data-editable attribute (e.g., section-0-title)';
COMMENT ON COLUMN "editable_elements"."dataType" IS 'Optional semantic type: heading, paragraph, caption, etc.';
COMMENT ON COLUMN "editable_elements"."dataLabel" IS 'Optional custom label from data-label attribute';
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/prisma/migrations/[timestamp]_add_tiptap_editing_system/migration.sql`

**Acceptance Criteria**:
- ✅ Table created with all columns
- ✅ Foreign key constraint with CASCADE delete
- ✅ Unique constraint on (pageId, elementId)
- ✅ All indexes created
- ✅ Comments added
- ✅ Default values set

**Testing Approach**:
```bash
# Validate table structure
psql $DATABASE_URL -c "\d editable_elements"
```

---

### 🔍 CATEGORY 3: PARSER IMPLEMENTATION

#### **Task 3.1: Create Parser File Structure**
- **ID**: PHASE1-011
- **Duration**: 5 min
- **Priority**: Critical Path
- **Dependencies**: None (can start in parallel with schema)
- **Parallel Eligible**: Yes

**Description**:
Create directory structure and type definitions for parser

**Implementation**:
```bash
mkdir -p lib/static-pages
touch lib/static-pages/attribute-parser.ts
touch lib/static-pages/types.ts
```

**Files to Create**:
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/attribute-parser.ts`
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/types.ts`

**Acceptance Criteria**:
- ✅ Directory created
- ✅ Files created
- ✅ Proper naming conventions

**Testing Approach**:
Verify files exist

---

#### **Task 3.2: Define Parser Type Definitions**
- **ID**: PHASE1-012
- **Duration**: 10 min
- **Priority**: High
- **Dependencies**: PHASE1-011
- **Parallel Eligible**: Yes (parallel with schema work)

**Description**:
Create TypeScript interfaces for parser system

**Implementation**:
```typescript
// lib/static-pages/types.ts

export type ElementType = 'TEXT' | 'HTML' | 'IMAGE' | 'BACKGROUND';

export interface EditableElement {
  id: string;              // "section-0-title"
  type: ElementType;
  selector: string;        // "[data-editable='section-0-title']"
  currentValue: string;    // Current content/URL
  label: string;           // "제목" - user-friendly label
  sectionName: string;     // "first-section" for grouping
  order: number;           // Display order

  // Enhanced attributes
  dataType?: string;       // 'heading', 'paragraph', 'caption'
  dataLabel?: string;      // Custom label from HTML
}

export interface ParserOptions {
  includeBackgrounds?: boolean;  // Auto-detect background images
  sanitize?: boolean;            // Run DOMPurify sanitization
  validateAttributes?: boolean;   // Validate data-* attributes
}

export interface ParserResult {
  elements: EditableElement[];
  warnings: string[];
  errors: string[];
  stats: {
    totalElements: number;
    byType: Record<ElementType, number>;
    bySections: Record<string, number>;
  };
}
```

**Files to Create**:
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/types.ts`

**Acceptance Criteria**:
- ✅ All types defined
- ✅ TypeScript compiles without errors
- ✅ Comprehensive documentation comments

**Testing Approach**:
```bash
npx tsc --noEmit
```

---

#### **Task 3.3: Implement Basic Parser Structure**
- **ID**: PHASE1-013
- **Duration**: 20 min
- **Priority**: Critical Path
- **Dependencies**: PHASE1-012
- **Parallel Eligible**: No

**Description**:
Create parser skeleton with Cheerio setup and basic structure

**Implementation**:
```typescript
// lib/static-pages/attribute-parser.ts

import * as cheerio from 'cheerio';
import type { EditableElement, ParserOptions, ParserResult, ElementType } from './types';

export class AttributeParser {
  private options: Required<ParserOptions>;

  constructor(options: ParserOptions = {}) {
    this.options = {
      includeBackgrounds: options.includeBackgrounds ?? true,
      sanitize: options.sanitize ?? true,
      validateAttributes: options.validateAttributes ?? true,
    };
  }

  /**
   * Parse HTML and extract all editable elements
   */
  parse(html: string): ParserResult {
    const $ = cheerio.load(html, {
      decodeEntities: false,
      xmlMode: false
    });

    const elements: EditableElement[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Implementation will be added in next tasks

    return {
      elements,
      warnings,
      errors,
      stats: this.calculateStats(elements)
    };
  }

  private calculateStats(elements: EditableElement[]) {
    // Implementation in next task
    return {
      totalElements: 0,
      byType: {} as Record<ElementType, number>,
      bySections: {} as Record<string, number>
    };
  }
}

// Convenience export
export function parseEditableAttributes(
  html: string,
  options?: ParserOptions
): ParserResult {
  const parser = new AttributeParser(options);
  return parser.parse(html);
}
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/attribute-parser.ts`

**Acceptance Criteria**:
- ✅ Class structure created
- ✅ TypeScript compiles
- ✅ Cheerio imported correctly
- ✅ Options handling implemented

**Testing Approach**:
```bash
npx tsc --noEmit
```

---

#### **Task 3.4: Implement data-editable Attribute Parsing**
- **ID**: PHASE1-014
- **Duration**: 30 min
- **Priority**: Critical Path
- **Dependencies**: PHASE1-013
- **Parallel Eligible**: No

**Description**:
Core parser logic for extracting data-editable elements

**Implementation**:
```typescript
// Add to AttributeParser class

/**
 * Extract elements with data-editable attributes
 */
private parseEditableAttributes($: cheerio.CheerioAPI): EditableElement[] {
  const elements: EditableElement[] = [];
  let order = 0;

  $('[data-editable]').each((i, elem) => {
    try {
      const $elem = $(elem);
      const elementId = $elem.attr('data-editable');

      if (!elementId) {
        this.warnings.push(`Element at index ${i} has empty data-editable`);
        return;
      }

      // Validate attribute format if enabled
      if (this.options.validateAttributes && !this.isValidElementId(elementId)) {
        this.warnings.push(`Invalid elementId format: ${elementId}`);
      }

      const sectionName = $elem.attr('data-section') || 'default';
      const dataType = $elem.attr('data-type');
      const dataLabel = $elem.attr('data-label');

      // Determine element type and extract value
      const { type, currentValue } = this.detectElementType($elem);

      elements.push({
        id: elementId,
        type,
        selector: `[data-editable="${elementId}"]`,
        currentValue,
        label: dataLabel || this.generateLabel(elementId, $elem),
        sectionName,
        order: order++,
        dataType,
        dataLabel,
      });
    } catch (error) {
      this.errors.push(`Failed to parse element at index ${i}: ${error}`);
    }
  });

  return elements;
}

/**
 * Detect element type based on tag and content
 */
private detectElementType($elem: cheerio.Cheerio): { type: ElementType; currentValue: string } {
  // Image elements
  if ($elem.is('img')) {
    return {
      type: 'IMAGE',
      currentValue: $elem.attr('src') || ''
    };
  }

  // Check for rich HTML content
  if ($elem.find('br, strong, em, a, span, b, i, u').length > 0) {
    return {
      type: 'HTML',
      currentValue: this.sanitizeHtml($elem.html() || '')
    };
  }

  // Plain text
  return {
    type: 'TEXT',
    currentValue: $elem.text().trim()
  };
}

/**
 * Validate elementId format (section-N-type pattern)
 */
private isValidElementId(elementId: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)+$/.test(elementId);
}

/**
 * Sanitize HTML content (DOMPurify on server)
 */
private sanitizeHtml(html: string): string {
  if (!this.options.sanitize) return html;

  // Server-side sanitization - basic for now
  // TODO: Integrate DOMPurify isomorphic in Phase 2
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
}
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/attribute-parser.ts`

**Acceptance Criteria**:
- ✅ Parses all [data-editable] elements
- ✅ Correctly detects TEXT, HTML, IMAGE types
- ✅ Extracts all data-* attributes
- ✅ Generates proper selectors
- ✅ Basic sanitization implemented
- ✅ Error handling for malformed elements

**Testing Approach**:
Unit tests with sample HTML

---

#### **Task 3.5: Implement Background Image Auto-Detection**
- **ID**: PHASE1-015
- **Duration**: 25 min
- **Priority**: High
- **Dependencies**: PHASE1-014
- **Parallel Eligible**: No

**Description**:
Auto-detect and parse background images from style attributes

**Implementation**:
```typescript
// Add to AttributeParser class

/**
 * Auto-detect background images from style attributes
 */
private parseBackgroundImages($: cheerio.CheerioAPI, existingIds: Set<string>): EditableElement[] {
  if (!this.options.includeBackgrounds) return [];

  const elements: EditableElement[] = [];
  let bgOrder = 1000; // Start after regular elements

  $('[style*="background-image"]').each((i, elem) => {
    try {
      const $elem = $(elem);

      // Skip if already processed via data-editable
      if ($elem.attr('data-editable')) return;

      const style = $elem.attr('style') || '';
      const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);

      if (!match) return;

      const imageUrl = match[1];
      const elementId = this.generateBackgroundId($elem, i);

      // Avoid duplicate IDs
      if (existingIds.has(elementId)) {
        this.warnings.push(`Duplicate background ID: ${elementId}`);
        return;
      }

      elements.push({
        id: elementId,
        type: 'BACKGROUND',
        selector: this.generateUniqueSelector($elem),
        currentValue: imageUrl,
        label: this.generateBackgroundLabel($elem),
        sectionName: this.findParentSection($elem),
        order: bgOrder++,
      });

      existingIds.add(elementId);
    } catch (error) {
      this.errors.push(`Failed to parse background at index ${i}: ${error}`);
    }
  });

  return elements;
}

/**
 * Generate unique ID for background image
 */
private generateBackgroundId($elem: cheerio.Cheerio, index: number): string {
  const id = $elem.attr('id');
  if (id) return `bg-${id}`;

  const className = $elem.attr('class')?.split(/\s+/)[0];
  if (className) return `bg-${className}`;

  return `bg-auto-${index}`;
}

/**
 * Generate CSS selector for element
 */
private generateUniqueSelector($elem: cheerio.Cheerio): string {
  const id = $elem.attr('id');
  if (id) return `#${id}`;

  const className = $elem.attr('class');
  if (className) {
    const classes = className.trim().split(/\s+/);
    return `.${classes[0]}`;
  }

  const tagName = $elem.prop('tagName')?.toLowerCase();
  return tagName || 'div';
}

/**
 * Find parent section for element
 */
private findParentSection($elem: cheerio.Cheerio): string {
  const parent = $elem.closest('[data-section]');
  return parent.attr('data-section') || 'default';
}

/**
 * Generate label for background image
 */
private generateBackgroundLabel($elem: cheerio.Cheerio): string {
  const id = $elem.attr('id');
  const className = $elem.attr('class')?.split(/\s+/)[0];

  if (id) return `배경 이미지 (${id})`;
  if (className) return `배경 이미지 (${className})`;
  return '배경 이미지';
}
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/attribute-parser.ts`

**Acceptance Criteria**:
- ✅ Detects all background-image styles
- ✅ Extracts URL from CSS
- ✅ Generates unique IDs
- ✅ Creates unique selectors
- ✅ Finds parent sections
- ✅ No duplicate IDs

**Testing Approach**:
Unit tests with background image HTML

---

#### **Task 3.6: Implement Helper Functions and Statistics**
- **ID**: PHASE1-016
- **Duration**: 15 min
- **Priority**: Medium
- **Dependencies**: PHASE1-014, PHASE1-015
- **Parallel Eligible**: No

**Description**:
Complete helper functions and statistics calculation

**Implementation**:
```typescript
// Add to AttributeParser class

/**
 * Generate user-friendly label from elementId
 */
private generateLabel(elementId: string, $elem: cheerio.Cheerio): string {
  const parts = elementId.split('-');
  const type = parts[parts.length - 1];

  const labelMap: Record<string, string> = {
    'label': '라벨',
    'title': '제목',
    'heading': '제목',
    'description': '설명',
    'text': '텍스트',
    'content': '내용',
    'image': '이미지',
    'caption': '캡션',
    'subtitle': '부제목',
  };

  return labelMap[type] || this.capitalizeFirst(type);
}

private capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Calculate statistics from parsed elements
 */
private calculateStats(elements: EditableElement[]) {
  const byType: Record<ElementType, number> = {
    TEXT: 0,
    HTML: 0,
    IMAGE: 0,
    BACKGROUND: 0,
  };

  const bySections: Record<string, number> = {};

  elements.forEach(elem => {
    byType[elem.type]++;
    bySections[elem.sectionName] = (bySections[elem.sectionName] || 0) + 1;
  });

  return {
    totalElements: elements.length,
    byType,
    bySections,
  };
}

/**
 * Main parse method - orchestrate all parsing
 */
parse(html: string): ParserResult {
  const $ = cheerio.load(html, {
    decodeEntities: false,
    xmlMode: false
  });

  this.warnings = [];
  this.errors = [];

  // Parse data-editable attributes
  const editableElements = this.parseEditableAttributes($);
  const existingIds = new Set(editableElements.map(e => e.id));

  // Parse background images
  const backgroundElements = this.parseBackgroundImages($, existingIds);

  // Combine all elements
  const allElements = [...editableElements, ...backgroundElements];

  return {
    elements: allElements,
    warnings: this.warnings,
    errors: this.errors,
    stats: this.calculateStats(allElements),
  };
}

// Add class properties
private warnings: string[] = [];
private errors: string[] = [];
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/attribute-parser.ts`

**Acceptance Criteria**:
- ✅ Label generation working
- ✅ Statistics calculated correctly
- ✅ Main parse method orchestrates all steps
- ✅ Warnings and errors collected

**Testing Approach**:
Full integration test with complete HTML

---

### ✏️ CATEGORY 4: UPDATER IMPLEMENTATION

#### **Task 4.1: Create Updater File Structure**
- **ID**: PHASE1-017
- **Duration**: 5 min
- **Priority**: High
- **Dependencies**: PHASE1-012 (types)
- **Parallel Eligible**: Yes (parallel with parser work)

**Description**:
Create updater module structure

**Implementation**:
```bash
touch lib/static-pages/attribute-updater.ts
```

**Files to Create**:
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/attribute-updater.ts`

**Acceptance Criteria**:
- ✅ File created
- ✅ Proper location

**Testing Approach**:
Verify file exists

---

#### **Task 4.2: Implement Basic Updater Structure**
- **ID**: PHASE1-018
- **Duration**: 15 min
- **Priority**: High
- **Dependencies**: PHASE1-017
- **Parallel Eligible**: No

**Description**:
Create updater class with error handling

**Implementation**:
```typescript
// lib/static-pages/attribute-updater.ts

import * as cheerio from 'cheerio';
import type { ElementType } from './types';

export class AttributeUpdater {
  /**
   * Update element by data-editable attribute
   */
  updateElement(
    html: string,
    elementId: string,
    newValue: string,
    elementType: ElementType
  ): { html: string; success: boolean; error?: string } {
    try {
      const $ = cheerio.load(html, {
        decodeEntities: false,
        xmlMode: false
      });

      const $elem = $(`[data-editable="${elementId}"]`);

      if ($elem.length === 0) {
        return {
          html,
          success: false,
          error: `Element not found: ${elementId}`
        };
      }

      // Validate value before updating
      const validationError = this.validateValue(newValue, elementType);
      if (validationError) {
        return {
          html,
          success: false,
          error: validationError
        };
      }

      // Update based on type
      this.updateByType($elem, newValue, elementType);

      return {
        html: $.html(),
        success: true
      };

    } catch (error) {
      return {
        html,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private updateByType(
    $elem: cheerio.Cheerio,
    newValue: string,
    elementType: ElementType
  ): void {
    // Implementation in next task
  }

  private validateValue(value: string, type: ElementType): string | null {
    // Implementation in next task
    return null;
  }
}
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/attribute-updater.ts`

**Acceptance Criteria**:
- ✅ Class structure created
- ✅ Error handling implemented
- ✅ Returns success/failure status

**Testing Approach**:
```bash
npx tsc --noEmit
```

---

#### **Task 4.3: Implement Element Update Logic**
- **ID**: PHASE1-019
- **Duration**: 25 min
- **Priority**: Critical Path
- **Dependencies**: PHASE1-018
- **Parallel Eligible**: No

**Description**:
Core update logic for each element type with validation

**Implementation**:
```typescript
// Add to AttributeUpdater class

/**
 * Update element based on type
 */
private updateByType(
  $elem: cheerio.Cheerio,
  newValue: string,
  elementType: ElementType
): void {
  switch (elementType) {
    case 'TEXT':
      $elem.text(newValue);
      break;

    case 'HTML':
      // Sanitize before inserting
      const sanitized = this.sanitizeHtml(newValue);
      $elem.html(sanitized);
      break;

    case 'IMAGE':
      $elem.attr('src', newValue);
      // Update alt if empty
      if (!$elem.attr('alt')) {
        $elem.attr('alt', this.generateAltText(newValue));
      }
      break;

    case 'BACKGROUND':
      throw new Error('Use updateBackgroundImage for BACKGROUND type');

    default:
      throw new Error(`Unknown element type: ${elementType}`);
  }
}

/**
 * Validate value before update
 */
private validateValue(value: string, type: ElementType): string | null {
  // Check for empty values
  if (!value || value.trim().length === 0) {
    return 'Value cannot be empty';
  }

  // Type-specific validation
  switch (type) {
    case 'TEXT':
    case 'HTML':
      if (value.length > 50000) {
        return 'Text content too long (max 50000 characters)';
      }
      break;

    case 'IMAGE':
    case 'BACKGROUND':
      if (!this.isValidImageUrl(value)) {
        return 'Invalid image URL format';
      }
      break;
  }

  // Check for potentially dangerous content
  if (this.containsMaliciousContent(value)) {
    return 'Content contains potentially dangerous elements';
  }

  return null;
}

/**
 * Server-side HTML sanitization
 */
private sanitizeHtml(html: string): string {
  // Remove dangerous tags
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, ''); // Remove javascript: protocol
}

/**
 * Check for malicious content patterns
 */
private containsMaliciousContent(content: string): boolean {
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];

  return maliciousPatterns.some(pattern => pattern.test(content));
}

/**
 * Validate image URL format
 */
private isValidImageUrl(url: string): boolean {
  // Allow relative and absolute URLs
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return true;
  }

  // Allow http(s) URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Generate alt text from image filename
 */
private generateAltText(imageUrl: string): string {
  const filename = imageUrl.split('/').pop() || '';
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  return nameWithoutExt.replace(/[-_]/g, ' ');
}
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/attribute-updater.ts`

**Acceptance Criteria**:
- ✅ TEXT updates work correctly
- ✅ HTML updates with sanitization
- ✅ IMAGE updates src attribute
- ✅ Validation prevents malicious content
- ✅ Error messages are clear

**Testing Approach**:
Unit tests for each type and validation

---

#### **Task 4.4: Implement Background Image Updater**
- **ID**: PHASE1-020
- **Duration**: 20 min
- **Priority**: High
- **Dependencies**: PHASE1-019
- **Parallel Eligible**: No

**Description**:
Specialized updater for background images with CSS manipulation

**Implementation**:
```typescript
// Add to AttributeUpdater class

/**
 * Update background image in style attribute
 */
updateBackgroundImage(
  html: string,
  selector: string,
  newImageUrl: string
): { html: string; success: boolean; error?: string } {
  try {
    const $ = cheerio.load(html, { decodeEntities: false });
    const $elem = $(selector);

    if ($elem.length === 0) {
      return {
        html,
        success: false,
        error: `Element not found with selector: ${selector}`
      };
    }

    // Validate URL
    if (!this.isValidImageUrl(newImageUrl)) {
      return {
        html,
        success: false,
        error: 'Invalid image URL format'
      };
    }

    // Get and update style attribute
    const style = $elem.attr('style') || '';

    // Check if background-image exists
    if (!style.includes('background-image')) {
      return {
        html,
        success: false,
        error: 'Element does not have background-image style'
      };
    }

    // Replace background-image URL
    const newStyle = style.replace(
      /background-image\s*:\s*url\(['"]?[^'")\s]+['"]?\)/i,
      `background-image: url('${newImageUrl}')`
    );

    $elem.attr('style', newStyle);

    return {
      html: $.html(),
      success: true
    };

  } catch (error) {
    return {
      html,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Convenience export functions
export function updateElementByAttribute(
  html: string,
  elementId: string,
  newValue: string,
  elementType: ElementType
): { html: string; success: boolean; error?: string } {
  const updater = new AttributeUpdater();
  return updater.updateElement(html, elementId, newValue, elementType);
}

export function updateBackgroundImage(
  html: string,
  selector: string,
  newImageUrl: string
): { html: string; success: boolean; error?: string } {
  const updater = new AttributeUpdater();
  return updater.updateBackgroundImage(html, selector, newImageUrl);
}
```

**Files to Modify**:
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/attribute-updater.ts`

**Acceptance Criteria**:
- ✅ Background image URL updates correctly
- ✅ Preserves other style properties
- ✅ Handles various URL formats
- ✅ Error handling for missing elements
- ✅ Convenience functions exported

**Testing Approach**:
Unit tests with various CSS patterns

---

### ✅ CATEGORY 5: VALIDATION & TESTING

#### **Task 5.1: Run Database Migration**
- **ID**: PHASE1-021
- **Duration**: 10 min
- **Priority**: Critical Path
- **Dependencies**: PHASE1-010 (migration SQL complete)
- **Parallel Eligible**: No

**Description**:
Execute migration and verify database changes

**Implementation**:
```bash
# Apply migration
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Verify database structure
npx prisma db pull --print
```

**Files Modified**:
- Database schema
- `/Users/blee/Desktop/cms/misopin-cms/node_modules/.prisma/client/`

**Acceptance Criteria**:
- ✅ Migration executes without errors
- ✅ All tables and columns created
- ✅ Indexes created
- ✅ Foreign keys working
- ✅ Prisma Client regenerated
- ✅ TypeScript types available

**Testing Approach**:
```bash
# Verify in database
psql $DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'editable_elements';"

# Test TypeScript types
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

---

#### **Task 5.2: Create Parser Unit Tests**
- **ID**: PHASE1-022
- **Duration**: 30 min
- **Priority**: High
- **Dependencies**: PHASE1-016 (parser complete)
- **Parallel Eligible**: Yes (parallel with migration)

**Description**:
Comprehensive unit tests for parser

**Implementation**:
```typescript
// lib/static-pages/__tests__/attribute-parser.test.ts

import { describe, it, expect } from '@jest/globals';
import { AttributeParser } from '../attribute-parser';

describe('AttributeParser', () => {
  describe('Text Elements', () => {
    it('should parse plain text data-editable', () => {
      const html = `<div data-editable="test-title" data-section="main">Hello</div>`;
      const parser = new AttributeParser();
      const result = parser.parse(html);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        id: 'test-title',
        type: 'TEXT',
        currentValue: 'Hello',
        sectionName: 'main'
      });
    });
  });

  describe('HTML Elements', () => {
    it('should detect HTML content with br tags', () => {
      const html = `<p data-editable="desc">Line 1<br>Line 2</p>`;
      const result = new AttributeParser().parse(html);

      expect(result.elements[0].type).toBe('HTML');
      expect(result.elements[0].currentValue).toContain('<br>');
    });
  });

  describe('Image Elements', () => {
    it('should parse image src', () => {
      const html = `<img data-editable="img1" src="/test.jpg" alt="Test">`;
      const result = new AttributeParser().parse(html);

      expect(result.elements[0]).toMatchObject({
        type: 'IMAGE',
        currentValue: '/test.jpg'
      });
    });
  });

  describe('Background Images', () => {
    it('should auto-detect background images', () => {
      const html = `<div id="banner" style="background-image: url('/bg.jpg');"></div>`;
      const result = new AttributeParser().parse(html);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: 'BACKGROUND',
        currentValue: '/bg.jpg',
        selector: '#banner'
      });
    });
  });

  describe('Enhanced Attributes', () => {
    it('should extract data-type and data-label', () => {
      const html = `<h2 data-editable="title" data-type="heading" data-label="Main Title">Test</h2>`;
      const result = new AttributeParser().parse(html);

      expect(result.elements[0]).toMatchObject({
        dataType: 'heading',
        dataLabel: 'Main Title'
      });
    });
  });

  describe('Statistics', () => {
    it('should calculate correct statistics', () => {
      const html = `
        <div data-editable="t1" data-section="s1">Text</div>
        <p data-editable="t2" data-section="s1">More<br>text</p>
        <img data-editable="i1" data-section="s2" src="/img.jpg">
      `;
      const result = new AttributeParser().parse(html);

      expect(result.stats).toMatchObject({
        totalElements: 3,
        byType: { TEXT: 1, HTML: 1, IMAGE: 1, BACKGROUND: 0 },
        bySections: { s1: 2, s2: 1 }
      });
    });
  });
});
```

**Files to Create**:
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/__tests__/attribute-parser.test.ts`

**Acceptance Criteria**:
- ✅ All test cases pass
- ✅ Edge cases covered
- ✅ Statistics validation
- ✅ Error cases tested

**Testing Approach**:
```bash
npm test -- attribute-parser.test.ts
```

---

#### **Task 5.3: Create Updater Unit Tests**
- **ID**: PHASE1-023
- **Duration**: 25 min
- **Priority**: High
- **Dependencies**: PHASE1-020 (updater complete)
- **Parallel Eligible**: Yes (parallel with parser tests)

**Description**:
Comprehensive unit tests for updater

**Implementation**:
```typescript
// lib/static-pages/__tests__/attribute-updater.test.ts

import { describe, it, expect } from '@jest/globals';
import { AttributeUpdater } from '../attribute-updater';

describe('AttributeUpdater', () => {
  const updater = new AttributeUpdater();

  describe('Text Updates', () => {
    it('should update text content', () => {
      const html = `<div data-editable="test">Old</div>`;
      const result = updater.updateElement(html, 'test', 'New', 'TEXT');

      expect(result.success).toBe(true);
      expect(result.html).toContain('>New</div>');
    });
  });

  describe('HTML Updates', () => {
    it('should update HTML content', () => {
      const html = `<p data-editable="content">Old</p>`;
      const result = updater.updateElement(html, 'content', 'New<br>Line', 'HTML');

      expect(result.success).toBe(true);
      expect(result.html).toContain('New<br>Line');
    });

    it('should sanitize malicious HTML', () => {
      const html = `<p data-editable="test">Old</p>`;
      const malicious = 'Text<script>alert("xss")</script>';
      const result = updater.updateElement(html, 'test', malicious, 'HTML');

      expect(result.success).toBe(true);
      expect(result.html).not.toContain('<script>');
    });
  });

  describe('Image Updates', () => {
    it('should update image src', () => {
      const html = `<img data-editable="img" src="/old.jpg">`;
      const result = updater.updateElement(html, 'img', '/new.jpg', 'IMAGE');

      expect(result.success).toBe(true);
      expect(result.html).toContain('src="/new.jpg"');
    });
  });

  describe('Background Image Updates', () => {
    it('should update background-image URL', () => {
      const html = `<div id="banner" style="background-image: url('/old.jpg');"></div>`;
      const result = updater.updateBackgroundImage(html, '#banner', '/new.jpg');

      expect(result.success).toBe(true);
      expect(result.html).toContain("url('/new.jpg')");
    });
  });

  describe('Validation', () => {
    it('should reject empty values', () => {
      const html = `<div data-editable="test">Old</div>`;
      const result = updater.updateElement(html, 'test', '', 'TEXT');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject invalid image URLs', () => {
      const html = `<img data-editable="img" src="/old.jpg">`;
      const result = updater.updateElement(html, 'img', 'not-a-url', 'IMAGE');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing elements gracefully', () => {
      const html = `<div data-editable="exists">Content</div>`;
      const result = updater.updateElement(html, 'missing', 'New', 'TEXT');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
});
```

**Files to Create**:
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/__tests__/attribute-updater.test.ts`

**Acceptance Criteria**:
- ✅ All test cases pass
- ✅ Validation tested
- ✅ Sanitization verified
- ✅ Error handling confirmed

**Testing Approach**:
```bash
npm test -- attribute-updater.test.ts
```

---

#### **Task 5.4: Integration Test with Sample HTML**
- **ID**: PHASE1-024
- **Duration**: 20 min
- **Priority**: Medium
- **Dependencies**: PHASE1-022, PHASE1-023
- **Parallel Eligible**: No

**Description**:
End-to-end test with realistic HTML sample

**Implementation**:
```typescript
// lib/static-pages/__tests__/integration.test.ts

import { describe, it, expect } from '@jest/globals';
import { AttributeParser } from '../attribute-parser';
import { AttributeUpdater } from '../attribute-updater';
import fs from 'fs';
import path from 'path';

describe('Integration Tests', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
    <body>
      <div id="banner" style="background-image: url('../images/banner.jpg');">
        <div data-editable="banner-title" data-section="hero" data-type="heading">
          미소핀 피부과
        </div>
        <p data-editable="banner-desc" data-section="hero">
          전문적인 치료로<br>아름다움을 되찾으세요
        </p>
      </div>

      <section data-section="treatment">
        <h2 data-editable="section-1-title" data-type="heading">여드름 치료</h2>
        <img data-editable="section-1-image" src="../images/acne.jpg" alt="여드름">
        <p data-editable="section-1-description">
          피부 속 염증을 개선합니다
        </p>
      </section>
    </body>
    </html>
  `;

  it('should parse all elements correctly', () => {
    const parser = new AttributeParser();
    const result = parser.parse(sampleHtml);

    expect(result.elements.length).toBeGreaterThan(0);
    expect(result.stats.byType.TEXT).toBeGreaterThan(0);
    expect(result.stats.byType.HTML).toBeGreaterThan(0);
    expect(result.stats.byType.IMAGE).toBeGreaterThan(0);
    expect(result.stats.byType.BACKGROUND).toBeGreaterThan(0);
  });

  it('should parse and update cycle works', () => {
    // Parse
    const parser = new AttributeParser();
    const parseResult = parser.parse(sampleHtml);

    expect(parseResult.elements.length).toBeGreaterThan(0);

    // Update title
    const updater = new AttributeUpdater();
    const updateResult = updater.updateElement(
      sampleHtml,
      'banner-title',
      '새로운 미소핀',
      'TEXT'
    );

    expect(updateResult.success).toBe(true);

    // Re-parse to verify
    const reparseResult = parser.parse(updateResult.html);
    const updatedElement = reparseResult.elements.find(e => e.id === 'banner-title');

    expect(updatedElement?.currentValue).toBe('새로운 미소핀');
  });

  it('should group elements by section', () => {
    const parser = new AttributeParser();
    const result = parser.parse(sampleHtml);

    const heroElements = result.elements.filter(e => e.sectionName === 'hero');
    const treatmentElements = result.elements.filter(e => e.sectionName === 'treatment');

    expect(heroElements.length).toBeGreaterThan(0);
    expect(treatmentElements.length).toBeGreaterThan(0);
  });
});
```

**Files to Create**:
- `/Users/blee/Desktop/cms/misopin-cms/lib/static-pages/__tests__/integration.test.ts`

**Acceptance Criteria**:
- ✅ Full parse-update-reparse cycle works
- ✅ Section grouping verified
- ✅ All element types detected
- ✅ Realistic HTML structure tested

**Testing Approach**:
```bash
npm test -- integration.test.ts
```

---

## Task Execution Summary

### Critical Path Tasks (Must be sequential)
1. PHASE1-001 → PHASE1-003 → PHASE1-004 → PHASE1-006 → PHASE1-007 → PHASE1-010 → PHASE1-021

### Parallel Execution Opportunities

**Group A: Schema Work (Sequential internally)**
- PHASE1-001, 002 (parallel)
- PHASE1-003 (depends on 001)
- PHASE1-004, 005 (parallel, both depend on 003)
- PHASE1-006 (depends on all)

**Group B: Parser Work (Can start with schema)**
- PHASE1-011 (independent start)
- PHASE1-012 (depends on 011)
- PHASE1-013 → 014 → 015 → 016 (sequential)

**Group C: Updater Work (Can parallel with parser)**
- PHASE1-017 (independent start)
- PHASE1-018 → 019 → 020 (sequential)

**Group D: Testing (Can parallel with migration)**
- PHASE1-022, 023 (parallel after parser/updater)
- PHASE1-024 (depends on 022, 023)

### Optimal Execution Order
```
Day 1 Morning (2-3 hours):
  Parallel: [PHASE1-001, 002, 011, 012, 017]
  Sequential: PHASE1-003 → 004, 005 (parallel) → 006
  Sequential: PHASE1-013 → 014 → 015
  Sequential: PHASE1-018 → 019

Day 1 Afternoon (2-3 hours):
  Sequential: PHASE1-016 (complete parser)
  Sequential: PHASE1-020 (complete updater)
  Sequential: PHASE1-007 → 008 → 009 → 010
  Sequential: PHASE1-021 (migration)
  Parallel: [PHASE1-022, 023] → PHASE1-024

Day 2 (if needed for testing/fixes):
  Bug fixes, additional tests, documentation
```

### Quick Wins (Fast, high-value tasks)
- ✅ PHASE1-001, 002: Add enums (5 min each)
- ✅ PHASE1-011, 017: Create file structure (5 min each)
- ✅ PHASE1-012: Type definitions (10 min)

### Risk Checkpoints
1. **After PHASE1-006**: Validate schema before proceeding
2. **After PHASE1-021**: Verify migration success before continuing
3. **After PHASE1-024**: Full integration test must pass

---

## Dependencies Map

```
PHASE1-001 (EditMode enum)
  └─→ PHASE1-003 (extend static_pages)
       ├─→ PHASE1-005 (extend versions)
       └─→ PHASE1-004 (create editable_elements)

PHASE1-002 (ElementType enum)
  └─→ PHASE1-004 (create editable_elements)

PHASE1-003, 004, 005
  └─→ PHASE1-006 (validate schema)
       └─→ PHASE1-007 (create migration)
            └─→ PHASE1-008, 009, 010 (enhance migration)
                 └─→ PHASE1-021 (run migration)

PHASE1-011 (parser structure)
  └─→ PHASE1-012 (types)
       └─→ PHASE1-013 (basic structure)
            └─→ PHASE1-014 (parse logic)
                 ├─→ PHASE1-015 (backgrounds)
                 └─→ PHASE1-016 (helpers)
                      └─→ PHASE1-022 (parser tests)

PHASE1-012 (types)
  └─→ PHASE1-017 (updater structure)
       └─→ PHASE1-018 (basic updater)
            └─→ PHASE1-019 (update logic)
                 └─→ PHASE1-020 (background updater)
                      └─→ PHASE1-023 (updater tests)

PHASE1-022, 023 (unit tests)
  └─→ PHASE1-024 (integration test)
```

---

## Success Metrics

### Phase 1 Completion Criteria
- ✅ All 24 tasks completed
- ✅ Database migration successful
- ✅ Parser extracts all element types
- ✅ Updater modifies HTML correctly
- ✅ All unit tests passing (>90% coverage)
- ✅ Integration test passing
- ✅ No TypeScript errors
- ✅ No database constraint violations

### Quality Gates
1. **Schema Quality**: Validates without errors, all relations work
2. **Parser Quality**: Handles real HTML, no crashes, accurate extraction
3. **Updater Quality**: Safe updates, sanitization works, validation prevents errors
4. **Test Quality**: Comprehensive coverage, edge cases handled

---

## Next Steps After Phase 1

Upon successful completion:
1. ✅ Phase 1 sign-off
2. → Begin Phase 2: API Implementation
3. → Start TipTap component development (can parallel with API)

---

**Document Version**: 1.0
**Created**: 2025-10-29
**Author**: Claude Code
**Project**: TipTap Static Page Editor - Phase 1
