import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('📋 CMS에 등록된 정적 페이지 확인...\n');

    const pages = await prisma.static_pages.findMany({
      orderBy: { slug: 'asc' },
      select: {
        slug: true,
        title: true,
        filePath: true,
        _count: {
          select: { editable_elements: true }
        }
      }
    });

    console.log(`총 ${pages.length}개 페이지 등록됨:\n`);

    pages.forEach((page, idx) => {
      console.log(`${idx + 1}. ${page.slug}`);
      console.log(`   제목: ${page.title}`);
      console.log(`   파일: ${page.filePath}`);
      console.log(`   편집 가능 요소: ${page._count.editable_elements}개`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 에러:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
