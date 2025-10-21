import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TableCheckResult {
  exists: boolean;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

interface IndexInfo {
  indexname: string;
  indexdef: string;
}

async function main() {
  console.log('🔍 Checking clinic_info table...\n');

  try {
    // Check if table exists
    const tableCheck = await prisma.$queryRawUnsafe<TableCheckResult[]>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'clinic_info'
      )`
    );

    console.log('Table exists:', tableCheck[0].exists);

    if (!tableCheck[0].exists) {
      console.log('❌ Table does not exist. Please run migration first.');
      return;
    }

    // Get columns
    const columns = await prisma.$queryRawUnsafe<ColumnInfo[]>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
       AND table_name = 'clinic_info'
       ORDER BY ordinal_position`
    );

    console.log(`\n✓ Total columns: ${columns.length}\n`);
    console.log('📋 Columns:');
    columns.forEach((col) => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
      console.log(`   ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}`);
    });

    // Get indexes
    const indexes = await prisma.$queryRawUnsafe<IndexInfo[]>(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE tablename = 'clinic_info'
       AND schemaname = 'public'`
    );

    console.log(`\n✓ Total indexes: ${indexes.length}\n`);
    console.log('🔑 Indexes:');
    indexes.forEach((idx) => {
      console.log(`   ${idx.indexname}`);
      console.log(`      ${idx.indexdef}`);
    });

    // Get row count
    const count = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM clinic_info`
    );

    console.log(`\n📊 Current rows: ${count[0].count}`);

    console.log('\n✅ Table check complete!');
  } catch (error) {
    console.error('❌ Error:', error);
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
