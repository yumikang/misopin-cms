export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          password: string
          role: string
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
          role?: string
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
          role?: string
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
      board_posts: {
        Row: {
          id: string
          board_type: string
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
          board_type: string
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
          board_type?: string
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
        Relationships: []
      }
      popups: {
        Row: {
          id: string
          title: string
          content: string | null
          image_url: string | null
          link_url: string | null
          display_type: string
          position: string
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
          display_type?: string
          position?: string
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
          display_type?: string
          position?: string
          show_on_pages?: string[] | null
          priority?: number
          is_active?: boolean
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          id: string
          patient_name: string
          phone: string
          email: string | null
          birth_date: string
          gender: string
          treatment_type: string
          service: string
          preferred_date: string
          preferred_time: string
          status: string
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
          gender: string
          treatment_type: string
          service: string
          preferred_date: string
          preferred_time: string
          status?: string
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
          gender?: string
          treatment_type?: string
          service?: string
          preferred_date?: string
          preferred_time?: string
          status?: string
          notes?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}