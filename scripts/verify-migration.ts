#!/usr/bin/env tsx
/**
 * dailyLimitMinutes 마이그레이션 결과 검증
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== dailyLimitMinutes 마이그레이션 결과 검증 ===\n');

  const limits = await prisma.service_reservation_limits.findMany({
    include: {
      service: {
        select: {
          name: true,
          durationMinutes: true,
          bufferMinutes: true
        }
      }
    },
    orderBy: { serviceType: 'asc' }
  });

  console.log('┌─────────────────────┬─────────────────┬───────────────────┬───────────────────┬─────────────────┐');
  console.log('│ serviceType         │ serviceName     │ dailyLimit (OLD)  │ dailyLimitMinutes │ Expected        │');
  console.log('├─────────────────────┼─────────────────┼───────────────────┼───────────────────┼─────────────────┤');

  limits.forEach(limit => {
    const serviceName = limit.service?.name || 'N/A';
    const totalDuration = (limit.service?.durationMinutes || 0) + (limit.service?.bufferMinutes || 0);
    const expected = limit.dailyLimit * totalDuration;
    const actual = limit.dailyLimitMinutes || 0;
    const status = actual === expected ? '✅' : '❌';

    console.log(
      `│ ${limit.serviceType.padEnd(20)}│ ${serviceName.padEnd(16)}│ ${String(limit.dailyLimit + '건').padEnd(18)}│ ${String(actual + '분').padEnd(18)}│ ${String(expected + '분').padEnd(16)}${status}│`
    );
  });

  console.log('└─────────────────────┴─────────────────┴───────────────────┴───────────────────┴─────────────────┘\n');

  // 검증 결과
  const allValid = limits.every(limit => {
    const totalDuration = (limit.service?.durationMinutes || 0) + (limit.service?.bufferMinutes || 0);
    const expected = limit.dailyLimit * totalDuration;
    return limit.dailyLimitMinutes === expected;
  });

  if (allValid) {
    console.log('✅ 마이그레이션 성공! 모든 데이터가 올바르게 변환되었습니다.\n');
  } else {
    console.log('❌ 마이그레이션 실패! 일부 데이터가 올바르게 변환되지 않았습니다.\n');
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
