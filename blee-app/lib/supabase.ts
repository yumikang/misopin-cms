import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          password: string
          role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR'
          isActive: boolean
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          password: string
          role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR'
          isActive?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          password?: string
          role?: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR'
          isActive?: boolean
          createdAt?: string
          updatedAt?: string
        }
      }
    }
  }
}

export type UserRole = Database['public']['Tables']['users']['Row']['role']