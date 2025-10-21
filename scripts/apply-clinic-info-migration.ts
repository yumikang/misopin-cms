import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Applying clinic_info migration...\n');

  try {
    // Read migration SQL
    const migrationPath = join(
      process.cwd(),
      'prisma/migrations/20250114_add_clinic_info_model/migration.sql'
    );
    const sql = readFileSync(migrationPath, 'utf-8');

    // Check if table already exists
    const tableCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'clinic_info'
      )`
    );

    if (tableCheck[0].exists) {
      console.log('⚠️  Table clinic_info already exists. Skipping migration.');
      return;
    }

    // Execute migration SQL (split by semicolon and execute separately)
    console.log('📝 Creating clinic_info table...');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log(`   Executing: ${statement.substring(0, 50)}...`);
      await prisma.$executeRawUnsafe(statement);
    }

    console.log('✅ Migration applied successfully!\n');

    // Verify table creation
    const verify = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'clinic_info'
      )`
    );

    if (verify[0].exists) {
      console.log('✓ Table clinic_info created');

      // Check columns
      const columns = await prisma.$queryRawUnsafe<
        Array<{ column_name: string; data_type: string; is_nullable: string }>
      >(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public'
         AND table_name = 'clinic_info'
         ORDER BY ordinal_position`
      );

      console.log(`✓ Total columns: ${columns.length}`);
      console.log('\n📋 Column Details:');
      columns.forEach((col) => {
        const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
        console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}`);
      });

      // Check index
      const indexes = await prisma.$queryRawUnsafe<
        Array<{ indexname: string; indexdef: string }>
      >(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE tablename = 'clinic_info'
         AND schemaname = 'public'`
      );

      console.log(`\n✓ Total indexes: ${indexes.length}`);
      indexes.forEach((idx) => {
        console.log(`   - ${idx.indexname}`);
      });

      console.log('\n🎉 Migration complete and verified!');
    } else {
      console.error('❌ Table creation failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
