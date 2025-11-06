/**
 * Update Clinic Hours Script
 *
 * Updates clinic_time_slots to match actual clinic schedule:
 * - Monday/Tuesday/Thursday/Friday: 08:30 ~ 19:30
 * - Wednesday: 08:30 ~ 12:00
 * - Saturday: 09:00 ~ 14:00
 * - Sunday: Closed
 */

import { PrismaClient, DayOfWeek, Period } from '@prisma/client';

const prisma = new PrismaClient();

interface TimeSlotConfig {
  dayOfWeek: DayOfWeek;
  period: Period;
  startTime: string;
  endTime: string;
}

const CLINIC_HOURS: TimeSlotConfig[] = [
  // Monday - Full day
  { dayOfWeek: 'MONDAY', period: 'MORNING', startTime: '08:30', endTime: '12:00' },
  { dayOfWeek: 'MONDAY', period: 'AFTERNOON', startTime: '13:00', endTime: '19:30' },

  // Tuesday - Full day
  { dayOfWeek: 'TUESDAY', period: 'MORNING', startTime: '08:30', endTime: '12:00' },
  { dayOfWeek: 'TUESDAY', period: 'AFTERNOON', startTime: '13:00', endTime: '19:30' },

  // Wednesday - Morning only
  { dayOfWeek: 'WEDNESDAY', period: 'MORNING', startTime: '08:30', endTime: '12:00' },

  // Thursday - Full day
  { dayOfWeek: 'THURSDAY', period: 'MORNING', startTime: '08:30', endTime: '12:00' },
  { dayOfWeek: 'THURSDAY', period: 'AFTERNOON', startTime: '13:00', endTime: '19:30' },

  // Friday - Full day
  { dayOfWeek: 'FRIDAY', period: 'MORNING', startTime: '08:30', endTime: '12:00' },
  { dayOfWeek: 'FRIDAY', period: 'AFTERNOON', startTime: '13:00', endTime: '19:30' },

  // Saturday - Short day
  { dayOfWeek: 'SATURDAY', period: 'MORNING', startTime: '09:00', endTime: '14:00' },
];

async function main() {
  console.log('🏥 Updating clinic hours to match actual schedule...\n');

  // 1. Delete all existing clinic time slots
  console.log('📝 Step 1: Deleting existing clinic time slots...');
  const deleteResult = await prisma.clinic_time_slots.deleteMany({});
  console.log(`   ✅ Deleted ${deleteResult.count} existing slots\n`);

  // 2. Create new time slots based on actual schedule
  console.log('📝 Step 2: Creating new time slots...');

  for (const slot of CLINIC_HOURS) {
    const id = `${slot.dayOfWeek}_${slot.period}`;

    await prisma.clinic_time_slots.create({
      data: {
        id,
        serviceId: null, // null = applies to all services
        dayOfWeek: slot.dayOfWeek,
        period: slot.period,
        startTime: slot.startTime,
        endTime: slot.endTime,
        slotInterval: 30, // 30-minute intervals
        maxConcurrent: 3, // 3 concurrent appointments per slot
        isActive: true,
        updatedAt: new Date()
      }
    });

    console.log(`   ✅ Created: ${slot.dayOfWeek} ${slot.period} (${slot.startTime} ~ ${slot.endTime})`);
  }

  console.log('\n📝 Step 3: Verifying created slots...');
  const allSlots = await prisma.clinic_time_slots.findMany({
    orderBy: [
      { dayOfWeek: 'asc' },
      { period: 'asc' }
    ]
  });

  console.log('\n📅 Final Clinic Schedule:');
  console.log('========================\n');

  const dayOrder: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  for (const day of dayOrder) {
    const daySlots = allSlots.filter(s => s.dayOfWeek === day);

    if (daySlots.length === 0) {
      console.log(`${day}: CLOSED`);
    } else {
      console.log(`${day}:`);
      daySlots.forEach(slot => {
        console.log(`  ${slot.period}: ${slot.startTime} ~ ${slot.endTime}`);
      });
    }
  }

  console.log('\n✅ Clinic hours updated successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error updating clinic hours:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
