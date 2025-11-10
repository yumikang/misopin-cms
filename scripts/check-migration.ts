#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('\n=== Services ===');
  const services = await prisma.services.findMany({ orderBy: { displayOrder: 'asc' } });
  services.forEach(s => console.log(`${s.code}: ${s.name} (${s.durationMinutes}min + ${s.bufferMinutes}min)`));

  console.log('\n=== Clinic Time Slots ===');
  const slots = await prisma.clinic_time_slots.findMany({ orderBy: { dayOfWeek: 'asc' } });
  slots.forEach(s => console.log(`${s.dayOfWeek} ${s.period}: ${s.startTime}-${s.endTime}`));

  console.log('\n=== Reservations without serviceId ===');
  const missing = await prisma.reservations.findMany({
    where: { serviceId: null, status: { in: ['PENDING', 'CONFIRMED'] } },
    select: { id: true, service: true, preferredTime: true, preferredDate: true }
  });
  missing.forEach(r => console.log(`${r.id}: ${r.service} at ${r.preferredTime} on ${r.preferredDate}`));

  await prisma.$disconnect();
}

check();
