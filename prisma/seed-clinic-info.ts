import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting clinic info seed...\n');

  // Check if data already exists
  const existing = await prisma.clinicInfo.findFirst({
    where: { isActive: true },
  });

  if (existing) {
    console.log('⚠️  Active clinic info already exists:');
    console.log(`   ID: ${existing.id}`);
    console.log(`   Phone: ${existing.phonePrimary}`);
    console.log(`   Updated: ${existing.updatedAt.toISOString()}`);
    console.log('\n💡 Skipping seed. Use update if you need to change values.\n');
    return;
  }

  // Create initial clinic info
  console.log('📝 Creating initial clinic information...');

  const clinicInfo = await prisma.clinicInfo.create({
    data: {
      // 연락처
      phonePrimary: '061-277-1001',
      phoneSecondary: null,

      // 주소
      addressFull: '전남 목포시 영산로 362 미소핀의원',
      addressFloor: '2층, 3층',

      // 운영시간
      hoursWeekday: '평일 08:30 ~ 19:30',
      hoursSaturday: '토요일 09:00 ~ 14:00',
      hoursSunday: '일요일, 공휴일 휴무',
      hoursLunch: '점심시간 12:00-14:00',
      hoursSpecialNote: '수요일 08:30 ~ 12:00',

      // SNS 링크
      snsInstagram: 'https://www.instagram.com/misopin_clinic/',
      snsKakao: 'http://pf.kakao.com/_xjxeLxj',
      snsNaverBlog: 'https://blog.naver.com/integrate725',
      snsFacebook: null,
      snsYoutube: null,

      // 사업자 정보
      businessRegistration: '123-56-789',
      representativeName: '김지식',
      medicalLicense: null,

      // 시스템 필드
      isActive: true,
      version: 1,
      lastUpdatedBy: null,
    },
  });

  console.log('✅ Clinic info created!\n');
  console.log('📋 Details:');
  console.log(`   ID: ${clinicInfo.id}`);
  console.log(`   전화: ${clinicInfo.phonePrimary}`);
  console.log(`   주소: ${clinicInfo.addressFull} ${clinicInfo.addressFloor}`);
  console.log(`   평일: ${clinicInfo.hoursWeekday}`);
  console.log(`   토요일: ${clinicInfo.hoursSaturday}`);
  console.log(`   Instagram: ${clinicInfo.snsInstagram}`);
  console.log(`   Kakao: ${clinicInfo.snsKakao}`);
  console.log(`   사업자: ${clinicInfo.businessRegistration}`);
  console.log(`   대표자: ${clinicInfo.representativeName}`);
  console.log(`   버전: ${clinicInfo.version}`);
  console.log(`   생성일: ${clinicInfo.createdAt.toISOString()}`);

  console.log('\n✨ Clinic info seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding clinic info:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
