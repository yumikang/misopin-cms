import { Page, Popup, BoardPost, Reservation, User, UserRole, FileUpload } from '@prisma/client';

// 공통 API 응답 타입
export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 페이지네이션 타입
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  pages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

// API 응답 타입들
export interface PagesResponse {
  pages: Page[];
  pagination: PaginationInfo;
}

export interface PopupsResponse {
  popups: Popup[];
  pagination: PaginationInfo;
}

export interface BoardPostsResponse {
  posts: BoardPost[];
  pagination: PaginationInfo;
}

export interface ReservationsResponse {
  reservations: Reservation[];
  pagination: PaginationInfo;
}

// Prisma where 조건 타입 정의
export interface PageWhereInput {
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' };
    slug?: { contains: string; mode: 'insensitive' };
  }>;
  isPublished?: boolean;
}

export interface PopupWhereInput {
  isActive?: boolean;
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' };
    content?: { contains: string; mode: 'insensitive' };
  }>;
}

export interface BoardPostWhereInput {
  boardType?: string;
  isPublished?: boolean;
  OR?: Array<{
    title?: { contains: string; mode: 'insensitive' };
    content?: { contains: string; mode: 'insensitive' };
    author?: { contains: string; mode: 'insensitive' };
  }>;
}

export interface ReservationWhereInput {
  status?: string;
  preferredDate?: {
    gte?: Date;
    lte?: Date;
  };
  OR?: Array<{
    patientName?: { contains: string; mode: 'insensitive' };
    phone?: { contains: string; mode: 'insensitive' };
    service?: { contains: string; mode: 'insensitive' };
  }>;
}

// 요청 body 타입들
export interface CreatePageRequest {
  slug: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  isPublished?: boolean;
}

export interface CreatePopupRequest {
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  startDate: string;
  endDate: string;
  position?: { x: number; y: number; width: number; height: number };
  showOnPages?: string[];
  displayType?: string;
  priority?: number;
}

export interface CreateBoardPostRequest {
  boardType: string;
  title: string;
  content: string;
  excerpt?: string;
  author: string;
  isPublished?: boolean;
  isPinned?: boolean;
  tags?: string[];
  imageUrl?: string;
}

// 에러 응답 타입
export interface ApiError {
  error: string;
  code?: number;
  details?: string;
}

// Prisma 확장 타입 정의 (관계형 데이터)
export type PageWithRelations = Page & {
  author?: User;
};

export type UserWithUploads = User & {
  uploadedFiles: FileUpload[];
};

export type ReservationWithDetails = Reservation & {
  notes?: string;
  assignedTo?: User;
};

export type PopupWithStats = Popup & {
  viewCount?: number;
  clickCount?: number;
};

export type BoardPostWithAuthor = BoardPost & {
  authorUser?: User;
};

// Prisma 부분 타입 활용
export type PageCreate = Pick<Page, 'title' | 'content' | 'slug'>;
export type PageUpdate = Partial<Pick<Page, 'title' | 'content' | 'metadata' | 'isPublished'>>;

export type UserCreate = Pick<User, 'email' | 'name' | 'password' | 'role'>;
export type UserUpdate = Partial<Pick<User, 'name' | 'role' | 'isActive'>>;

export type PopupCreate = Pick<Popup, 'title' | 'content' | 'startDate' | 'endDate'>;
export type PopupUpdate = Partial<Pick<Popup, 'title' | 'content' | 'isActive' | 'priority'>>;

export type BoardPostCreate = Pick<BoardPost, 'boardType' | 'title' | 'content' | 'author'>;
export type BoardPostUpdate = Partial<Pick<BoardPost, 'title' | 'content' | 'isPublished' | 'isPinned'>>;

export type ReservationCreate = Pick<Reservation, 'patientName' | 'phone' | 'service' | 'preferredDate'>;
export type ReservationUpdate = Partial<Pick<Reservation, 'status' | 'confirmedDate' | 'notes'>>;

// 사용자 역할 기반 타입 가드
export const isAdmin = (user: User): boolean => {
  return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
};

export const isSuperAdmin = (user: User): boolean => {
  return user.role === UserRole.SUPER_ADMIN;
};

export const canEdit = (user: User): boolean => {
  return user.role !== UserRole.EDITOR || isAdmin(user);
};