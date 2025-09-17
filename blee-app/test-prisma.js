// SSL 검증 비활성화 (테스트용)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testPrismaConnection() {
  try {
    console.log('Testing Prisma connection...');

    // Test basic connection
    await prisma.$connect();
    console.log('✅ Prisma connected successfully!');

    // Check if users table exists and has data
    const userCount = await prisma.user.count();
    console.log(`📊 Users in database: ${userCount}`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      });
      console.log('👥 Existing users:');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.role}) ${user.isActive ? '✅' : '❌'}`);
      });
    }

  } catch (error) {
    console.error('❌ Prisma connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaConnection();