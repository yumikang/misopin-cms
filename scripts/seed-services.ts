import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding services and clinic time slots...');

  // Create services
  const services = [
    {
      id: randomUUID(),
      code: 'WRINKLE_BOTOX',
      name: '주름/보톡스',
      durationMinutes: 30,
      bufferMinutes: 10,
      description: '주름 개선 및 보톡스 시술',
      category: 'FACIAL',
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      code: 'VOLUME_LIFTING',
      name: '볼륨/리프팅',
      durationMinutes: 40,
      bufferMinutes: 10,
      description: '볼륨 충전 및 리프팅 시술',
      category: 'FACIAL',
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      code: 'SKIN_CARE',
      name: '피부케어',
      durationMinutes: 50,
      bufferMinutes: 10,
      description: '피부 관리 및 케어 시술',
      category: 'SKIN',
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      code: 'REMOVAL_PROCEDURE',
      name: '제거시술',
      durationMinutes: 30,
      bufferMinutes: 10,
      description: '점, 사마귀 등 제거 시술',
      category: 'REMOVAL',
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      code: 'BODY_CARE',
      name: '바디케어',
      durationMinutes: 60,
      bufferMinutes: 10,
      description: '바디 관리 및 케어 시술',
      category: 'BODY',
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      code: 'OTHER_CONSULTATION',
      name: '기타 상담',
      durationMinutes: 20,
      bufferMinutes: 10,
      description: '기타 상담 및 문의',
      category: 'CONSULTATION',
      updatedAt: new Date()
    }
  ];

  for (const service of services) {
    await prisma.services.upsert({
      where: { code: service.code },
      update: service,
      create: service
    });
    console.log(`✅ Created/Updated service: ${service.name}`);
  }

  // Create clinic time slots (Monday to Friday)
  const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

  for (const day of weekdays) {
    // Morning slot
    const morningExists = await prisma.clinic_time_slots.findFirst({
      where: {
        dayOfWeek: day as any,
        period: 'MORNING',
        serviceId: null
      }
    });

    if (!morningExists) {
      await prisma.clinic_time_slots.create({
        data: {
          id: randomUUID(),
          dayOfWeek: day as any,
          period: 'MORNING',
          startTime: '09:00',
          endTime: '12:00',
          updatedAt: new Date()
        }
      });
    }

    // Afternoon slot
    const afternoonExists = await prisma.clinic_time_slots.findFirst({
      where: {
        dayOfWeek: day as any,
        period: 'AFTERNOON',
        serviceId: null
      }
    });

    if (!afternoonExists) {
      await prisma.clinic_time_slots.create({
        data: {
          id: randomUUID(),
          dayOfWeek: day as any,
          period: 'AFTERNOON',
          startTime: '14:00',
          endTime: '18:00',
          updatedAt: new Date()
        }
      });
    }

    console.log(`✅ Created clinic time slots for ${day}`);
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
