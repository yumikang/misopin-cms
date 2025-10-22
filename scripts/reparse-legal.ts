import { PrismaClient } from '@prisma/client';
import { HTMLParser } from '../lib/static-pages/html-parser';
import { sectionsToJson } from '../lib/static-pages/types';

const prisma = new PrismaClient();

// 정적 사이트 경로 (실제 HTML이 있는 프로덕션 서버)
const STATIC_SITE_PATH = '/var/www/misopin.com';

async function main() {
  console.log('법률 문서 재파싱 시작...\n');

  const slugs = ['privacy', 'stipulation'];
  const parser = new HTMLParser(STATIC_SITE_PATH);

  for (const slug of slugs) {
    console.log(`\n========== ${slug} 파싱 중 ==========`);

    const page = await prisma.static_pages.findUnique({
      where: { slug }
    });

    if (!page) {
      console.log(`❌ ${slug} 페이지를 찾을 수 없습니다.`);
      continue;
    }

    try {
      // HTML 파일명 (예: privacy.html)
      const htmlFile = `${slug}.html`;
      const result = await parser.parseHTML(htmlFile);

      if (!result.success) {
        console.error(`❌ 파싱 실패: ${result.error}`);
        continue;
      }

      await prisma.static_pages.update({
        where: { slug },
        data: { sections: sectionsToJson(result.sections) }
      });

      console.log(`✅ ${page.title}`);
      console.log(`   섹션 개수: ${result.sections.length}`);
      console.log(`   섹션 목록:`);
      result.sections.forEach((section, idx) => {
        console.log(`   ${idx + 1}. ${section.label}`);
      });
    } catch (error) {
      console.error(`❌ ${slug} 파싱 실패:`, error);
    }
  }

  console.log('\n\n재파싱 완료!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
