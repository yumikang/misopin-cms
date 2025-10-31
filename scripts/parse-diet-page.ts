import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

interface ParsedSection {
  lineStart: number;
  lineEnd: number;
  sectionName: string | null;
  hasDataSection: boolean;
  description: string;
  editableElements: number;
  editableBgElements: number;
}

function parseDietPage() {
  const htmlPath = path.join(process.cwd(), 'public', 'static-pages', 'diet.html');

  if (!fs.existsSync(htmlPath)) {
    console.log('❌ diet.html 파일을 찾을 수 없습니다');
    return;
  }

  const content = fs.readFileSync(htmlPath, 'utf-8');
  const lines = content.split('\n');
  const $ = cheerio.load(content);

  console.log('\n📄 DIET 페이지 상세 파싱\n');
  console.log('='.repeat(80));

  // data-section 속성이 있는 모든 요소 찾기
  const sectionsWithAttr: ParsedSection[] = [];
  $('[data-section]').each((idx, element) => {
    const $el = $(element);
    const sectionName = $el.attr('data-section');
    const html = $.html(element);

    // 라인 번호 찾기
    let lineStart = 0;
    let lineEnd = 0;
    let currentLine = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`data-section="${sectionName}"`)) {
        lineStart = i + 1;

        // 끝 라인 찾기 (간단히 다음 data-section 전까지)
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('data-section=') && lines[j] !== lines[i]) {
            lineEnd = j;
            break;
          }
          if (lines[j].includes('</section>') || lines[j].includes('</div>')) {
            lineEnd = j + 1;
          }
        }
        break;
      }
    }

    // 편집 가능한 요소 수 세기
    const editableCount = $el.find('[data-editable]').length + ($el.attr('data-editable') ? 1 : 0);
    const editableBgCount = $el.find('[data-editable-bg]').length + ($el.attr('data-editable-bg') ? 1 : 0);

    // 설명 추출
    let description = '';
    const heading = $el.find('h2, h3').first().text().trim();
    if (heading) {
      description = heading;
    } else {
      description = $el.attr('class') || 'No description';
    }

    sectionsWithAttr.push({
      lineStart,
      lineEnd: lineEnd || lineStart + 50,
      sectionName: sectionName || null,
      hasDataSection: true,
      description,
      editableElements: editableCount,
      editableBgElements: editableBgCount,
    });
  });

  // 특별 섹션들 (data-section 없음)
  console.log('\n🔍 섹션별 분석:\n');

  sectionsWithAttr.forEach((section, idx) => {
    console.log(`\n${idx + 1}. data-section="${section.sectionName}" (line ${section.lineStart}-${section.lineEnd})`);
    console.log(`   설명: ${section.description}`);
    console.log(`   편집 가능 요소: ${section.editableElements}개`);
    console.log(`   편집 가능 배경: ${section.editableBgElements}개`);
    console.log(`   ✅ data-section 속성 있음`);
  });

  // data-section 없는 주요 섹션들 찾기
  console.log('\n\n⚠️  data-section 속성이 없는 주요 섹션들:\n');

  // 1. 시술 종류 지그재그 섹션
  const zigzagSectionStart = lines.findIndex(line => line.includes('시술 종류 소개 섹션'));
  const zigzagSectionEnd = lines.findIndex((line, idx) =>
    idx > zigzagSectionStart && line.includes('</section>') &&
    lines[idx - 1].includes('</div>')
  );

  if (zigzagSectionStart !== -1) {
    console.log(`\n❌ 시술 종류 지그재그 섹션 (line ${zigzagSectionStart + 1}-${zigzagSectionEnd + 1})`);
    console.log(`   클래스: diet-treatments-zigzag`);
    console.log(`   내용: 4개의 다이어트 시술 카드`);
    console.log(`   - 지방분해주사`);
    console.log(`   - 다이어트약`);
    console.log(`   - 다이어트 수액`);
    console.log(`   - 다이어트 주사`);
    console.log(`   문제: data-section 속성 없음 → 편집 시스템에서 인식 불가`);
  }

  // 2. 맞춤형 다이어트 프로그램 섹션
  const programSectionStart = lines.findIndex(line => line.includes('맞춤형 다이어트 프로그램'));
  const programSectionEnd = lines.findIndex((line, idx) =>
    idx > programSectionStart && line.includes('</section>')
  );

  if (programSectionStart !== -1) {
    console.log(`\n❌ 맞춤형 다이어트 프로그램 섹션 (line ${programSectionStart + 1}-${programSectionEnd + 1})`);
    console.log(`   클래스: treatment-section`);
    console.log(`   내용: 3단계 프로세스 설명`);
    console.log(`   - 01: 정밀 체성분 분석`);
    console.log(`   - 02: 맞춤 처방 계획`);
    console.log(`   - 03: 체계적 관리`);
    console.log(`   문제: data-section 속성 없음 → 편집 시스템에서 인식 불가`);
  }

  // 전체 통계
  console.log('\n\n📊 전체 통계:\n');
  console.log('='.repeat(80));
  console.log(`data-section 있는 섹션: ${sectionsWithAttr.length}개`);
  console.log(`data-section 없는 주요 섹션: 2개`);
  console.log(`\n전체 섹션 구조:`);
  console.log(`  1. hero (상단 배너) ✅`);
  console.log(`  2. intro (메인 소개) ✅`);
  console.log(`  3. 시술 종류 지그재그 ❌ - 섹션명 필요!`);
  console.log(`  4. 맞춤형 프로그램 ❌ - 섹션명 필요!`);
  console.log(`  5. banner (마무리 배너) ✅`);

  // 제안사항
  console.log('\n\n💡 수정 제안:\n');
  console.log('='.repeat(80));
  console.log(`
1. 시술 종류 지그재그 섹션에 data-section="treatments" 추가
   - section-label-mapper.ts에 'treatments' 섹션 정의
   - order: 25 (intro와 banner 사이)
   - displayName: '시술 종류'

2. 맞춤형 프로그램 섹션에 data-section="process" 추가
   - section-label-mapper.ts에서 기존 'process' 사용
   - 하지만 diet 페이지는 "맞춤형 프로그램"이므로 'program' 추가 권장
   - order: 35 (treatments와 banner 사이)
   - displayName: '맞춤 프로그램'

수정 후 섹션 순서:
  1. hero (10) - 상단 배너
  2. intro (20) - 메인 소개
  3. treatments (25) - 시술 종류 ← 새로 추가
  4. program (35) - 맞춤 프로그램 ← 새로 추가
  5. banner (50) - 마무리 배너
  `);

  console.log('='.repeat(80));
}

parseDietPage();
