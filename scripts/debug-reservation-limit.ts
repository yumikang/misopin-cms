#!/usr/bin/env tsx
/**
 * 예약 한도 디버깅 스크립트
 *
 * 현재 상태를 상세히 분석합니다
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 예약 한도 디버깅');
  console.log('='.repeat(70) + '\n');

  // 1. 모든 한도 설정 확인
  console.log('1️⃣ 현재 한도 설정\n');

  const limits = await prisma.service_reservation_limits.findMany({
    include: {
      service: {
        select: { name: true, code: true }
      }
    },
    orderBy: { serviceType: 'asc' }
  });

  limits.forEach(limit => {
    console.log(`  ${limit.service?.name || 'N/A'} (${limit.serviceType})`);
    console.log(`    serviceId: ${limit.serviceId?.substring(0, 8)}...`);
    console.log(`    dailyLimit: ${limit.dailyLimit}건`);
    console.log(`    isActive: ${limit.isActive}`);
    console.log(`    updatedBy: ${limit.updatedBy || 'N/A'}`);
    console.log(`    reason: ${limit.reason || 'N/A'}`);
    console.log();
  });

  // 2. 최근 예약 확인 (최근 7일)
  console.log('2️⃣ 최근 예약 현황 (최근 7일)\n');

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentReservations = await prisma.reservations.findMany({
    where: {
      createdAt: {
        gte: sevenDaysAgo
      }
    },
    select: {
      id: true,
      patientName: true,
      preferredDate: true,
      preferredTime: true,
      service: true,
      serviceId: true,
      serviceName: true,
      status: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 20
  });

  console.log(`  총 ${recentReservations.length}건\n`);

  recentReservations.forEach((res, idx) => {
    console.log(`  [${idx + 1}] ${res.patientName}`);
    console.log(`      날짜: ${res.preferredDate.toISOString().split('T')[0]} ${res.preferredTime}`);
    console.log(`      시술: ${res.serviceName || res.service}`);
    console.log(`      상태: ${res.status}`);
    console.log(`      생성: ${res.createdAt.toISOString()}`);
    console.log();
  });

  // 3. 날짜별 예약 통계 (오늘부터 7일)
  console.log('3️⃣ 날짜별 예약 통계 (향후 7일)\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  for (const limit of limits) {
    if (!limit.serviceId) continue;

    console.log(`  ${limit.service?.name} (한도: ${limit.dailyLimit}건/일)\n`);

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const count = await prisma.reservations.count({
        where: {
          serviceId: limit.serviceId,
          preferredDate: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: {
            in: ['PENDING', 'CONFIRMED', 'COMPLETED']
          }
        }
      });

      const dateStr = date.toISOString().split('T')[0];
      const status = count >= limit.dailyLimit ? '🔴 마감' : count > 0 ? '🟡 예약중' : '⚪ 여유';

      console.log(`    ${dateStr}: ${count}/${limit.dailyLimit}건 ${status}`);
    }

    console.log();
  }

  // 4. 오늘 예약 상세
  console.log('4️⃣ 오늘 예약 상세\n');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayReservations = await prisma.reservations.findMany({
    where: {
      preferredDate: {
        gte: todayStart,
        lte: todayEnd
      }
    },
    include: {
      services: {
        select: { name: true, code: true }
      }
    },
    orderBy: {
      preferredTime: 'asc'
    }
  });

  if (todayReservations.length === 0) {
    console.log('  오늘 예약 없음\n');
  } else {
    console.log(`  총 ${todayReservations.length}건\n`);

    todayReservations.forEach((res, idx) => {
      console.log(`  [${idx + 1}] ${res.preferredTime} - ${res.patientName}`);
      console.log(`      시술: ${res.services?.name || res.serviceName || res.service}`);
      console.log(`      상태: ${res.status}`);
      console.log();
    });
  }

  // 5. 문제 진단
  console.log('='.repeat(70));
  console.log('🔧 문제 진단');
  console.log('='.repeat(70) + '\n');

  // 한도가 0인 시술 확인
  const zeroLimits = limits.filter(l => l.dailyLimit === 0 || l.dailyLimit === 1);
  if (zeroLimits.length > 0) {
    console.log('  ⚠️  매우 낮은 한도 설정:\n');
    zeroLimits.forEach(l => {
      console.log(`    - ${l.service?.name}: ${l.dailyLimit}건 (1건만 예약해도 마감)`);
    });
    console.log();
  }

  // 비활성화된 한도 확인
  const inactiveLimits = limits.filter(l => !l.isActive);
  if (inactiveLimits.length > 0) {
    console.log('  ℹ️  비활성화된 한도:\n');
    inactiveLimits.forEach(l => {
      console.log(`    - ${l.service?.name}: 한도 없음 (무제한)`);
    });
    console.log();
  }

  console.log('  💡 권장 한도:\n');
  console.log('    - 주름/보톡스: 3-5건/일');
  console.log('    - 볼륨/리프팅: 3-5건/일');
  console.log('    - 피부케어: 5-8건/일');
  console.log('    - 제거시술: 3-5건/일');
  console.log('    - 바디케어: 5-8건/일');
  console.log('    - 기타 상담: 5-10건/일\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
