#!/usr/bin/env tsx
/**
 * 기존 service_reservation_limits 데이터 확인 스크립트
 *
 * 목적:
 * 1. 현재 service_reservation_limits 테이블 데이터 확인
 * 2. services 테이블 매핑 가능 여부 확인
 * 3. 마이그레이션 전략 수립을 위한 정보 수집
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Service Reservation Limits 데이터 확인');
  console.log('='.repeat(60) + '\n');

  // 1. service_reservation_limits 테이블 데이터 조회
  console.log('1️⃣ service_reservation_limits 테이블 확인\n');

  try {
    const limits = await prisma.$queryRaw<any[]>`
      SELECT * FROM service_reservation_limits
    `;

    if (limits.length === 0) {
      console.log('  ℹ️  테이블이 비어있습니다. (기존 데이터 없음)\n');
    } else {
      console.log(`  📦 총 ${limits.length}건의 데이터 발견\n`);
      limits.forEach((limit, idx) => {
        console.log(`  [${idx + 1}] ${JSON.stringify(limit, null, 2)}`);
      });
      console.log();
    }
  } catch (error: any) {
    if (error.message.includes('does not exist')) {
      console.log('  ⚠️  테이블이 존재하지 않습니다.\n');
    } else {
      console.error('  ❌ 에러:', error.message);
    }
  }

  // 2. services 테이블 확인
  console.log('2️⃣ services 테이블 확인\n');

  const services = await prisma.services.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      displayOrder: true
    },
    orderBy: { displayOrder: 'asc' }
  });

  console.log(`  📦 활성 서비스: ${services.length}개\n`);
  services.forEach((service, idx) => {
    console.log(`  [${idx + 1}] ${service.name} (${service.code})`);
    console.log(`      ID: ${service.id}`);
    console.log(`      카테고리: ${service.category || 'N/A'}`);
  });
  console.log();

  // 3. 테이블 스키마 확인
  console.log('3️⃣ service_reservation_limits 스키마 확인\n');

  try {
    const schema = await prisma.$queryRaw<any[]>`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'service_reservation_limits'
      ORDER BY ordinal_position
    `;

    if (schema.length === 0) {
      console.log('  ⚠️  스키마 정보를 가져올 수 없습니다.\n');
    } else {
      console.log('  컬럼 구조:\n');
      schema.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
        if (col.column_default) {
          console.log(`    기본값: ${col.column_default}`);
        }
      });
      console.log();
    }
  } catch (error: any) {
    console.error('  ❌ 스키마 조회 에러:', error.message);
  }

  // 4. 마이그레이션 가능 여부 분석
  console.log('4️⃣ 마이그레이션 가능 여부 분석\n');

  try {
    const limits = await prisma.$queryRaw<any[]>`
      SELECT * FROM service_reservation_limits
    `;

    if (limits.length === 0) {
      console.log('  ✅ 기존 데이터 없음 - 직접 스키마 수정 가능\n');
      console.log('  권장 방법:');
      console.log('  1. Prisma 스키마에서 serviceType 제거');
      console.log('  2. serviceId 외래키 추가');
      console.log('  3. 마이그레이션 실행\n');
    } else {
      console.log('  ⚠️  기존 데이터 존재 - 데이터 마이그레이션 필요\n');
      console.log('  필요한 작업:');
      console.log('  1. serviceType → serviceId 매핑 테이블 생성');
      console.log('  2. 데이터 변환 스크립트 작성');
      console.log('  3. 검증 후 serviceType 컬럼 제거\n');

      // serviceType 값 확인
      const serviceTypes = await prisma.$queryRaw<any[]>`
        SELECT DISTINCT "serviceType" FROM service_reservation_limits
      `;

      console.log('  발견된 serviceType 값:\n');
      serviceTypes.forEach(st => {
        console.log(`  - ${st.serviceType}`);

        // services 테이블에서 매칭 가능한지 확인
        const matchingService = services.find(s => s.code === st.serviceType);
        if (matchingService) {
          console.log(`    ✅ 매칭 가능: ${matchingService.name} (${matchingService.id})`);
        } else {
          console.log(`    ❌ 매칭 불가: services 테이블에 해당 code 없음`);
        }
      });
      console.log();
    }
  } catch (error: any) {
    if (error.message.includes('does not exist')) {
      console.log('  ℹ️  테이블이 존재하지 않습니다.\n');
      console.log('  권장 방법:');
      console.log('  1. Prisma 스키마 작성');
      console.log('  2. 초기 마이그레이션 실행\n');
    } else {
      console.error('  ❌ 에러:', error.message);
    }
  }

  // 5. 다음 단계 권장사항
  console.log('='.repeat(60));
  console.log('📋 다음 단계 권장사항');
  console.log('='.repeat(60) + '\n');

  try {
    const limits = await prisma.$queryRaw<any[]>`
      SELECT * FROM service_reservation_limits
    `;

    if (limits.length === 0) {
      console.log('✅ Phase 1: Prisma 스키마 수정 (바로 진행 가능)');
      console.log('   → serviceId 외래키 추가');
      console.log('   → reason, updatedBy 컬럼 추가');
      console.log('   → 마이그레이션 실행\n');

      console.log('✅ Phase 2: API 개발');
      console.log('   → GET/POST 엔드포인트 구현\n');
    } else {
      console.log('⚠️  Phase 1a: 데이터 마이그레이션 스크립트 작성 (필수)');
      console.log('   → serviceType → serviceId 매핑');
      console.log('   → 데이터 변환 및 검증\n');

      console.log('⚠️  Phase 1b: Prisma 스키마 수정');
      console.log('   → 단계적 마이그레이션 필요\n');
    }
  } catch (error) {
    console.log('ℹ️  테이블 생성부터 시작');
  }

  console.log();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
