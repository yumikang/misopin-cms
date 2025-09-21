import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database 타입 정의
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ENUM 타입 정의
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR' | 'USER'
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
export type Gender = 'MALE' | 'FEMALE'
export type TreatmentType = 'FIRST_VISIT' | 'FOLLOW_UP'
export type DisplayType = 'MODAL' | 'BANNER' | 'TOAST'
export type PositionType = 'CENTER' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT'
export type BoardType = 'NOTICE' | 'EVENT'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          password: string
          role: UserRole
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          password: string
          role?: UserRole
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          password?: string
          role?: UserRole
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pages: {
        Row: {
          id: string
          slug: string
          title: string
          content: Json | null
          html_content: string | null
          meta_title: string | null
          meta_description: string | null
          is_published: boolean
          version: number
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          content?: Json | null
          html_content?: string | null
          meta_title?: string | null
          meta_description?: string | null
          is_published?: boolean
          version?: number
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          content?: Json | null
          html_content?: string | null
          meta_title?: string | null
          meta_description?: string | null
          is_published?: boolean
          version?: number
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      board_posts: {
        Row: {
          id: string
          board_type: BoardType
          title: string
          content: string
          excerpt: string | null
          author: string
          image_url: string | null
          view_count: number
          is_published: boolean
          is_pinned: boolean
          tags: string[] | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          board_type: BoardType
          title: string
          content: string
          excerpt?: string | null
          author: string
          image_url?: string | null
          view_count?: number
          is_published?: boolean
          is_pinned?: boolean
          tags?: string[] | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          board_type?: BoardType
          title?: string
          content?: string
          excerpt?: string | null
          author?: string
          image_url?: string | null
          view_count?: number
          is_published?: boolean
          is_pinned?: boolean
          tags?: string[] | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      popups: {
        Row: {
          id: string
          title: string
          content: string | null
          image_url: string | null
          link_url: string | null
          display_type: DisplayType
          position: PositionType
          show_on_pages: string[] | null
          priority: number
          is_active: boolean
          start_date: string | null
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content?: string | null
          image_url?: string | null
          link_url?: string | null
          display_type?: DisplayType
          position?: PositionType
          show_on_pages?: string[] | null
          priority?: number
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string | null
          image_url?: string | null
          link_url?: string | null
          display_type?: DisplayType
          position?: PositionType
          show_on_pages?: string[] | null
          priority?: number
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          patient_name: string
          phone: string
          email: string | null
          birth_date: string
          gender: Gender
          treatment_type: TreatmentType
          service: string
          preferred_date: string
          preferred_time: string
          status: ReservationStatus
          notes: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_name: string
          phone: string
          email?: string | null
          birth_date: string
          gender: Gender
          treatment_type: TreatmentType
          service: string
          preferred_date: string
          preferred_time: string
          status?: ReservationStatus
          notes?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_name?: string
          phone?: string
          email?: string | null
          birth_date?: string
          gender?: Gender
          treatment_type?: TreatmentType
          service?: string
          preferred_date?: string
          preferred_time?: string
          status?: ReservationStatus
          notes?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: Json
          category: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          category: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          category?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      file_uploads: {
        Row: {
          id: string
          filename: string
          original_name: string
          mime_type: string
          file_size: number
          storage_path: string
          public_url: string
          category: string
          description: string | null
          uploaded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          filename: string
          original_name: string
          mime_type: string
          file_size: number
          storage_path: string
          public_url: string
          category?: string
          description?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          filename?: string
          original_name?: string
          mime_type?: string
          file_size?: number
          storage_path?: string
          public_url?: string
          category?: string
          description?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      reservation_status: ReservationStatus
      gender: Gender
      treatment_type: TreatmentType
      display_type: DisplayType
      position_type: PositionType
      board_type: BoardType
    }
  }
}

// Helper 타입들
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// 타입 내보내기
export type User = Tables<'users'>
export type Page = Tables<'pages'>
export type BoardPost = Tables<'board_posts'>
export type Popup = Tables<'popups'>
export type Reservation = Tables<'reservations'>
export type SystemSetting = Tables<'system_settings'>
export type FileUpload = Tables<'file_uploads'>