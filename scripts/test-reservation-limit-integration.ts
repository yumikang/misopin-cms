#!/usr/bin/env tsx
/**
 * 예약 한도 통합 테스트
 *
 * 테스트 시나리오:
 * 1. 한도 설정 (테스트 시술: dailyLimit=2)
 * 2. 예약 1 생성 → 성공
 * 3. 예약 2 생성 → 성공
 * 4. 예약 3 생성 → 실패 (한도 초과)
 * 5. 다른 날짜 예약 → 성공
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_DATE = '2025-11-10'; // 테스트 날짜
const TEST_SERVICE_CODE = 'WRINKLE_BOTOX'; // 주름/보톡스

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 예약 한도 통합 테스트');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. 테스트용 시술 조회
    console.log('1️⃣ 테스트 시술 조회\n');

    const service = await prisma.services.findUnique({
      where: { code: TEST_SERVICE_CODE },
      select: {
        id: true,
        name: true,
        code: true
      }
    });

    if (!service) {
      throw new Error(`Service not found: ${TEST_SERVICE_CODE}`);
    }

    console.log(`  ✅ 시술: ${service.name} (${service.id.substring(0, 8)}...)\n`);

    // 2. 한도 설정
    console.log('2️⃣ 한도 설정 (dailyLimit=2)\n');

    // 기존 한도 확인
    const existingLimit = await prisma.service_reservation_limits.findUnique({
      where: { serviceId: service.id }
    });

    if (existingLimit) {
      // 업데이트
      await prisma.service_reservation_limits.update({
        where: { serviceId: service.id },
        data: {
          dailyLimit: 2,
          isActive: true,
          reason: '통합 테스트용 한도 설정',
          updatedBy: 'test-script'
        }
      });
      console.log(`  ✅ 기존 한도 업데이트: ${service.name} = 2건/일\n`);
    } else {
      // 신규 생성
      await prisma.service_reservation_limits.create({
        data: {
          id: `limit_${service.code}`,
          serviceType: service.code as any,
          serviceId: service.id,
          dailyLimit: 2,
          isActive: true,
          reason: '통합 테스트용 한도 설정',
          updatedBy: 'test-script'
        }
      });
      console.log(`  ✅ 새 한도 생성: ${service.name} = 2건/일\n`);
    }

    // 3. 테스트 날짜의 기존 예약 삭제 (클린 상태)
    console.log('3️⃣ 테스트 날짜 기존 예약 정리\n');

    const testDate = new Date(TEST_DATE);
    const deleted = await prisma.reservations.deleteMany({
      where: {
        serviceId: service.id,
        preferredDate: testDate,
        patientName: {
          startsWith: 'TEST_' // 테스트 예약만 삭제
        }
      }
    });

    console.log(`  ✅ 기존 테스트 예약 ${deleted.count}건 삭제\n`);

    // 4. 현재 예약 건수 확인
    console.log('4️⃣ 현재 예약 건수 확인\n');

    const startOfDay = new Date(testDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(testDate);
    endOfDay.setHours(23, 59, 59, 999);

    const currentCount = await prisma.reservations.count({
      where: {
        serviceId: service.id,
        preferredDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'COMPLETED']
        }
      }
    });

    console.log(`  📊 ${TEST_DATE} 현재 예약: ${currentCount}건\n`);

    // 5. 테스트 예약 시뮬레이션
    console.log('5️⃣ 예약 시뮬레이션\n');

    const testReservations = [
      {
        name: 'TEST_Patient_1',
        time: '10:00',
        shouldSucceed: true,
        description: '첫 번째 예약 (1/2)'
      },
      {
        name: 'TEST_Patient_2',
        time: '11:00',
        shouldSucceed: true,
        description: '두 번째 예약 (2/2)'
      },
      {
        name: 'TEST_Patient_3',
        time: '14:00',
        shouldSucceed: false,
        description: '세 번째 예약 (3/2 - 한도 초과)'
      }
    ];

    let successCount = 0;
    let failCount = 0;

    for (const test of testReservations) {
      console.log(`  📝 ${test.description}`);

      try {
        const reservation = await prisma.reservations.create({
          data: {
            id: crypto.randomUUID(),
            patientName: test.name,
            phone: '010-0000-0000',
            birthDate: new Date('1990-01-01'),
            gender: 'MALE',
            treatmentType: 'FIRST_VISIT',
            service: service.code as any,
            preferredDate: testDate,
            preferredTime: test.time,
            serviceId: service.id,
            serviceName: service.name,
            estimatedDuration: 30,
            period: test.time.startsWith('1') && parseInt(test.time) >= 12 ? 'AFTERNOON' : 'MORNING',
            timeSlotStart: test.time,
            timeSlotEnd: test.time,
            status: 'PENDING',
            statusChangedAt: new Date(),
            updatedAt: new Date()
          }
        });

        if (test.shouldSucceed) {
          console.log(`     ✅ 성공: ${reservation.id.substring(0, 8)}...\n`);
          successCount++;
        } else {
          console.log(`     ⚠️  예상과 다름: 성공함 (한도 체크 없음?)\n`);
        }

      } catch (error: any) {
        if (!test.shouldSucceed) {
          console.log(`     ✅ 예상대로 실패: ${error.message}\n`);
          failCount++;
        } else {
          console.log(`     ❌ 예상과 다름: 실패함\n`);
          throw error;
        }
      }
    }

    // 6. 최종 예약 건수 확인
    console.log('6️⃣ 최종 예약 건수 확인\n');

    const finalCount = await prisma.reservations.count({
      where: {
        serviceId: service.id,
        preferredDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'COMPLETED']
        }
      }
    });

    console.log(`  📊 ${TEST_DATE} 최종 예약: ${finalCount}건\n`);

    // 7. 결과 요약
    console.log('='.repeat(70));
    console.log('📊 테스트 결과');
    console.log('='.repeat(70) + '\n');

    console.log(`  ✅ 성공 예약: ${successCount}건`);
    console.log(`  ❌ 실패 예약: ${failCount}건`);
    console.log(`  📦 최종 예약: ${finalCount}건 (한도: 2건)\n`);

    if (finalCount === 2) {
      console.log('🎉 테스트 성공!');
      console.log('   → 한도 체크가 정상적으로 작동합니다.\n');
    } else {
      console.log('⚠️  테스트 실패!');
      console.log(`   → 예상 예약 건수: 2건, 실제: ${finalCount}건\n`);
    }

    // 8. 정리 안내
    console.log('='.repeat(70));
    console.log('📋 다음 단계');
    console.log('='.repeat(70) + '\n');

    console.log('  ℹ️  이 테스트는 DB에서 직접 예약을 생성했습니다.');
    console.log('     실제 API는 다음 명령으로 테스트하세요:\n');
    console.log('  curl -X POST http://localhost:3003/api/public/reservations \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log(`    -d '{"patient_name":"TEST","phone":"010-0000-0000","birth_date":"1990-01-01","gender":"MALE","treatment_type":"FIRST_VISIT","service":"${TEST_SERVICE_CODE}","preferred_date":"${TEST_DATE}","preferred_time":"15:00"}'\n`);

    console.log('  정리 명령:\n');
    console.log(`  await prisma.reservations.deleteMany({ where: { patientName: { startsWith: 'TEST_' } } })\n`);

  } catch (error: any) {
    console.error('\n❌ 테스트 실패:\n');
    console.error(error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
