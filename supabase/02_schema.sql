-- ===============================================
-- 미소핀의원 CMS 데이터베이스 스키마
-- Supabase PostgreSQL 15+ 전용
-- ===============================================

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- ENUM 타입 정의
-- ===============================================

-- 사용자 역할
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'EDITOR', 'USER');

-- 예약 상태
CREATE TYPE reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- 성별
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE');

-- 진료 타입
CREATE TYPE treatment_type AS ENUM ('FIRST_VISIT', 'FOLLOW_UP');

-- 팝업 표시 타입
CREATE TYPE display_type AS ENUM ('MODAL', 'BANNER', 'TOAST');

-- 팝업 위치
CREATE TYPE position_type AS ENUM ('CENTER', 'TOP', 'BOTTOM', 'LEFT', 'RIGHT');

-- 게시판 타입
CREATE TYPE board_type AS ENUM ('NOTICE', 'EVENT');

-- ===============================================
-- 핵심 테이블
-- ===============================================

-- 사용자 테이블
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'EDITOR',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 페이지 테이블
CREATE TABLE public.pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content JSONB,
    html_content TEXT,
    meta_title VARCHAR(255),
    meta_description TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    version INTEGER NOT NULL DEFAULT 1,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 게시글 테이블
CREATE TABLE public.board_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_type board_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    author VARCHAR(100) NOT NULL,
    image_url VARCHAR(500),
    view_count INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT false,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    tags TEXT[],
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 팝업 테이블
CREATE TABLE public.popups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    display_type display_type NOT NULL DEFAULT 'MODAL',
    position position_type NOT NULL DEFAULT 'CENTER',
    show_on_pages TEXT[],
    priority INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT false,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 예약 테이블
CREATE TABLE public.reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    birth_date DATE NOT NULL,
    gender gender NOT NULL,
    treatment_type treatment_type NOT NULL,
    service TEXT NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time VARCHAR(20) NOT NULL,
    status reservation_status NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 시스템 설정 테이블
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 파일 업로드 테이블
CREATE TABLE public.file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    public_url VARCHAR(500) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    description TEXT,
    uploaded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- 인덱스 생성
-- ===============================================

-- 사용자 인덱스
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- 페이지 인덱스
CREATE INDEX idx_pages_slug ON public.pages(slug);
CREATE INDEX idx_pages_published ON public.pages(is_published, published_at);

-- 게시글 인덱스
CREATE INDEX idx_board_posts_type ON public.board_posts(board_type);
CREATE INDEX idx_board_posts_published ON public.board_posts(is_published, published_at);
CREATE INDEX idx_board_posts_pinned ON public.board_posts(is_pinned, created_at);

-- 팝업 인덱스
CREATE INDEX idx_popups_active ON public.popups(is_active, start_date, end_date);

-- 예약 인덱스
CREATE INDEX idx_reservations_date ON public.reservations(preferred_date);
CREATE INDEX idx_reservations_status ON public.reservations(status);

-- 파일 인덱스
CREATE INDEX idx_files_category ON public.file_uploads(category);
CREATE INDEX idx_files_uploader ON public.file_uploads(uploaded_by);

-- ===============================================
-- RLS (Row Level Security) 정책
-- ===============================================

-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 (인증 없이 접근 가능)
CREATE POLICY "Public pages are viewable by everyone"
    ON public.pages FOR SELECT
    USING (is_published = true);

CREATE POLICY "Published posts are viewable by everyone"
    ON public.board_posts FOR SELECT
    USING (is_published = true);

CREATE POLICY "Active popups are viewable by everyone"
    ON public.popups FOR SELECT
    USING (is_active = true AND start_date <= NOW() AND end_date >= NOW());

-- 인증된 사용자 정책 (SELECT)
CREATE POLICY "Authenticated users can view pages"
    ON public.pages FOR SELECT
    USING (auth.role() = 'authenticated' OR is_published = true);

CREATE POLICY "Authenticated users can view posts"
    ON public.board_posts FOR SELECT
    USING (auth.role() = 'authenticated' OR is_published = true);

CREATE POLICY "Authenticated users can view popups"
    ON public.popups FOR SELECT
    USING (auth.role() = 'authenticated' OR (is_active = true AND start_date <= NOW() AND end_date >= NOW()));

CREATE POLICY "Authenticated users can view reservations"
    ON public.reservations FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view settings"
    ON public.system_settings FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view files"
    ON public.file_uploads FOR SELECT
    USING (auth.role() = 'authenticated');

-- 인증된 사용자 정책 (INSERT)
CREATE POLICY "Authenticated users can create pages"
    ON public.pages FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create posts"
    ON public.board_posts FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create popups"
    ON public.popups FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create reservations"
    ON public.reservations FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create settings"
    ON public.system_settings FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload files"
    ON public.file_uploads FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 인증된 사용자 정책 (UPDATE)
CREATE POLICY "Authenticated users can update pages"
    ON public.pages FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update posts"
    ON public.board_posts FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update popups"
    ON public.popups FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update reservations"
    ON public.reservations FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update settings"
    ON public.system_settings FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update files"
    ON public.file_uploads FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 인증된 사용자 정책 (DELETE)
CREATE POLICY "Authenticated users can delete pages"
    ON public.pages FOR DELETE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete posts"
    ON public.board_posts FOR DELETE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete popups"
    ON public.popups FOR DELETE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete reservations"
    ON public.reservations FOR DELETE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete settings"
    ON public.system_settings FOR DELETE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete files"
    ON public.file_uploads FOR DELETE
    USING (auth.role() = 'authenticated');

-- ===============================================
-- 트리거 함수
-- ===============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_posts_updated_at BEFORE UPDATE ON public.board_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_popups_updated_at BEFORE UPDATE ON public.popups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON public.file_uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 완료 확인
-- ===============================================

DO $$
DECLARE
    table_count INTEGER;
    type_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name IN ('users', 'pages', 'board_posts', 'popups', 'reservations', 'system_settings', 'file_uploads');

    SELECT COUNT(*) INTO type_count
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.typtype = 'e';

    RAISE NOTICE '====================================';
    RAISE NOTICE '스키마 생성 완료!';
    RAISE NOTICE '생성된 테이블: % 개', table_count;
    RAISE NOTICE '생성된 타입: % 개', type_count;
    RAISE NOTICE '====================================';
    RAISE NOTICE '이제 03_seed.sql을 실행하여 기본 데이터를 입력하세요.';
END $$;