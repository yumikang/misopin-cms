#!/usr/bin/env tsx
/**
 * service_reservation_limits 데이터 마이그레이션 스크립트
 *
 * 목적: serviceType (enum) → serviceId (UUID) 변환
 *
 * 단계:
 * 1. 기존 데이터 백업
 * 2. serviceType → serviceId 매핑
 * 3. 데이터 업데이트
 * 4. 검증
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ServiceType와 service code 매핑
const SERVICE_TYPE_TO_CODE_MAP: Record<string, string> = {
  WRINKLE_BOTOX: 'WRINKLE_BOTOX',
  VOLUME_LIFTING: 'VOLUME_LIFTING',
  SKIN_CARE: 'SKIN_CARE',
  REMOVAL_PROCEDURE: 'REMOVAL_PROCEDURE',
  BODY_CARE: 'BODY_CARE',
  OTHER_CONSULTATION: 'OTHER_CONSULTATION',
  VOLUME_FILLER: 'VOLUME_FILLER',
};

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 service_reservation_limits 데이터 마이그레이션 시작');
  console.log('='.repeat(70) + '\n');

  // 1. 백업 생성
  console.log('📦 Step 1: 기존 데이터 백업 생성\n');

  const limits = await prisma.$queryRaw<any[]>`
    SELECT * FROM service_reservation_limits
  `;

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const backupFile = path.join(backupDir, `service_limits_backup_${timestamp}.json`);

  fs.writeFileSync(backupFile, JSON.stringify(limits, null, 2));
  console.log(`  ✅ 백업 생성 완료: ${backupFile}`);
  console.log(`  📊 백업 데이터: ${limits.length}건\n`);

  // 2. serviceId 컬럼이 이미 존재하는지 확인
  console.log('🔍 Step 2: 스키마 확인\n');

  const schema = await prisma.$queryRaw<any[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'service_reservation_limits'
      AND column_name = 'serviceId'
  `;

  if (schema.length === 0) {
    console.log('  ⚠️  serviceId 컬럼이 아직 없습니다.');
    console.log('  먼저 Prisma 마이그레이션을 실행해주세요:\n');
    console.log('  npx prisma migrate dev --name add_service_id_column\n');
    console.log('  마이그레이션 후 이 스크립트를 다시 실행하세요.\n');
    return;
  }

  console.log('  ✅ serviceId 컬럼 존재 확인\n');

  // 3. 데이터 마이그레이션
  console.log('🔄 Step 3: 데이터 변환 시작\n');

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ id: string; serviceType: string; error: string }> = [];

  for (const limit of limits) {
    const serviceType = limit.serviceType;
    const serviceCode = SERVICE_TYPE_TO_CODE_MAP[serviceType];

    if (!serviceCode) {
      console.error(`  ❌ [${limit.id}] 매핑 없음: ${serviceType}`);
      errors.push({
        id: limit.id,
        serviceType,
        error: 'No mapping found'
      });
      errorCount++;
      continue;
    }

    try {
      // services 테이블에서 serviceId 조회
      const service = await prisma.services.findUnique({
        where: { code: serviceCode }
      });

      if (!service) {
        console.error(`  ❌ [${limit.id}] 서비스 없음: ${serviceCode}`);
        errors.push({
          id: limit.id,
          serviceType,
          error: `Service not found: ${serviceCode}`
        });
        errorCount++;
        continue;
      }

      // serviceId 업데이트
      await prisma.$executeRaw`
        UPDATE service_reservation_limits
        SET "serviceId" = ${service.id}::text,
            "updatedBy" = 'system',
            "reason" = '기존 데이터 마이그레이션'
        WHERE id = ${limit.id}
      `;

      console.log(`  ✅ [${limit.id}] ${serviceType} → ${service.name} (${service.id.substring(0, 8)}...)`);
      successCount++;
    } catch (error: any) {
      console.error(`  ❌ [${limit.id}] 업데이트 실패: ${error.message}`);
      errors.push({
        id: limit.id,
        serviceType,
        error: error.message
      });
      errorCount++;
    }
  }

  console.log();

  // 4. 결과 요약
  console.log('='.repeat(70));
  console.log('📊 마이그레이션 결과');
  console.log('='.repeat(70) + '\n');

  console.log(`  ✅ 성공: ${successCount}건`);
  console.log(`  ❌ 실패: ${errorCount}건`);
  console.log(`  📦 총: ${limits.length}건\n`);

  if (errors.length > 0) {
    console.log('❌ 에러 상세:\n');
    errors.forEach(err => {
      console.log(`  - [${err.id}] ${err.serviceType}: ${err.error}`);
    });
    console.log();
  }

  // 5. 검증
  if (successCount > 0) {
    console.log('='.repeat(70));
    console.log('✅ Step 4: 데이터 검증');
    console.log('='.repeat(70) + '\n');

    const updatedLimits = await prisma.$queryRaw<any[]>`
      SELECT srl.*, s.code, s.name
      FROM service_reservation_limits srl
      JOIN services s ON s.id::text = srl."serviceId"
      WHERE srl."serviceId" IS NOT NULL
    `;

    console.log(`  ✅ 검증 완료: ${updatedLimits.length}건의 데이터가 정상적으로 연결됨\n`);

    updatedLimits.forEach(limit => {
      console.log(`  - ${limit.name} (${limit.code}): ${limit.dailyLimit}건/일`);
    });
    console.log();
  }

  // 6. 다음 단계 안내
  console.log('='.repeat(70));
  console.log('📋 다음 단계');
  console.log('='.repeat(70) + '\n');

  if (errorCount === 0 && successCount === limits.length) {
    console.log('  ✅ 모든 데이터 마이그레이션 완료!\n');
    console.log('  다음 작업:');
    console.log('  1. Prisma 스키마에서 serviceType 컬럼 제거');
    console.log('  2. serviceId를 required로 변경');
    console.log('  3. 마이그레이션 실행:');
    console.log('     npx prisma migrate dev --name remove_service_type_column\n');
  } else if (errorCount > 0) {
    console.log('  ⚠️  일부 데이터 마이그레이션 실패\n');
    console.log('  필요한 작업:');
    console.log('  1. 에러 확인 및 수정');
    console.log('  2. 스크립트 재실행');
    console.log('  3. 모든 데이터 마이그레이션 후 Prisma 스키마 수정\n');
  }

  console.log('  💾 백업 파일: ' + backupFile);
  console.log('     (문제 발생 시 이 파일로 복구 가능)\n');
}

main()
  .catch((error) => {
    console.error('\n❌ 마이그레이션 실패:\n');
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
