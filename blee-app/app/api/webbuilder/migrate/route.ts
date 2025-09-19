import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST() {
  try {
    // Check if webbuilder tables already exist
    const tables = ['content_blocks', 'page_blocks', 'seo_settings', 'content_versions'];
    const existingTables = [];

    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .select('id')
        .limit(1);

      if (!error || error.code !== '42P01') {
        existingTables.push(table);
      }
    }

    if (existingTables.length === tables.length) {
      return NextResponse.json({
        success: true,
        message: '✅ Webbuilder tables already exist!',
        existing_tables: existingTables
      });
    }

    // Execute the migration SQL
    const migrationSQL = `
-- ============= 웹빌더 관련 모델 마이그레이션 =============

-- 콘텐츠 블록 모델 (재사용 가능한 콘텐츠 단위)
CREATE TABLE IF NOT EXISTS content_blocks (
  id VARCHAR(30) DEFAULT gen_random_uuid()::text PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  content JSONB NOT NULL,
  styles JSONB,
  settings JSONB,
  "isActive" BOOLEAN DEFAULT true,
  "isGlobal" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 페이지-블록 연결 모델
CREATE TABLE IF NOT EXISTS page_blocks (
  id VARCHAR(30) DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "pageId" VARCHAR(30) NOT NULL,
  "blockId" VARCHAR(30) NOT NULL,
  "sectionName" VARCHAR(255) NOT NULL,
  "order" INTEGER NOT NULL,
  "isVisible" BOOLEAN DEFAULT true,
  "customStyles" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_page_section_order UNIQUE ("pageId", "sectionName", "order")
);

-- SEO 설정 모델
CREATE TABLE IF NOT EXISTS seo_settings (
  id VARCHAR(30) DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "pageId" VARCHAR(30) UNIQUE NOT NULL,
  "metaTitle" VARCHAR(255),
  "metaDescription" TEXT,
  "metaKeywords" TEXT[],
  "ogTitle" VARCHAR(255),
  "ogDescription" TEXT,
  "ogImage" VARCHAR(500),
  "canonicalUrl" VARCHAR(500),
  "structuredData" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 콘텐츠 버전 관리 모델
CREATE TABLE IF NOT EXISTS content_versions (
  id VARCHAR(30) DEFAULT gen_random_uuid()::text PRIMARY KEY,
  "blockId" VARCHAR(30) NOT NULL,
  version INTEGER NOT NULL,
  content JSONB NOT NULL,
  styles JSONB,
  settings JSONB,
  "changedBy" VARCHAR(30) NOT NULL,
  "changeNote" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_block_version UNIQUE ("blockId", version)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_content_blocks_type ON content_blocks(type);
CREATE INDEX IF NOT EXISTS idx_content_blocks_global ON content_blocks("isGlobal");
CREATE INDEX IF NOT EXISTS idx_page_blocks_page ON page_blocks("pageId");
CREATE INDEX IF NOT EXISTS idx_page_blocks_block ON page_blocks("blockId");
CREATE INDEX IF NOT EXISTS idx_content_versions_block ON content_versions("blockId");
CREATE INDEX IF NOT EXISTS idx_content_versions_changed_by ON content_versions("changedBy");

-- 외래 키 제약 조건 추가 (pages 테이블이 이미 존재한다고 가정)
ALTER TABLE page_blocks
ADD CONSTRAINT fk_page_blocks_page
FOREIGN KEY ("pageId") REFERENCES pages(id) ON DELETE CASCADE;

ALTER TABLE page_blocks
ADD CONSTRAINT fk_page_blocks_block
FOREIGN KEY ("blockId") REFERENCES content_blocks(id);

ALTER TABLE seo_settings
ADD CONSTRAINT fk_seo_settings_page
FOREIGN KEY ("pageId") REFERENCES pages(id) ON DELETE CASCADE;

ALTER TABLE content_versions
ADD CONSTRAINT fk_content_versions_block
FOREIGN KEY ("blockId") REFERENCES content_blocks(id) ON DELETE CASCADE;

ALTER TABLE content_versions
ADD CONSTRAINT fk_content_versions_user
FOREIGN KEY ("changedBy") REFERENCES users(id);

-- RLS 정책 활성화
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

-- Service role 정책 생성
CREATE POLICY "Service role can do everything" ON content_blocks
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything" ON page_blocks
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything" ON seo_settings
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything" ON content_versions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
    `;

    // Execute SQL using Supabase Admin RPC
    const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', { sql: migrationSQL });

    if (sqlError) {
      return NextResponse.json({
        success: false,
        error: 'SQL execution failed',
        details: sqlError.message,
        sql: migrationSQL,
        hint: 'Please run this SQL manually in Supabase SQL Editor'
      }, { status: 500 });
    }

    // Insert sample data
    const { error: sampleError } = await supabaseAdmin
      .from('content_blocks')
      .insert([
        {
          name: '메인 배너 텍스트',
          type: 'TEXT',
          content: {
            type: 'TEXT',
            text: '<h1>미소핀의원에 오신 것을 환영합니다</h1><p>전문적인 진료와 최고의 서비스로 여러분의 건강을 지켜드립니다.</p>',
            format: 'html'
          },
          isActive: true,
          isGlobal: true
        },
        {
          name: '연락처 버튼',
          type: 'BUTTON',
          content: {
            type: 'BUTTON',
            text: '예약 문의',
            link: 'tel:02-1234-5678',
            variant: 'primary',
            size: 'large'
          },
          isActive: true,
          isGlobal: true
        },
        {
          name: '병원 소개 이미지',
          type: 'IMAGE',
          content: {
            type: 'IMAGE',
            src: '/images/hospital-main.jpg',
            alt: '미소핀의원 전경',
            caption: '미소핀의원'
          },
          isActive: true,
          isGlobal: true
        }
      ]);

    if (sampleError) {
      console.log('Sample data insertion warning:', sampleError.message);
    }

    // Verify tables were created
    const verification = [];
    for (const table of tables) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(1);

      verification.push({
        table,
        status: error ? 'error' : 'success',
        error: error?.message
      });
    }

    return NextResponse.json({
      success: true,
      message: '✅ Webbuilder migration completed!',
      verification,
      sample_data_status: sampleError ? 'warning' : 'success',
      sample_data_message: sampleError?.message || 'Sample content blocks created'
    });

  } catch (error) {
    console.error('Migration error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      hint: 'Check console for details'
    }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}