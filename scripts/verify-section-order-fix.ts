import { getSectionInfo } from '../lib/static-pages/section-label-mapper';
import * as fs from 'fs';
import * as path from 'path';

// 시술 페이지 목록
const TREATMENT_PAGES = [
  'acne', 'botox', 'diet', 'filler', 'hair-removal', 'jeomin',
  'lifting', 'milia', 'mole', 'peeling', 'skinbooster', 'tattoo'
];

interface SectionInfo {
  sectionName: string;
  lineNumber: number;
  order: number;
  displayName: string;
}

// HTML에서 섹션 추출
function extractSections(filePath: string): SectionInfo[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const sections: SectionInfo[] = [];

  lines.forEach((line, index) => {
    const match = line.match(/data-section="([^"]+)"/);
    if (match) {
      const sectionName = match[1];
      const sectionInfo = getSectionInfo(sectionName);
      sections.push({
        sectionName,
        lineNumber: index + 1,
        order: sectionInfo.order,
        displayName: sectionInfo.displayName
      });
    }
  });

  return sections;
}

// 검증 함수
function verifySectionOrder() {
  console.log('\n✅ 섹션 순서 수정 검증\n');
  console.log('='.repeat(80));

  let totalPages = 0;
  let correctPages = 0;
  const issues: string[] = [];

  TREATMENT_PAGES.forEach((slug) => {
    const htmlPath = path.join(process.cwd(), 'public', 'static-pages', `${slug}.html`);

    if (!fs.existsSync(htmlPath)) {
      return;
    }

    totalPages++;
    const sections = extractSections(htmlPath);

    console.log(`\n📄 ${slug.toUpperCase()}`);

    // HTML 순서 확인
    const htmlOrder = sections.map((s, idx) => ({ ...s, htmlPosition: idx + 1 }));

    // order 값으로 정렬된 순서 확인
    const sortedByOrder = [...sections].sort((a, b) => a.order - b.order);

    // 순서 비교
    const isCorrect = sections.every((section, idx) => {
      return section.order === sortedByOrder[idx].order;
    });

    if (isCorrect) {
      console.log('  ✅ 섹션 순서가 올바릅니다');
      correctPages++;
    } else {
      console.log('  ❌ 섹션 순서가 올바르지 않습니다');
      issues.push(slug);
    }

    // 상세 정보 출력
    sections.forEach((section, idx) => {
      const expectedPosition = sortedByOrder.findIndex(s => s.sectionName === section.sectionName) + 1;
      const match = (idx + 1) === expectedPosition ? '✅' : '❌';
      console.log(`    ${idx + 1}. ${section.sectionName.padEnd(12)} (order=${section.order.toString().padStart(2)}) ${section.displayName} ${match}`);
    });
  });

  // 최종 결과
  console.log('\n\n📊 검증 결과\n');
  console.log('='.repeat(80));
  console.log(`총 페이지: ${totalPages}개`);
  console.log(`올바른 페이지: ${correctPages}개`);
  console.log(`문제 있는 페이지: ${totalPages - correctPages}개`);

  if (issues.length > 0) {
    console.log('\n⚠️  문제가 있는 페이지:');
    issues.forEach(slug => console.log(`  - ${slug}`));
  } else {
    console.log('\n✅ 모든 페이지의 섹션 순서가 올바릅니다!');
  }

  // order 값 확인
  console.log('\n\n📋 현재 order 값 설정\n');
  console.log('='.repeat(80));

  const allSectionNames = new Set<string>();
  TREATMENT_PAGES.forEach((slug) => {
    const htmlPath = path.join(process.cwd(), 'public', 'static-pages', `${slug}.html`);
    if (fs.existsSync(htmlPath)) {
      const sections = extractSections(htmlPath);
      sections.forEach(s => allSectionNames.add(s.sectionName));
    }
  });

  Array.from(allSectionNames)
    .map(name => ({ name, info: getSectionInfo(name) }))
    .sort((a, b) => a.info.order - b.info.order)
    .forEach(({ name, info }) => {
      console.log(`${name.padEnd(15)} → order: ${info.order.toString().padStart(2)} (${info.displayName})`);
    });
}

verifySectionOrder();
