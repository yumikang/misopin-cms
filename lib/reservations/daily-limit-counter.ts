/**
 * 예약 한도 관리 - 실시간 COUNT 방식
 * 시술별 고정 한도를 기반으로 날짜별 예약 가능 여부를 실시간으로 체크
 */

import { prisma } from '@/lib/prisma';
import { Prisma, ServiceType, ReservationStatus } from '@prisma/client';

interface AvailabilityResult {
  available: boolean;
  currentCount: number;
  dailyLimit: number;
  remaining: number;
  level: 'available' | 'full';
}

/**
 * 특정 날짜 + 시술의 예약 가능 여부 확인
 * @param date - 예약 날짜
 * @param serviceType - 시술 타입
 * @returns 가용성 정보
 */
export async function checkAvailability(
  date: Date,
  serviceType: ServiceType
): Promise<AvailabilityResult> {
  // 1️⃣ 시술별 한도 조회
  const limit = await prisma.service_reservation_limits.findUnique({
    where: { serviceType },
    select: {
      dailyLimit: true,
      isActive: true
    }
  });

  // 한도 미설정 또는 비활성화
  if (!limit || !limit.isActive) {
    return {
      available: false,
      currentCount: 0,
      dailyLimit: 0,
      remaining: 0,
      level: 'full'
    };
  }

  // 2️⃣ 해당 날짜의 유효 예약 수 실시간 카운팅
  const currentCount = await prisma.reservations.count({
    where: {
      preferredDate: date,
      service: serviceType,
      status: {
        in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED]
      }
    }
  });

  // 3️⃣ 가용성 계산
  const remaining = Math.max(0, limit.dailyLimit - currentCount);
  const available = remaining > 0;

  // 4️⃣ 경고 레벨 결정 (단순화: 가능 또는 마감)
  const level: 'available' | 'full' = remaining > 0 ? 'available' : 'full';

  return {
    available,
    currentCount,
    dailyLimit: limit.dailyLimit,
    remaining,
    level
  };
}

/**
 * 예약 생성 가능 여부 검증 (트랜잭션용)
 * 비관적 락을 사용하여 동시성 보장
 * @param tx - Prisma 트랜잭션 클라이언트
 * @param date - 예약 날짜
 * @param serviceType - 시술 타입
 * @returns 생성 가능 여부
 */
export async function canCreateReservation(
  tx: Prisma.TransactionClient,
  date: Date,
  serviceType: ServiceType
): Promise<boolean> {
  // 1️⃣ 한도 조회
  const limit = await tx.service_reservation_limits.findUnique({
    where: { serviceType },
    select: {
      dailyLimit: true,
      isActive: true
    }
  });

  if (!limit || !limit.isActive) {
    return false;
  }

  // 2️⃣ 현재 예약 수 카운트
  const currentCount = await tx.reservations.count({
    where: {
      preferredDate: date,
      service: serviceType,
      status: { in: ['PENDING', 'CONFIRMED'] }
    }
  });

  // 3️⃣ 일일 한도 체크
  return currentCount < limit.dailyLimit;
}

/**
 * 모든 시술 타입의 한도 조회
 */
export async function getAllLimits() {
  return await prisma.service_reservation_limits.findMany({
    orderBy: { serviceType: 'asc' }
  });
}

/**
 * 시술별 한도 설정/수정
 */
export async function upsertLimit(
  serviceType: ServiceType,
  dailyLimit: number
) {
  return await prisma.service_reservation_limits.upsert({
    where: { serviceType },
    update: {
      dailyLimit,
      updatedAt: new Date()
    },
    create: {
      id: `limit_${serviceType}`,
      serviceType,
      dailyLimit,
      isActive: true,
      updatedAt: new Date()
    }
  });
}

/**
 * 시술별 한도 활성화/비활성화
 */
export async function toggleLimitActive(
  serviceType: ServiceType,
  isActive: boolean
) {
  return await prisma.service_reservation_limits.update({
    where: { serviceType },
    data: {
      isActive,
      updatedAt: new Date()
    }
  });
}
