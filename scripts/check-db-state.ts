import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Database State Check ===\n');

  // Check services
  const servicesCount = await prisma.services.count();
  console.log(`Services count: ${servicesCount}`);

  if (servicesCount > 0) {
    const services = await prisma.services.findMany({
      select: { id: true, code: true, name: true }
    });
    console.log('Existing services:', JSON.stringify(services, null, 2));
  }

  // Check clinic_time_slots
  const slotsCount = await prisma.clinic_time_slots.count();
  console.log(`\nClinic time slots count: ${slotsCount}`);

  // Check reservations
  const totalReservations = await prisma.reservations.count();
  const withServiceId = await prisma.reservations.count({
    where: { serviceId: { not: null } }
  });
  const withoutServiceId = await prisma.reservations.count({
    where: { serviceId: null }
  });

  console.log(`\nTotal reservations: ${totalReservations}`);
  console.log(`  - With serviceId: ${withServiceId}`);
  console.log(`  - Without serviceId: ${withoutServiceId}`);

  if (withoutServiceId > 0) {
    const sample = await prisma.reservations.findFirst({
      where: { serviceId: null },
      select: {
        id: true,
        service: true,
        preferredTime: true,
        serviceId: true,
        timeSlotStart: true
      }
    });
    console.log('\nSample reservation without serviceId:', JSON.stringify(sample, null, 2));
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
