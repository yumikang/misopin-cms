const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const closures = await prisma.manual_time_closures.findMany({
    where: { isActive: true },
    include: {
      service: {
        select: { code: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('\n=== 최근 생성된 수동 마감 데이터 ===\n');
  closures.forEach((c, idx) => {
    console.log(`${idx + 1}. 마감 ID: ${c.id}`);
    console.log(`   날짜: ${c.closureDate.toISOString().split('T')[0]}`);
    console.log(`   기간: ${c.period}`);
    console.log(`   시간: ${c.timeSlotStart}${c.timeSlotEnd ? ' - ' + c.timeSlotEnd : ''}`);
    console.log(`   서비스: ${c.service ? c.service.name + ' (' + c.service.code + ')' : '전체 서비스'}`);
    console.log(`   사유: ${c.reason || '없음'}`);
    console.log(`   등록자: ${c.createdBy}`);
    console.log(`   등록시간: ${c.createdAt.toLocaleString('ko-KR')}`);
    console.log('');
  });

  console.log('=== 데이터베이스 확인 완료 ===\n');
}

main().finally(() => prisma.$disconnect());
