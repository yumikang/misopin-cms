import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Creating clinic_info table directly...\n');

  try {
    // Drop table if exists (for clean slate)
    console.log('🗑️  Dropping existing table if exists...');
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "clinic_info" CASCADE`);

    // Create table
    console.log('📝 Creating clinic_info table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "clinic_info" (
        "id" TEXT NOT NULL,
        "phonePrimary" TEXT NOT NULL,
        "phoneSecondary" TEXT,
        "addressFull" TEXT NOT NULL,
        "addressFloor" TEXT,
        "hoursWeekday" TEXT NOT NULL,
        "hoursSaturday" TEXT NOT NULL,
        "hoursSunday" TEXT NOT NULL,
        "hoursLunch" TEXT,
        "hoursSpecialNote" TEXT,
        "snsInstagram" TEXT,
        "snsKakao" TEXT,
        "snsNaverBlog" TEXT,
        "snsFacebook" TEXT,
        "snsYoutube" TEXT,
        "businessRegistration" TEXT NOT NULL,
        "representativeName" TEXT NOT NULL,
        "medicalLicense" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "version" INTEGER NOT NULL DEFAULT 1,
        "lastUpdatedBy" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "clinic_info_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('✅ Table created');

    // Create index
    console.log('🔑 Creating index on isActive...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX "clinic_info_isActive_idx" ON "clinic_info"("isActive")
    `);
    console.log('✅ Index created');

    // Verify
    console.log('\n🔍 Verifying table creation...');
    const verify = await prisma.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'clinic_info'
      )`
    );

    if (verify[0].exists) {
      console.log('✅ Table verified!\n');

      // Get column count
      const columns = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) as count
         FROM information_schema.columns
         WHERE table_name = 'clinic_info'`
      );

      console.log(`📊 Total columns: ${columns[0].count}`);
      console.log('🎉 Migration complete!');
    } else {
      console.error('❌ Table creation failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
