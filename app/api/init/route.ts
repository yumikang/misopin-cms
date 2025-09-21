import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hash } from "bcryptjs";

// Complete initialization - checks and creates everything needed
export async function POST() {
  try {
    const steps = [];

    // Step 1: Check if all tables exist
    const tables = ['users', 'reservations', 'popups', 'board_categories', 'board_posts', 'pages', 'files', 'settings'];
    const missingTables = [];

    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      // Tables don't exist
      steps.push({
        step: 'table_check',
        status: 'missing',
        message: `Missing tables: ${missingTables.join(', ')}. Please create them using the SQL script.`
      });

      // Return SQL script for easy copy-paste
      return NextResponse.json({
        success: false,
        error: 'Table not found',
        message: 'Please run the following SQL in Supabase SQL Editor:',
        sql: `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  date DATE NOT NULL,
  time TIME NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create popups table
CREATE TABLE IF NOT EXISTS popups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  image_url TEXT,
  link_url TEXT,
  display_type VARCHAR(50) DEFAULT 'MODAL',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  show_today_close BOOLEAN DEFAULT true,
  position VARCHAR(50) DEFAULT 'CENTER',
  width INTEGER,
  height INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create board_categories table
CREATE TABLE IF NOT EXISTS board_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create board_posts table
CREATE TABLE IF NOT EXISTS board_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES board_categories(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  excerpt TEXT,
  thumbnail_url TEXT,
  view_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  author_id UUID REFERENCES users(id),
  published_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create pages table
CREATE TABLE IF NOT EXISTS pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  content TEXT,
  meta_title VARCHAR(200),
  meta_description TEXT,
  meta_keywords TEXT,
  is_published BOOLEAN DEFAULT true,
  template VARCHAR(50) DEFAULT 'default',
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  size BIGINT,
  url TEXT NOT NULL,
  folder VARCHAR(100),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  type VARCHAR(50) DEFAULT 'string',
  category VARCHAR(50),
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_popups_active ON popups(is_active);
CREATE INDEX IF NOT EXISTS idx_popups_dates ON popups(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_board_posts_category ON board_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_board_posts_published ON board_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_published ON pages(is_published);
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- Enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow Service Role to bypass RLS)
CREATE POLICY "Service role can do everything" ON users
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything" ON reservations
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything" ON popups
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything" ON board_categories
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything" ON board_posts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything" ON pages
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything" ON files
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything" ON settings
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Insert default board categories
INSERT INTO board_categories (name, slug, description, display_order, is_active) VALUES
  ('공지사항', 'notice', '병원 공지사항', 1, true),
  ('이벤트', 'event', '진행중인 이벤트', 2, true),
  ('건강정보', 'health', '건강 관련 정보', 3, true),
  ('FAQ', 'faq', '자주 묻는 질문', 4, true);

-- Insert default settings
INSERT INTO settings (key, value, type, category, description) VALUES
  ('site_name', '미소핀의원', 'string', 'general', '사이트 이름'),
  ('site_description', '미소핀의원 CMS', 'string', 'general', '사이트 설명'),
  ('contact_email', 'contact@misopin.com', 'string', 'contact', '연락처 이메일'),
  ('contact_phone', '02-1234-5678', 'string', 'contact', '연락처 전화번호'),
  ('business_hours', '평일 09:00 - 18:00, 토요일 09:00 - 13:00', 'string', 'contact', '영업 시간'),
  ('maintenance_mode', 'false', 'boolean', 'system', '유지보수 모드'),
  ('max_file_size', '10485760', 'number', 'system', '최대 파일 크기 (bytes)');
        `,
        next_step: 'After creating the table, run this API again to add test accounts.'
      }, { status: 400 });
    }

    steps.push({
      step: 'table_check',
      status: 'exists',
      message: 'All tables found'
    });

    // Step 2: Check if any users exist
    const { data: existingUsers, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('email')
      .limit(10);

    if (userCheckError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to check users',
        details: userCheckError.message
      }, { status: 500 });
    }

    if (existingUsers && existingUsers.length > 0) {
      steps.push({
        step: 'user_check',
        status: 'exists',
        message: `Found ${existingUsers.length} existing users`,
        users: existingUsers.map(u => u.email)
      });
    }

    // Step 3: Create test accounts
    const adminPassword = await hash("admin123", 12);
    const editorPassword = await hash("editor123", 12);

    const accounts = [
      {
        email: "admin@misopin.com",
        name: "슈퍼 관리자",
        password: adminPassword,
        role: "SUPER_ADMIN",
        isActive: true,
      },
      {
        email: "manager@misopin.com",
        name: "일반 관리자",
        password: adminPassword,
        role: "ADMIN",
        isActive: true,
      },
      {
        email: "editor@misopin.com",
        name: "편집자",
        password: editorPassword,
        role: "EDITOR",
        isActive: true,
      }
    ];

    const results = [];

    for (const account of accounts) {
      // Use upsert to handle existing users
      const { data, error } = await supabaseAdmin
        .from('users')
        .upsert(account, {
          onConflict: 'email',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        results.push({
          email: account.email,
          status: 'error',
          error: error.message
        });
      } else {
        results.push({
          email: account.email,
          status: 'success',
          data: data
        });
      }
    }

    steps.push({
      step: 'user_creation',
      status: 'completed',
      results
    });

    // Step 4: Verify setup
    const { data: finalCheck } = await supabaseAdmin
      .from('users')
      .select('email, role, isActive')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      message: "✅ Database initialization completed!",
      steps,
      current_users: finalCheck,
      test_accounts: [
        { email: "admin@misopin.com", password: "admin123", role: "SUPER_ADMIN" },
        { email: "manager@misopin.com", password: "admin123", role: "ADMIN" },
        { email: "editor@misopin.com", password: "editor123", role: "EDITOR" }
      ],
      login_url: process.env.NODE_ENV === 'production'
        ? 'https://misopin-cms.vercel.app/login'
        : 'http://localhost:3000/login'
    });

  } catch (error) {
    console.error('Init error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      hint: 'Check console for details'
    }, { status: 500 });
  }
}

// GET request for browser access
export async function GET() {
  return POST();
}