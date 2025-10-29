-- CreateEnum
CREATE TYPE "EditMode" AS ENUM ('PARSER', 'ATTRIBUTE');

-- CreateEnum
CREATE TYPE "ElementType" AS ENUM ('TEXT', 'HTML', 'IMAGE', 'BACKGROUND');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SYNCED', 'PENDING', 'CONFLICT', 'ERROR');

-- AlterTable
ALTER TABLE "static_pages" ADD COLUMN     "editMode" "EditMode" NOT NULL DEFAULT 'PARSER',
ADD COLUMN     "lastParsedAt" TIMESTAMP(3),
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED';

-- AlterTable
ALTER TABLE "static_page_versions" ADD COLUMN     "changeType" VARCHAR(50),
ADD COLUMN     "changedData" JSONB,
ALTER COLUMN     "changeNote" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "editable_elements" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "elementId" VARCHAR(100) NOT NULL,
    "elementType" "ElementType" NOT NULL,
    "selector" VARCHAR(500) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "currentValue" TEXT NOT NULL,
    "sectionName" VARCHAR(100),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editable_elements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "editable_elements_pageId_elementId_key" ON "editable_elements"("pageId", "elementId");

-- CreateIndex
CREATE INDEX "editable_elements_pageId_idx" ON "editable_elements"("pageId");

-- CreateIndex
CREATE INDEX "editable_elements_sectionName_idx" ON "editable_elements"("sectionName");

-- CreateIndex
CREATE INDEX "editable_elements_pageId_order_idx" ON "editable_elements"("pageId", "order");

-- CreateIndex
CREATE INDEX "static_pages_editMode_idx" ON "static_pages"("editMode");

-- CreateIndex
CREATE INDEX "static_pages_syncStatus_idx" ON "static_pages"("syncStatus");

-- CreateIndex
CREATE INDEX "static_page_versions_changeType_idx" ON "static_page_versions"("changeType");

-- CreateIndex
CREATE INDEX "static_page_versions_createdAt_idx" ON "static_page_versions"("createdAt");

-- AddForeignKey
ALTER TABLE "editable_elements" ADD CONSTRAINT "editable_elements_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "static_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
