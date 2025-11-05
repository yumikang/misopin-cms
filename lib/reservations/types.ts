/**
 * Reservation System Type Definitions
 *
 * Centralized type definitions for the reservation system.
 * Uses Prisma types for database models to ensure type safety.
 */

import { Prisma, Period, DayOfWeek, ReservationStatus } from '@prisma/client';

/**
 * 타임슬롯 계산에 필요한 최소한의 예약 정보
 * Prisma의 select로 필요한 필드만 가져온 타입
 */
export type ReservationForTimeSlot = Prisma.reservationsGetPayload<{
  select: {
    id: true;
    period: true;
    preferredTime: true;
    timeSlotStart: true;
    timeSlotEnd: true;
    estimatedDuration: true;
  }
}>;

/**
 * 타임슬롯 정보
 */
export interface TimeSlot {
  /** 시간 (HH:mm 형식) */
  time: string;
  /** 시간대 (오전/오후/저녁) */
  period: Period;
  /** 예약 가능 여부 */
  available: boolean;
  /** 남은 예약 가능 수 */
  remaining: number;
  /** 전체 수용 가능 수 */
  total: number;
  /** 상태 (available/limited/full) */
  status: 'available' | 'limited' | 'full';
}

/**
 * 타임슬롯 계산 결과
 */
export interface TimeSlotResult {
  /** 타임슬롯 목록 */
  slots: TimeSlot[];
  /** 메타데이터 */
  metadata: {
    date: string;
    service: string;
    serviceName: string;
    totalSlots: number;
    availableSlots: number;
    bookedSlots: number;
  };
}

/**
 * 예약 에러 메타데이터
 */
export interface ReservationErrorMetadata {
  /** 추천 시간대 */
  suggestedTimes?: string[];
  /** 대안 기간 (오전/오후/저녁) */
  alternativePeriods?: Period[];
  /** 다음 가능한 날짜 */
  nextAvailableDate?: string;

  /** 남은 시간 (분) */
  remainingMinutes?: number;
  /** 필요한 시간 (분) */
  requiredMinutes?: number;
  /** 전체 시간 (분) */
  totalMinutes?: number;

  /** 요청한 날짜 */
  requestedDate?: string;
  /** 요청한 시간대 */
  requestedPeriod?: Period;
  /** 서비스 코드 */
  serviceCode?: string;

  /** 기타 추가 정보 */
  [key: string]: unknown;
}

/**
 * 캐시된 예약 데이터
 */
export interface CachedReservationData {
  /** 예약 목록 */
  reservations: ReservationForTimeSlot[];
  /** 캐시 생성 시간 (Unix timestamp) */
  timestamp: number;
  /** TTL (milliseconds) */
  ttl: number;
}

/**
 * 타임슬롯 계산 옵션
 */
export interface TimeSlotCalculationOptions {
  /** 캐시 사용 여부 (기본: true) */
  useCache?: boolean;
  /** 캐시 TTL (milliseconds, 기본: 5분) */
  cacheTTL?: number;
  /** 타임슬롯 간격 (분, 기본: 30) */
  slotInterval?: number;
  /** 안전 여유율 0-1 (기본: 0.1 = 10%) */
  safetyMargin?: number;
  /** 디버그 모드 */
  debug?: boolean;
}

/**
 * Day of week 매핑 (JavaScript Date.getDay() -> Prisma DayOfWeek enum)
 */
export const DAY_OF_WEEK_MAP: Record<number, DayOfWeek> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
} as const;

/**
 * Period 라벨 매핑 (영문 -> 한글)
 */
export const PERIOD_LABEL_MAP: Record<Period, string> = {
  MORNING: '오전',
  AFTERNOON: '오후',
} as const;

/**
 * 예약 상태 라벨 매핑
 */
export const STATUS_LABEL_MAP: Record<ReservationStatus, string> = {
  PENDING: '대기중',
  CONFIRMED: '확정',
  COMPLETED: '완료',
  CANCELLED: '취소',
  NO_SHOW: '노쇼',
  REJECTED: '거절',
} as const;
