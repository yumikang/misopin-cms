-- CreateEnum
CREATE TYPE "public"."TemplateCategory" AS ENUM ('UI', 'LAYOUT', 'CONTENT', 'FORM', 'MEDIA', 'NAVIGATION', 'MARKETING', 'SOCIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."BlockType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL', 'GRID', 'BUTTON', 'FORM', 'MAP', 'HTML', 'COMPONENT');

-- CreateTable
CREATE TABLE "public"."content_blocks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."BlockType" NOT NULL,
    "content" JSONB NOT NULL,
    "styles" JSONB,
    "settings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."page_blocks" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "customStyles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."seo_settings" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT[],
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "canonicalUrl" TEXT,
    "structuredData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."content_versions" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "styles" JSONB,
    "settings" JSONB,
    "changedBy" TEXT NOT NULL,
    "changeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."block_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."TemplateCategory" NOT NULL,
    "thumbnailUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "templateData" JSONB NOT NULL,
    "tags" TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "block_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_blocks_type_idx" ON "public"."content_blocks"("type");

-- CreateIndex
CREATE INDEX "content_blocks_isGlobal_idx" ON "public"."content_blocks"("isGlobal");

-- CreateIndex
CREATE INDEX "page_blocks_pageId_idx" ON "public"."page_blocks"("pageId");

-- CreateIndex
CREATE INDEX "page_blocks_blockId_idx" ON "public"."page_blocks"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "page_blocks_pageId_sectionName_order_key" ON "public"."page_blocks"("pageId", "sectionName", "order");

-- CreateIndex
CREATE UNIQUE INDEX "seo_settings_pageId_key" ON "public"."seo_settings"("pageId");

-- CreateIndex
CREATE INDEX "content_versions_blockId_idx" ON "public"."content_versions"("blockId");

-- CreateIndex
CREATE INDEX "content_versions_changedBy_idx" ON "public"."content_versions"("changedBy");

-- CreateIndex
CREATE UNIQUE INDEX "content_versions_blockId_version_key" ON "public"."content_versions"("blockId", "version");

-- CreateIndex
CREATE INDEX "block_templates_category_idx" ON "public"."block_templates"("category");

-- CreateIndex
CREATE INDEX "block_templates_isPublic_idx" ON "public"."block_templates"("isPublic");

-- CreateIndex
CREATE INDEX "block_templates_createdBy_idx" ON "public"."block_templates"("createdBy");

-- AddForeignKey
ALTER TABLE "public"."page_blocks" ADD CONSTRAINT "page_blocks_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."page_blocks" ADD CONSTRAINT "page_blocks_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "public"."content_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."seo_settings" ADD CONSTRAINT "seo_settings_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."content_versions" ADD CONSTRAINT "content_versions_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "public"."content_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."content_versions" ADD CONSTRAINT "content_versions_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."block_templates" ADD CONSTRAINT "block_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
