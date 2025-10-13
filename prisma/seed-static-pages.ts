import { PrismaClient, Prisma } from '@prisma/client';
import { HTMLParser } from '../lib/static-pages/html-parser';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// 실제 서버의 HTML 파일 목록
const PRIORITY_PAGES = [
  {
    slug: 'index',
    title: '메인 페이지',
    filePath: 'index.html',
  },
  {
    slug: 'about',
    title: '병원 소개',
    filePath: 'about.html',
  },
  {
    slug: 'directions',
    title: '오시는 길',
    filePath: 'directions.html',
  },
  {
    slug: 'fee-schedule',
    title: '진료 비용',
    filePath: 'fee-schedule.html',
  },
  {
    slug: 'privacy',
    title: '개인정보 처리방침',
    filePath: 'privacy.html',
  },
  {
    slug: 'stipulation',
    title: '이용약관',
    filePath: 'stipulation.html',
  },
  {
    slug: 'board-event',
    title: '이벤트 게시판',
    filePath: 'board-event.html',
  },
  {
    slug: 'board-notice',
    title: '공지사항 게시판',
    filePath: 'board-notice.html',
  },
  {
    slug: 'board-page',
    title: '일반 게시판',
    filePath: 'board-page.html',
  },
  {
    slug: 'board-detail',
    title: '게시판 상세',
    filePath: 'board-detail.html',
  },
  {
    slug: 'calendar-page',
    title: '달력 페이지',
    filePath: 'calendar-page.html',
  },
  {
    slug: 'quickmenu',
    title: '퀵 메뉴',
    filePath: 'quickmenu.html',
  },
  {
    slug: 'auto-clear-popups',
    title: '팝업 자동 닫기',
    filePath: 'auto-clear-popups.html',
  },
];

const STATIC_SITE_PATH = process.env.STATIC_PAGES_DIR || path.join(process.cwd(), '../Misopin-renew');

async function main() {
  console.log('🌱 정적 페이지 시딩 시작...\n');

  const htmlParser = new HTMLParser(STATIC_SITE_PATH);
  let successCount = 0;
  let failCount = 0;

  for (const pageInfo of PRIORITY_PAGES) {
    try {
      console.log(`📄 처리 중: ${pageInfo.title} (${pageInfo.filePath})`);

      // 1. 파일 존재 확인
      const fullPath = path.join(STATIC_SITE_PATH, pageInfo.filePath);
      if (!fs.existsSync(fullPath)) {
        console.error(`   ❌ 파일을 찾을 수 없습니다: ${fullPath}`);
        failCount++;
        continue;
      }

      // 2. HTML 파싱
      const parseResult = await htmlParser.parseHTML(pageInfo.filePath);

      if (!parseResult.success) {
        console.error(`   ❌ 파싱 실패: ${parseResult.error}`);
        failCount++;
        continue;
      }

      console.log(`   ✅ ${parseResult.sections.length}개 섹션 파싱 완료`);

      // 3. 기존 페이지 확인
      const existingPage = await prisma.staticPage.findUnique({
        where: { slug: pageInfo.slug },
      });

      if (existingPage) {
        console.log(`   ⚠️  이미 존재하는 페이지 (건너뜀)`);
        continue;
      }

      // 4. 페이지 생성
      const page = await prisma.staticPage.create({
        data: {
          slug: pageInfo.slug,
          title: pageInfo.title,
          filePath: pageInfo.filePath,
          sections: parseResult.sections as unknown as Prisma.InputJsonValue,
          isPublished: false,
        },
      });

      // 5. 초기 버전 생성
      await prisma.staticPageVersion.create({
        data: {
          pageId: page.id,
          version: 1,
          sections: parseResult.sections as unknown as Prisma.InputJsonValue,
          changedBy: 'system',
          changeNote: '초기 시딩',
        },
      });

      console.log(`   ✅ 페이지 생성 완료 (ID: ${page.id})`);
      console.log(`   📊 섹션 정보:`);
      console.log(`      - 텍스트: ${parseResult.sections.filter(s => s.type === 'text').length}개`);
      console.log(`      - 이미지: ${parseResult.sections.filter(s => s.type === 'image').length}개`);
      console.log(`      - 배경: ${parseResult.sections.filter(s => s.type === 'background').length}개\n`);

      successCount++;
    } catch (error) {
      console.error(`   ❌ 오류 발생:`, error);
      failCount++;
    }
  }

  console.log('\n✨ 시딩 완료!');
  console.log(`   성공: ${successCount}개`);
  console.log(`   실패: ${failCount}개`);
  console.log(`   총계: ${PRIORITY_PAGES.length}개\n`);

  // 생성된 페이지 목록 출력
  const allPages = await prisma.staticPage.findMany({
    select: {
      slug: true,
      title: true,
      filePath: true,
      _count: {
        select: {
          versions: true,
        },
      },
    },
  });

  console.log('📋 현재 등록된 페이지:');
  allPages.forEach((page, index) => {
    console.log(`   ${index + 1}. ${page.title} (${page.slug})`);
    console.log(`      파일: ${page.filePath}`);
    console.log(`      버전: ${page._count.versions}개\n`);
  });
}

main()
  .catch((error) => {
    console.error('시딩 실패:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
