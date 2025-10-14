import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  console.log('🌱 Starting user seed...');

  // 모든 사용자에게 동일한 비밀번호 사용: Misopin123!
  const password = await bcrypt.hash('Misopin123!', SALT_ROUNDS);
  console.log('✅ Password hashed');

  const users = [
    {
      email: 'wonjang@misopin.com',
      name: '김지식',
      password,
      role: 'SUPER_ADMIN' as const,
      isActive: true,
    },
    {
      email: 'teamlead@misopin.com',
      name: '팀장님',
      password,
      role: 'ADMIN' as const,
      isActive: true,
    },
    {
      email: 'editor@misopin.com',
      name: '미소핀',
      password,
      role: 'EDITOR' as const,
      isActive: true,
    },
  ];

  console.log(`📝 Creating ${users.length} users...`);

  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
    console.log(`  ✓ ${created.name} (${created.email}) - ${created.role}`);
  }

  console.log('\n✨ User seed completed!');
  console.log('\n📋 Seeded Users:');
  console.log('1. 김지식 (wonjang@misopin.com) - SUPER_ADMIN - Password: Misopin123!');
  console.log('2. 팀장님 (teamlead@misopin.com) - ADMIN - Password: Misopin123!');
  console.log('3. 미소핀 (editor@misopin.com) - EDITOR - Password: Misopin123!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
