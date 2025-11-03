-- CreateEnum
CREATE TYPE "public"."LockStatus" AS ENUM ('UNLOCKED', 'LOCKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."ChangeType" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'PUBLISHED', 'UNPUBLISHED', 'RESTORED', 'BULK_UPDATE', 'REPARSE');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."SyncStatus_new" AS ENUM ('SYNCED', 'PENDING', 'IN_PROGRESS', 'FAILED', 'CONFLICT');
ALTER TABLE "public"."static_pages" ALTER COLUMN "syncStatus" DROP DEFAULT;
ALTER TABLE "public"."static_pages" ALTER COLUMN "syncStatus" TYPE "public"."SyncStatus_new" USING ("syncStatus"::text::"public"."SyncStatus_new");
ALTER TYPE "public"."SyncStatus" RENAME TO "SyncStatus_old";
ALTER TYPE "public"."SyncStatus_new" RENAME TO "SyncStatus";
DROP TYPE "public"."SyncStatus_old";
ALTER TABLE "public"."static_pages" ALTER COLUMN "syncStatus" SET DEFAULT 'SYNCED';
COMMIT;

-- DropIndex
DROP INDEX "public"."editable_elements_sectionName_idx";

-- DropIndex
DROP INDEX "public"."static_page_versions_pageId_idx";

-- AlterTable
ALTER TABLE "public"."static_page_versions" ADD COLUMN     "changeSource" VARCHAR(50),
ADD COLUMN     "ipAddress" VARCHAR(45),
ADD COLUMN     "userAgent" TEXT,
DROP COLUMN "changeType",
ADD COLUMN     "changeType" "public"."ChangeType" NOT NULL DEFAULT 'UPDATED';

-- AlterTable
ALTER TABLE "public"."static_pages" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "fileHash" TEXT,
ADD COLUMN     "lockExpiry" TIMESTAMP(3),
ADD COLUMN     "lockStatus" "public"."LockStatus" NOT NULL DEFAULT 'UNLOCKED',
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedBy" TEXT,
ADD COLUMN     "syncError" TEXT,
ADD COLUMN     "syncRetryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "public"."element_changes" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "changeType" "public"."ChangeType" NOT NULL,
    "version" INTEGER NOT NULL,
    "elementId" VARCHAR(100),
    "elementType" "public"."ElementType",
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

-- CreateTable
CREATE TABLE "public"."sync_queue" (
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

-- CreateIndex
CREATE INDEX "element_changes_pageId_version_idx" ON "public"."element_changes"("pageId", "version");

-- CreateIndex
CREATE INDEX "element_changes_changeType_idx" ON "public"."element_changes"("changeType");

-- CreateIndex
CREATE INDEX "element_changes_changedAt_idx" ON "public"."element_changes"("changedAt");

-- CreateIndex
CREATE INDEX "element_changes_changedBy_idx" ON "public"."element_changes"("changedBy");

-- CreateIndex
CREATE INDEX "element_changes_elementId_idx" ON "public"."element_changes"("elementId");

-- CreateIndex
CREATE INDEX "sync_queue_status_priority_scheduledAt_idx" ON "public"."sync_queue"("status", "priority", "scheduledAt");

-- CreateIndex
CREATE INDEX "sync_queue_pageId_idx" ON "public"."sync_queue"("pageId");

-- CreateIndex
CREATE INDEX "sync_queue_status_idx" ON "public"."sync_queue"("status");

-- CreateIndex
CREATE INDEX "editable_elements_pageId_sectionName_idx" ON "public"."editable_elements"("pageId", "sectionName");

-- CreateIndex
CREATE INDEX "editable_elements_elementType_idx" ON "public"."editable_elements"("elementType");

-- CreateIndex
CREATE INDEX "editable_elements_updatedAt_idx" ON "public"."editable_elements"("updatedAt");

-- CreateIndex
CREATE INDEX "static_page_versions_pageId_version_idx" ON "public"."static_page_versions"("pageId", "version");

-- CreateIndex
CREATE INDEX "static_page_versions_pageId_createdAt_idx" ON "public"."static_page_versions"("pageId", "createdAt");

-- CreateIndex
CREATE INDEX "static_page_versions_changeType_idx" ON "public"."static_page_versions"("changeType");

-- CreateIndex
CREATE INDEX "static_page_versions_changedBy_idx" ON "public"."static_page_versions"("changedBy");

-- CreateIndex
CREATE INDEX "static_pages_lockStatus_lockedBy_idx" ON "public"."static_pages"("lockStatus", "lockedBy");

-- CreateIndex
CREATE INDEX "static_pages_slug_version_idx" ON "public"."static_pages"("slug", "version");

-- CreateIndex
CREATE INDEX "static_pages_updatedAt_idx" ON "public"."static_pages"("updatedAt");

-- AddForeignKey
ALTER TABLE "public"."element_changes" ADD CONSTRAINT "element_changes_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."static_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sync_queue" ADD CONSTRAINT "sync_queue_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."static_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

