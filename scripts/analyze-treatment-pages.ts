import * as fs from 'fs';
import * as path from 'path';

// 시술 페이지 목록 (12개)
const TREATMENT_PAGES = [
  'acne',
  'botox',
  'diet',
  'filler',
  'hair-removal',
  'jeomin',
  'lifting',
  'milia',
  'mole',
  'peeling',
  'skinbooster',
  'tattoo'
];

interface SectionOccurrence {
  sectionName: string;
  lineNumber: number;
  context: string;
}

// HTML 파일에서 섹션 추출
function extractSectionsFromHTML(filePath: string): SectionOccurrence[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const sections: SectionOccurrence[] = [];

  lines.forEach((line, index) => {
    const match = line.match(/data-section="([^"]+)"/);
    if (match) {
      sections.push({
        sectionName: match[1],
        lineNumber: index + 1,
        context: line.trim().substring(0, 80)
      });
    }
  });

  return sections;
}

// 모든 시술 페이지 분석
function analyzeAllTreatmentPages() {
  console.log('\n📊 시술 페이지 섹션 순서 분석 (12개 페이지)\n');
  console.log('='.repeat(80));

  const allSections = new Map<string, number[]>();
  const sectionOrderByPage = new Map<string, string[]>();

  TREATMENT_PAGES.forEach((slug) => {
    const htmlPath = path.join(process.cwd(), 'public', 'static-pages', `${slug}.html`);

    if (!fs.existsSync(htmlPath)) {
      console.log(`\n❌ ${slug}: HTML 파일을 찾을 수 없습니다`);
      return;
    }

    const sections = extractSectionsFromHTML(htmlPath);
    console.log(`\n📄 ${slug.toUpperCase()} (${sections.length}개 섹션)`);

    const sectionNames: string[] = [];
    sections.forEach((section, idx) => {
      console.log(`  ${idx + 1}. ${section.sectionName} (line ${section.lineNumber})`);
      sectionNames.push(section.sectionName);

      // 섹션별 순서 통계
      if (!allSections.has(section.sectionName)) {
        allSections.set(section.sectionName, []);
      }
      allSections.get(section.sectionName)!.push(idx + 1);
    });

    sectionOrderByPage.set(slug, sectionNames);
  });

  // 섹션 순서 통계 분석
  console.log('\n\n📈 섹션 순서 통계 분석\n');
  console.log('='.repeat(80));

  const sectionStats = Array.from(allSections.entries()).map(([sectionName, positions]) => {
    const avgPosition = positions.reduce((a, b) => a + b, 0) / positions.length;
    const minPosition = Math.min(...positions);
    const maxPosition = Math.max(...positions);

    return {
      sectionName,
      occurrences: positions.length,
      avgPosition: avgPosition.toFixed(1),
      minPosition,
      maxPosition,
      positions
    };
  });

  // 평균 위치로 정렬
  sectionStats.sort((a, b) => parseFloat(a.avgPosition) - parseFloat(b.avgPosition));

  console.log('\n섹션별 평균 출현 순서:');
  sectionStats.forEach((stat) => {
    console.log(`\n${stat.sectionName}:`);
    console.log(`  - 출현 횟수: ${stat.occurrences}/${TREATMENT_PAGES.length}개 페이지`);
    console.log(`  - 평균 위치: ${stat.avgPosition}번째`);
    console.log(`  - 범위: ${stat.minPosition}~${stat.maxPosition}번째`);
    console.log(`  - 실제 위치: [${stat.positions.join(', ')}]`);
  });

  // 권장 order 값 제안
  console.log('\n\n💡 권장 order 값 제안\n');
  console.log('='.repeat(80));

  sectionStats.forEach((stat, idx) => {
    const recommendedOrder = (idx + 1) * 10; // 10, 20, 30... 으로 여유 공간 확보
    console.log(`${stat.sectionName.padEnd(15)} → order: ${recommendedOrder.toString().padStart(2)} (평균 ${stat.avgPosition}번째)`);
  });

  // 공통 패턴 분석
  console.log('\n\n🔍 공통 패턴 분석\n');
  console.log('='.repeat(80));

  const patternCounts = new Map<string, number>();
  sectionOrderByPage.forEach((order) => {
    const pattern = order.join(' → ');
    patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
  });

  const sortedPatterns = Array.from(patternCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  console.log('\n가장 흔한 섹션 패턴:');
  sortedPatterns.forEach(([pattern, count]) => {
    console.log(`\n패턴 (${count}/${TREATMENT_PAGES.length}개 페이지):`);
    console.log(`  ${pattern}`);
  });
}

analyzeAllTreatmentPages();
