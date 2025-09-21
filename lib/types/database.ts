// Database Types - NO ANY TYPE ALLOWED

export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
  isActive: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  date: string;
  time: string;
  message: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface Popup {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  display_type: 'MODAL' | 'LAYER' | 'BANNER';
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  show_today_close: boolean;
  position: 'CENTER' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
  width: number | null;
  height: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoardPost {
  id: string;
  category_id: string | null;
  title: string;
  content: string | null;
  excerpt: string | null;
  thumbnail_url: string | null;
  view_count: number;
  is_published: boolean;
  is_featured: boolean;
  author_id: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
  // Relations
  category?: BoardCategory;
  author?: User;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  is_published: boolean;
  template: 'default' | 'landing' | 'contact' | 'about';
  author_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  author?: User;
}

export interface File {
  id: string;
  filename: string;
  original_name: string | null;
  mime_type: string | null;
  size: number | null;
  url: string;
  folder: string | null;
  uploaded_by: string | null;
  created_at: string;
  // Relations
  uploader?: User;
}

export interface Setting {
  id: string;
  key: string;
  value: string | null;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string | null;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
  // Relations
  updater?: User;
}

// Form Input Types
export interface ReservationInput {
  name: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  message?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
}

export interface PopupInput {
  title: string;
  content?: string;
  image_url?: string;
  link_url?: string;
  display_type?: 'MODAL' | 'LAYER' | 'BANNER';
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  show_today_close?: boolean;
  position?: 'CENTER' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
  width?: number;
  height?: number;
}

export interface BoardCategoryInput {
  name: string;
  slug: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface BoardPostInput {
  category_id?: string;
  title: string;
  content?: string;
  excerpt?: string;
  thumbnail_url?: string;
  is_published?: boolean;
  is_featured?: boolean;
}

export interface PageInput {
  title: string;
  slug: string;
  content?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  is_published?: boolean;
  template?: 'default' | 'landing' | 'contact' | 'about';
}

export interface FileInput {
  filename: string;
  original_name?: string;
  mime_type?: string;
  size?: number;
  url: string;
  folder?: string;
}

export interface SettingInput {
  key: string;
  value?: string;
  type?: 'string' | 'number' | 'boolean' | 'json';
  category?: string;
  description?: string;
}