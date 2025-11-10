#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMigration() {
  console.log('🔧 Fixing migration issues...\n');

  // Fix 1: Add missing WEDNESDAY AFTERNOON slot
  console.log('1. Adding missing WEDNESDAY AFTERNOON slot...');
  await prisma.clinic_time_slots.upsert({
    where: { id: 'slot_weekday_afternoon_wed' },
    create: {
      id: 'slot_weekday_afternoon_wed',
      serviceId: null,
      dayOfWeek: 'WEDNESDAY',
      period: 'AFTERNOON',
      startTime: '13:00',
      endTime: '18:30',
      slotInterval: 30,
      maxConcurrent: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    update: {
      startTime: '13:00',
      endTime: '18:30',
      isActive: true,
      updatedAt: new Date()
    }
  });
  console.log('   ✅ WEDNESDAY AFTERNOON slot added\n');

  // Fix 2: Update missing reservation serviceId
  console.log('2. Updating reservation with missing serviceId...');
  const service = await prisma.services.findUnique({
    where: { code: 'VOLUME_LIFTING' }
  });

  if (service) {
    const updated = await prisma.reservations.updateMany({
      where: {
        id: '940e5b82-dcbf-4f47-875c-d7966aa4bae5',
        serviceId: null
      },
      data: {
        serviceId: service.id,
        serviceName: service.name,
        estimatedDuration: service.durationMinutes,
        period: 'AFTERNOON', // 16:00 is afternoon
        timeSlotStart: '16:00',
        timeSlotEnd: `${16 + Math.floor((service.durationMinutes) / 60)}:${String((service.durationMinutes) % 60).padStart(2, '0')}`,
        updatedAt: new Date()
      }
    });
    console.log(`   ✅ Updated ${updated.count} reservation(s)\n`);
  }

  // Verify
  console.log('3. Verification:');
  const slotsCount = await prisma.clinic_time_slots.count({ where: { isActive: true } });
  console.log(`   ✅ Clinic Slots: ${slotsCount}/11`);

  const missingServiceId = await prisma.reservations.count({
    where: { serviceId: null, status: { in: ['PENDING', 'CONFIRMED'] } }
  });
  console.log(`   ✅ Missing serviceId: ${missingServiceId}/0`);

  console.log('\n🎉 Migration fixed successfully!');

  await prisma.$disconnect();
}

fixMigration();
