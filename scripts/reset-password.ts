import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🔐 Password Reset Tool\n');

  const email = await question('이메일 주소를 입력하세요: ');

  const user = await prisma.users.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true }
  });

  if (!user) {
    console.log(`❌ 사용자를 찾을 수 없습니다: ${email}`);
    rl.close();
    process.exit(1);
  }

  console.log(`\n✅ 사용자 정보:`);
  console.log(`   이름: ${user.name}`);
  console.log(`   역할: ${user.role}`);
  console.log(`   이메일: ${user.email}\n`);

  const newPassword = await question('새 비밀번호를 입력하세요: ');

  if (newPassword.length < 8) {
    console.log('❌ 비밀번호는 최소 8자 이상이어야 합니다.');
    rl.close();
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.users.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });

  console.log(`\n✅ 비밀번호가 재설정되었습니다!`);
  console.log(`   이메일: ${user.email}`);
  console.log(`   새 비밀번호: ${newPassword}\n`);

  rl.close();
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
