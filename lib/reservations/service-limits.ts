/**
 * 시술별 예약 한도 관리 (시간 기반)
 *
 * 기능:
 * - 일일 예약 한도 체크 (시간 기반)
 * - 날짜 범위별 한도 정보 조회
 *
 * 시간 기반 로직:
 * - dailyLimitMinutes: 하루 최대 시술 시간 (분 단위)
 * - 예: 주름/보톡스 30분 시술 → 240분 한도 → 최대 8건 가능
 * - 장점: 시술 시간에 따라 수용 가능 건수 자동 조정
 *
 * 참고: lib/reservations/time-slot-calculator.ts (Line 239-246)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LimitCheckResult {
  available: boolean;
  dailyLimitMinutes: number | null;      // 하루 한도 (분)
  consumedMinutes: number;                 // 사용된 시간 (분)
  remainingMinutes: number;                // 남은 시간 (분)
  requestedDuration?: number;              // 요청한 시술 시간 (분)
  message?: string;
}

/**
 * 시술별 일일 한도 체크 (시간 기반)
 *
 * @param serviceId - 시술 UUID
 * @param date - 예약 날짜
 * @param requestedDuration - 요청한 시술 시간 (분, 선택사항)
 * @returns 한도 체크 결과
 *
 * @example
 * // 기본 체크 (한도 도달 여부만)
 * const result = await checkServiceDailyLimit(serviceId, new Date('2025-11-07'));
 * if (!result.available) {
 *   return res.status(409).json({ error: result.message });
 * }
 *
 * // 시술 시간 포함 체크 (남은 시간 부족 체크)
 * const result = await checkServiceDailyLimit(serviceId, new Date('2025-11-07'), 30);
 * if (!result.available) {
 *   return res.status(409).json({ error: result.message });
 * }
 */
export async function checkServiceDailyLimit(
  serviceId: string,
  date: Date,
  requestedDuration?: number
): Promise<LimitCheckResult> {
  try {
    // 1. 한도 설정 조회
    const limit = await prisma.service_reservation_limits.findUnique({
      where: { serviceId },
      include: {
        service: {
          select: { name: true, durationMinutes: true, bufferMinutes: true }
        }
      }
    });

    // 한도 설정이 없거나 비활성화된 경우 무제한
    if (!limit || !limit.isActive) {
      return {
        available: true,
        dailyLimitMinutes: null,
        consumedMinutes: 0,
        remainingMinutes: Infinity,
        requestedDuration
      };
    }

    // dailyLimitMinutes가 없으면 무제한 (하위 호환)
    if (!limit.dailyLimitMinutes) {
      return {
        available: true,
        dailyLimitMinutes: null,
        consumedMinutes: 0,
        remainingMinutes: Infinity,
        requestedDuration
      };
    }

    // 2. 해당 날짜의 예약 시간 합계 조회 (시간 기반!)
    // Use UTC dates to avoid timezone issues
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    // ✅ 핵심 변경: count() → aggregate({ _sum: { estimatedDuration } })
    const result = await prisma.reservations.aggregate({
      _sum: {
        estimatedDuration: true
      },
      where: {
        serviceId,
        preferredDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'COMPLETED']
          // CANCELLED, NO_SHOW, REJECTED는 한도에서 제외
        }
      }
    });

    const consumedMinutes = result._sum.estimatedDuration || 0;
    const remainingMinutes = limit.dailyLimitMinutes - consumedMinutes;

    // 🔍 DEBUG LOGGING
    console.log('🔍 Service Limit Check:', {
      serviceId,
      serviceName: limit.service?.name,
      date: date.toISOString().split('T')[0],
      dailyLimitMinutes: limit.dailyLimitMinutes,
      consumedMinutes,
      remainingMinutes,
      requestedDuration,
      checkPassed: consumedMinutes < limit.dailyLimitMinutes && (!requestedDuration || remainingMinutes >= requestedDuration)
    });

    // 3. 한도 체크
    // Case 1: 이미 한도 도달
    if (consumedMinutes >= limit.dailyLimitMinutes) {
      return {
        available: false,
        dailyLimitMinutes: limit.dailyLimitMinutes,
        consumedMinutes,
        remainingMinutes: 0,
        requestedDuration,
        message: `죄송합니다. ${limit.service?.name || '해당 시술'}은(는) ${date.toLocaleDateString('ko-KR')} 날짜의 예약이 마감되었습니다.`
      };
    }

    // Case 2: 요청 시간이 제공된 경우, 남은 시간 부족 체크
    if (requestedDuration && remainingMinutes < requestedDuration) {
      return {
        available: false,
        dailyLimitMinutes: limit.dailyLimitMinutes,
        consumedMinutes,
        remainingMinutes,
        requestedDuration,
        message: `죄송합니다. 해당 날짜의 예약이 마감되었습니다.`
      };
    }

    // Case 3: 예약 가능
    return {
      available: true,
      dailyLimitMinutes: limit.dailyLimitMinutes,
      consumedMinutes,
      remainingMinutes,
      requestedDuration
    };

  } catch (error) {
    console.error('Error checking service daily limit:', error);

    // 에러 발생 시 안전하게 통과 (예약 차단하지 않음)
    return {
      available: true,
      dailyLimitMinutes: null,
      consumedMinutes: 0,
      remainingMinutes: Infinity,
      requestedDuration,
      message: 'Limit check failed, allowing reservation'
    };
  }
}

/**
 * 여러 날짜의 한도 정보 조회 (캘린더용 - 시간 기반)
 *
 * @param serviceId - 시술 UUID
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 * @returns 날짜별 한도 정보 Map (key: YYYY-MM-DD)
 *
 * @example
 * const limits = await getServiceLimitsByDateRange(
 *   serviceId,
 *   new Date('2025-11-01'),
 *   new Date('2025-11-30')
 * );
 *
 * const nov7Limit = limits.get('2025-11-07');
 * if (nov7Limit && !nov7Limit.available) {
 *   console.log(`11월 7일 예약 마감 (${nov7Limit.consumedMinutes}/${nov7Limit.dailyLimitMinutes}분)`);
 * }
 */
export async function getServiceLimitsByDateRange(
  serviceId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, LimitCheckResult>> {
  try {
    // 1. 한도 설정 조회
    const limit = await prisma.service_reservation_limits.findUnique({
      where: { serviceId },
      include: {
        service: {
          select: { name: true }
        }
      }
    });

    const result = new Map<string, LimitCheckResult>();

    // 한도 설정이 없거나 비활성화되면 무제한
    if (!limit || !limit.isActive || !limit.dailyLimitMinutes) {
      return result;
    }

    // 2. 날짜 범위의 모든 예약 시간 합계 조회 (시간 기반!)
    const reservations = await prisma.reservations.groupBy({
      by: ['preferredDate'],
      where: {
        serviceId,
        preferredDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'COMPLETED']
        }
      },
      _sum: {
        estimatedDuration: true  // 시간 합계!
      }
    });

    // 3. 날짜별 결과 생성
    for (const reservation of reservations) {
      const dateKey = reservation.preferredDate.toISOString().split('T')[0];
      const consumedMinutes = reservation._sum.estimatedDuration || 0;
      const available = consumedMinutes < limit.dailyLimitMinutes;
      const remainingMinutes = Math.max(0, limit.dailyLimitMinutes - consumedMinutes);

      result.set(dateKey, {
        available,
        dailyLimitMinutes: limit.dailyLimitMinutes,
        consumedMinutes,
        remainingMinutes,
        message: available ? undefined : `예약 마감 (${consumedMinutes}/${limit.dailyLimitMinutes}분)`
      });
    }

    return result;

  } catch (error) {
    console.error('Error getting service limits by date range:', error);
    return new Map();
  }
}

/**
 * 모든 활성화된 시술의 한도 정보 조회
 *
 * @returns 시술별 한도 설정 배열
 */
export async function getAllActiveServiceLimits() {
  try {
    const limits = await prisma.service_reservation_limits.findMany({
      where: { isActive: true },
      include: {
        service: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            durationMinutes: true
          }
        }
      },
      orderBy: {
        serviceType: 'asc'
      }
    });

    return limits;

  } catch (error) {
    console.error('Error getting all active service limits:', error);
    return [];
  }
}
