import { ReactNode } from 'react';
import { Page, Popup, BoardPost, Reservation, User } from '@prisma/client';

// 공통 컴포넌트 Props 타입
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

// Recharts 관련 타입 정의
export interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
  color?: string;
}

export interface MultiValueChartData {
  name: string;
  [key: string]: string | number;
}

export interface PieChartData {
  name: string;
  value: number;
  fill?: string;
}

// Chart 컴포넌트 Props 타입
export interface AreaChartProps extends BaseComponentProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface BarChartProps extends BaseComponentProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface LineChartProps extends BaseComponentProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface PieChartProps extends BaseComponentProps {
  data: PieChartData[];
  width?: number;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

// Dashboard 관련 컴포넌트 타입
export interface StatsCardProps extends BaseComponentProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export interface DashboardStatsProps extends BaseComponentProps {
  totalPages: number;
  totalReservations: number;
  totalPopups: number;
  totalPosts: number;
}

// List 컴포넌트 타입
export interface PaginationProps extends BaseComponentProps {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  pages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface PageListProps extends BaseComponentProps {
  pages: Page[];
  pagination: PaginationProps;
}

export interface PopupListProps extends BaseComponentProps {
  popups: Popup[];
  pagination: PaginationProps;
}

export interface BoardPostListProps extends BaseComponentProps {
  posts: BoardPost[];
  pagination: PaginationProps;
}

export interface ReservationListProps extends BaseComponentProps {
  reservations: Reservation[];
  pagination: PaginationProps;
}

// Widget 컴포넌트 타입
export interface PostWidgetProps extends BaseComponentProps {
  posts: BoardPost[];
  loading?: boolean;
}

export interface ReservationWidgetProps extends BaseComponentProps {
  reservations: Reservation[];
  loading?: boolean;
}

export interface SystemStatusWidgetProps extends BaseComponentProps {
  status: {
    database: 'online' | 'offline' | 'warning';
    server: 'online' | 'offline' | 'warning';
    storage: 'online' | 'offline' | 'warning';
  };
}

export interface RecentActivityWidgetProps extends BaseComponentProps {
  activities: Array<{
    id: string;
    type: 'page' | 'reservation' | 'popup' | 'post';
    title: string;
    user: string;
    timestamp: string;
  }>;
}

// Form 컴포넌트 타입
export interface FormFieldProps extends BaseComponentProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  options?: Array<{ label: string; value: string | number }>;
}

// Button 컴포넌트 타입
export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

// Modal 컴포넌트 타입
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// File Upload 컴포넌트 타입
export interface FileUploadProps extends BaseComponentProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onUpload: (files: File[]) => void;
  loading?: boolean;
  error?: string;
}

// Search 컴포넌트 타입
export interface SearchProps extends BaseComponentProps {
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  loading?: boolean;
}

// Filter 컴포넌트 타입
export interface FilterProps extends BaseComponentProps {
  filters: Array<{
    key: string;
    label: string;
    type: 'select' | 'date' | 'text';
    options?: Array<{ label: string; value: string }>;
    value?: string;
  }>;
  onFilterChange: (key: string, value: string) => void;
  onReset: () => void;
}