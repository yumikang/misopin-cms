import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

// Supabase Admin 클라이언트 (서버 사이드 전용)
// Service Role Key를 사용하여 RLS를 우회합니다
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Missing Supabase environment variables - using default service key')
  // 개발 환경용 기본 키 (프로덕션에서는 반드시 환경변수 설정 필요)
  const defaultServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpemxlZ2p2ZmFweWt1Znpyb2psIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA4MDk4OSwiZXhwIjoyMDczNjU2OTg5fQ.HRknUNazo3GE068z-VwqEOcGqmTMhu__v_RsnhV7SeI'

  // Admin client that bypasses RLS
  export const supabaseAdmin = createClient<Database>(
    supabaseUrl || 'https://wizlegjvfapykufzrojl.supabase.co',
    supabaseServiceKey || defaultServiceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
} else {
  export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}