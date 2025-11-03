-- Add new enum values to existing SyncStatus
ALTER TYPE "SyncStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "SyncStatus" ADD VALUE IF NOT EXISTS 'FAILED';

-- Create new LockStatus enum
CREATE TYPE "LockStatus" AS ENUM ('UNLOCKED', 'LOCKED', 'EXPIRED');

-- Enhance ChangeType enum (create new one and migrate)
CREATE TYPE "ChangeType_new" AS ENUM (
  'CREATED',
  'UPDATED',
  'DELETED',
  'PUBLISHED',
  'UNPUBLISHED',
  'RESTORED',
  'BULK_UPDATE',
  'REPARSE'
);

-- Add new columns to static_pages table
ALTER TABLE "static_pages"
  ADD COLUMN IF NOT EXISTS "syncError" TEXT,
  ADD COLUMN IF NOT EXISTS "syncRetryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fileHash" TEXT,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lockStatus" "LockStatus" NOT NULL DEFAULT 'UNLOCKED',
  ADD COLUMN IF NOT EXISTS "lockedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockExpiry" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add new indexes to static_pages
CREATE INDEX IF NOT EXISTS "static_pages_lockStatus_lockedBy_idx" ON "static_pages"("lockStatus", "lockedBy");
CREATE INDEX IF NOT EXISTS "static_pages_slug_version_idx" ON "static_pages"("slug", "version");
CREATE INDEX IF NOT EXISTS "static_pages_updatedAt_idx" ON "static_pages"("updatedAt");

-- Add new columns to static_page_versions
ALTER TABLE "static_page_versions"
  ADD COLUMN IF NOT EXISTS "changeSource" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "ipAddress" VARCHAR(45),
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

-- Add new indexes to static_page_versions
CREATE INDEX IF NOT EXISTS "static_page_versions_pageId_version_idx" ON "static_page_versions"("pageId", "version");
CREATE INDEX IF NOT EXISTS "static_page_versions_pageId_createdAt_idx" ON "static_page_versions"("pageId", "createdAt");
CREATE INDEX IF NOT EXISTS "static_page_versions_changedBy_idx" ON "static_page_versions"("changedBy");
CREATE INDEX IF NOT EXISTS "static_page_versions_createdAt_idx" ON "static_page_versions"("createdAt");

-- Enhance editable_elements indexes
CREATE INDEX IF NOT EXISTS "editable_elements_pageId_order_idx" ON "editable_elements"("pageId", "order");
CREATE INDEX IF NOT EXISTS "editable_elements_elementType_idx" ON "editable_elements"("elementType");
CREATE INDEX IF NOT EXISTS "editable_elements_updatedAt_idx" ON "editable_elements"("updatedAt");

-- Create element_changes table
CREATE TABLE IF NOT EXISTS "element_changes" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "changeType" "ChangeType_new" NOT NULL,
    "version" INTEGER NOT NULL,
    "elementId" VARCHAR(100),
    "elementType" "ElementType",
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "diffSummary" TEXT,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "userAgent" TEXT,
    "ipAddress" VARCHAR(45),

    CONSTRAINT "element_changes_pkey" PRIMARY KEY ("id")
);

-- Add indexes to element_changes
CREATE INDEX IF NOT EXISTS "element_changes_pageId_version_idx" ON "element_changes"("pageId", "version");
CREATE INDEX IF NOT EXISTS "element_changes_changeType_idx" ON "element_changes"("changeType");
CREATE INDEX IF NOT EXISTS "element_changes_changedAt_idx" ON "element_changes"("changedAt");
CREATE INDEX IF NOT EXISTS "element_changes_changedBy_idx" ON "element_changes"("changedBy");
CREATE INDEX IF NOT EXISTS "element_changes_elementId_idx" ON "element_changes"("elementId");

-- Add foreign key for element_changes
ALTER TABLE "element_changes"
  ADD CONSTRAINT "element_changes_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "static_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create sync_queue table
CREATE TABLE IF NOT EXISTS "sync_queue" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "operation" VARCHAR(50) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_queue_pkey" PRIMARY KEY ("id")
);

-- Add indexes to sync_queue
CREATE INDEX IF NOT EXISTS "sync_queue_status_priority_scheduledAt_idx" ON "sync_queue"("status", "priority", "scheduledAt");
CREATE INDEX IF NOT EXISTS "sync_queue_pageId_idx" ON "sync_queue"("pageId");
CREATE INDEX IF NOT EXISTS "sync_queue_status_idx" ON "sync_queue"("status");

-- Add foreign key for sync_queue
ALTER TABLE "sync_queue"
  ADD CONSTRAINT "sync_queue_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "static_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
