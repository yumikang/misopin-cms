#!/usr/bin/env tsx
/**
 * SQL 마이그레이션 실행 스크립트
 *
 * prisma/migrations/20251106_add_service_id/migration.sql 내용을 실행합니다.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 SQL 마이그레이션 실행');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Add serviceId column
    console.log('1️⃣ serviceId 컬럼 추가 중...\n');

    await prisma.$executeRaw`
      ALTER TABLE "service_reservation_limits"
      ADD COLUMN IF NOT EXISTS "serviceId" TEXT
    `;
    console.log('  ✅ serviceId 컬럼 추가 완료\n');

    // Step 2: Add reason column
    console.log('2️⃣ reason 컬럼 추가 중...\n');

    await prisma.$executeRaw`
      ALTER TABLE "service_reservation_limits"
      ADD COLUMN IF NOT EXISTS "reason" TEXT
    `;
    console.log('  ✅ reason 컬럼 추가 완료\n');

    // Step 3: Add updatedBy column
    console.log('3️⃣ updatedBy 컬럼 추가 중...\n');

    await prisma.$executeRaw`
      ALTER TABLE "service_reservation_limits"
      ADD COLUMN IF NOT EXISTS "updatedBy" VARCHAR(255)
    `;
    console.log('  ✅ updatedBy 컬럼 추가 완료\n');

    // Step 4: Create index on serviceId
    console.log('4️⃣ serviceId 인덱스 생성 중...\n');

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "service_reservation_limits_serviceId_idx"
      ON "service_reservation_limits"("serviceId")
    `;
    console.log('  ✅ serviceId 인덱스 생성 완료\n');

    // Step 5: Create index on isActive
    console.log('5️⃣ isActive 인덱스 생성 중...\n');

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "service_reservation_limits_isActive_idx"
      ON "service_reservation_limits"("isActive")
    `;
    console.log('  ✅ isActive 인덱스 생성 완료\n');

    // Step 6: Verify columns
    console.log('6️⃣ 컬럼 추가 확인 중...\n');

    const schema = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'service_reservation_limits'
        AND column_name IN ('serviceId', 'reason', 'updatedBy')
      ORDER BY column_name
    `;

    if (schema.length === 3) {
      console.log('  ✅ 검증 성공: 모든 컬럼이 정상적으로 추가됨\n');
      schema.forEach(col => {
        console.log(`    - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULLABLE)' : '(NOT NULL)'}`);
      });
      console.log();
    } else {
      console.log('  ⚠️  일부 컬럼이 추가되지 않았을 수 있습니다.\n');
    }

    console.log('='.repeat(70));
    console.log('✅ SQL 마이그레이션 완료');
    console.log('='.repeat(70) + '\n');

    console.log('📋 다음 단계:');
    console.log('  npx tsx scripts/migrate-service-limits-data.ts\n');

  } catch (error: any) {
    console.error('\n❌ 마이그레이션 실패:\n');
    console.error(error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:\n');
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
