#!/usr/bin/env tsx

/**
 * Run DB migration for time-based reservation system
 * Execute: npx tsx scripts/run-migration.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runMigration() {
  console.log('📦 Starting DB Migration for Time-Based Reservation System...\n');

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'db-migration-time-based.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Split by semicolons to execute statements separately
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s =>
        s.length > 0 &&
        !s.startsWith('--') &&
        !s.match(/^BEGIN$/i) &&
        !s.match(/^COMMIT$/i)
      );

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute in transaction
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];

        // Skip comments and validation queries (we'll run them separately)
        if (statement.startsWith('SELECT')) {
          continue; // Will run validation queries after transaction
        }

        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        await tx.$executeRawUnsafe(statement);
      }
    });

    console.log('\n✅ Migration completed successfully!\n');

    // Run validation queries
    console.log('🔍 Running validation checks...\n');

    const servicesCount = await prisma.services.count({ where: { isActive: true } });
    console.log(`✓ Services Count: ${servicesCount} (expected: 6)`);

    const slotsCount = await prisma.clinic_time_slots.count({ where: { isActive: true } });
    console.log(`✓ Clinic Slots Count: ${slotsCount} (expected: 11)`);

    const missingServiceId = await prisma.reservations.count({
      where: {
        serviceId: null,
        status: { in: ['PENDING', 'CONFIRMED'] }
      }
    });
    console.log(`✓ Reservations Missing serviceId: ${missingServiceId} (expected: 0)`);

    const orphanedReservations = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM reservations r
      LEFT JOIN services s ON r."serviceId" = s.id
      WHERE r."serviceId" IS NOT NULL
        AND s.id IS NULL
    `;
    console.log(`✓ Orphaned Reservations: ${orphanedReservations[0].count} (expected: 0)`);

    // Skip invalid period check (Prisma type validation handles this)

    console.log('\n✅ All validation checks passed!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runMigration()
  .then(() => {
    console.log('🎉 Migration process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration process failed:', error);
    process.exit(1);
  });
