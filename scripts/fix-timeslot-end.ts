/**
 * Fix timeSlotEnd for existing reservations
 *
 * Root Cause: timeSlotEnd was calculated with durationMinutes only,
 * not including bufferMinutes. This caused overlap detection issues.
 *
 * Fix: Recalculate timeSlotEnd = timeSlotStart + durationMinutes + bufferMinutes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTimeSlotEnd() {
  try {
    console.log('🔍 Finding reservations with timeSlotStart...');

    // Get all reservations with timeSlotStart
    const reservations = await prisma.reservations.findMany({
      where: {
        timeSlotStart: {
          not: null
        },
        serviceId: {
          not: null
        }
      },
      include: {
        services: {
          select: {
            code: true,
            name: true,
            durationMinutes: true,
            bufferMinutes: true
          }
        }
      }
    });

    console.log(`📊 Found ${reservations.length} reservations to check`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const reservation of reservations) {
      if (!reservation.timeSlotStart || !reservation.services) {
        skippedCount++;
        continue;
      }

      const service = reservation.services;
      const [hours, minutes] = reservation.timeSlotStart.split(':').map(Number);

      // Calculate CORRECT timeSlotEnd (including bufferMinutes)
      const totalMinutes = hours * 60 + minutes + service.durationMinutes + service.bufferMinutes;
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = totalMinutes % 60;
      const correctTimeSlotEnd = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

      // Check if current timeSlotEnd is incorrect
      if (reservation.timeSlotEnd !== correctTimeSlotEnd) {
        console.log(`🔧 Fixing reservation ${reservation.id}:`);
        console.log(`   Service: ${service.name}`);
        console.log(`   Start: ${reservation.timeSlotStart}`);
        console.log(`   Duration: ${service.durationMinutes}min + Buffer: ${service.bufferMinutes}min`);
        console.log(`   Current End: ${reservation.timeSlotEnd}`);
        console.log(`   Correct End: ${correctTimeSlotEnd}`);

        await prisma.reservations.update({
          where: { id: reservation.id },
          data: { timeSlotEnd: correctTimeSlotEnd }
        });

        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`   Updated: ${updatedCount} reservations`);
    console.log(`   Skipped: ${skippedCount} reservations (already correct)`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixTimeSlotEnd();
