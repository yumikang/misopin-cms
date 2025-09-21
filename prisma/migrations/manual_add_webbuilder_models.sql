-- 웹빌더 모델 마이그레이션 SQL

-- BlockType 열거형 생성
CREATE TYPE "BlockType" AS ENUM (
  'TEXT',
  'IMAGE',
  'VIDEO',
  'CAROUSEL',
  'GRID',
  'BUTTON',
  'FORM',
  'MAP',
  'HTML',
  'COMPONENT'
);

-- ContentBlock 테이블 생성
CREATE TABLE "content_blocks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "content" JSONB NOT NULL,
    "styles" JSONB,
    "settings" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

-- PageBlock 테이블 생성
CREATE TABLE "page_blocks" (
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

-- SEOSetting 테이블 생성
CREATE TABLE "seo_settings" (
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

-- ContentVersion 테이블 생성
CREATE TABLE "content_versions" (
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

-- 인덱스 생성
CREATE INDEX "content_blocks_type_idx" ON "content_blocks"("type");
CREATE INDEX "content_blocks_isGlobal_idx" ON "content_blocks"("isGlobal");
CREATE INDEX "page_blocks_pageId_idx" ON "page_blocks"("pageId");
CREATE INDEX "page_blocks_blockId_idx" ON "page_blocks"("blockId");
CREATE INDEX "content_versions_blockId_idx" ON "content_versions"("blockId");
CREATE INDEX "content_versions_changedBy_idx" ON "content_versions"("changedBy");

-- 유니크 제약 조건
CREATE UNIQUE INDEX "page_blocks_pageId_sectionName_order_key" ON "page_blocks"("pageId", "sectionName", "order");
CREATE UNIQUE INDEX "seo_settings_pageId_key" ON "seo_settings"("pageId");
CREATE UNIQUE INDEX "content_versions_blockId_version_key" ON "content_versions"("blockId", "version");

-- 외래 키 제약 조건
ALTER TABLE "page_blocks" ADD CONSTRAINT "page_blocks_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "page_blocks" ADD CONSTRAINT "page_blocks_blockId_fkey"
    FOREIGN KEY ("blockId") REFERENCES "content_blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "seo_settings" ADD CONSTRAINT "seo_settings_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_blockId_fkey"
    FOREIGN KEY ("blockId") REFERENCES "content_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_changedBy_fkey"
    FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;