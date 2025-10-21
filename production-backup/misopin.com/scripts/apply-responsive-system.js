#!/usr/bin/env node

/**
 * dist 폴더의 모든 HTML 파일에 반응형 시스템을 적용하는 스크립트
 *
 * 실행 방법:
 * node scripts/apply-responsive-system.js
 */

const fs = require('fs');
const path = require('path');

// dist 폴더 경로
const distPath = path.join(__dirname, '..', 'dist');
const cssLinkToAdd = '    <!-- 통합 반응형 시스템 CSS -->\n    <link rel="stylesheet" href="../css/dist-responsive-system.css">\n';

// 인라인 스타일을 클래스로 변환하는 매핑
const styleToClassMapping = [
    // 제목 변환
    {
        pattern: /<h2\s+style="font-size:\s*2\.25rem[^"]*">/g,
        replacement: '<h2 class="heading-main">',
        description: 'H2 메인 제목'
    },
    {
        pattern: /<h2\s+style="[^"]*font-size:\s*2\.25rem[^"]*">/g,
        replacement: '<h2 class="heading-main">',
        description: 'H2 메인 제목 (복합 스타일)'
    },
    {
        pattern: /<h3\s+style="font-size:\s*1\.75rem[^"]*">/g,
        replacement: '<h3 class="heading-sub">',
        description: 'H3 서브 제목'
    },
    {
        pattern: /<h4\s+style="[^"]*font-size:\s*1\.125rem[^"]*">/g,
        replacement: '<h4 class="heading-section">',
        description: 'H4 섹션 제목'
    },
    // 본문 변환
    {
        pattern: /<p\s+style="font-size:\s*1\.125rem[^"]*">/g,
        replacement: '<p class="text-lead">',
        description: '리드 텍스트'
    },
    {
        pattern: /<p\s+style="font-size:\s*1rem[^"]*">/g,
        replacement: '<p class="text-body">',
        description: '본문 텍스트'
    },
    {
        pattern: /<p\s+style="font-size:\s*0\.875rem[^"]*">/g,
        replacement: '<p class="text-small">',
        description: '작은 텍스트'
    },
    // 라벨/카테고리
    {
        pattern: /<div\s+style="[^"]*font-size:\s*0\.875rem[^"]*font-weight:\s*600[^"]*">/g,
        replacement: '<div class="text-label">',
        description: '라벨 텍스트'
    },
    // 프로세스 번호
    {
        pattern: /<div\s+style="font-size:\s*1\.75rem;\s*color:\s*var\(--misopin-primary\)[^"]*">/g,
        replacement: '<div class="process-number">',
        description: '프로세스 번호'
    },
    // 카드 컨테이너
    {
        pattern: /<div\s+class="process-step"\s+style="[^"]*">/g,
        replacement: '<div class="process-step">',
        description: '프로세스 스텝 카드'
    },
    // 섹션 클래스 추가
    {
        pattern: /<section\s+class="treatment-section"\s+style="padding:\s*3\.75rem\s+0[^"]*">/g,
        replacement: '<section class="treatment-section section">',
        description: '일반 섹션'
    },
    {
        pattern: /<section\s+class="treatment-section"\s+style="padding:\s*6\.25rem\s+0[^"]*">/g,
        replacement: '<section class="treatment-section section-lg">',
        description: '큰 섹션'
    }
];

// HTML 파일 처리 함수
function processHtmlFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        let changeLog = [];

        // 1. CSS 링크 추가 (아직 없는 경우)
        if (!content.includes('dist-responsive-system.css')) {
            const cssInsertPoint = content.indexOf('<!-- Swiper CSS -->');
            if (cssInsertPoint !== -1) {
                content = content.slice(0, cssInsertPoint) +
                         cssLinkToAdd + '\n' +
                         content.slice(cssInsertPoint);
                modified = true;
                changeLog.push('✅ 반응형 시스템 CSS 추가');
            }
        }

        // 2. 인라인 스타일을 클래스로 변환
        styleToClassMapping.forEach(mapping => {
            const matches = content.match(mapping.pattern);
            if (matches && matches.length > 0) {
                content = content.replace(mapping.pattern, mapping.replacement);
                changeLog.push(`✅ ${mapping.description}: ${matches.length}개 변환`);
                modified = true;
            }
        });

        // 3. Grid 클래스 추가
        // col-lg-3 → grid-4-cols
        content = content.replace(/class="col col-sm-12 col-md-6 col-lg-3"/g,
                                 'class="col grid-4-cols"');

        // col-lg-4 → grid-3-cols
        content = content.replace(/class="col col-sm-12 col-md-6 col-lg-4"/g,
                                 'class="col grid-3-cols"');

        // 4. Container 클래스 추가
        content = content.replace(/class="container"/g,
                                 'class="container responsive-container"');

        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log(`\n📄 ${path.basename(filePath)}`);
            changeLog.forEach(log => console.log(`   ${log}`));
            return true;
        }

        return false;
    } catch (error) {
        console.error(`❌ 오류 발생 (${path.basename(filePath)}):`, error.message);
        return false;
    }
}

// 메인 실행 함수
function main() {
    console.log('🚀 dist 폴더 반응형 시스템 적용 시작...\n');

    // dist 폴더의 모든 HTML 파일 가져오기
    const htmlFiles = fs.readdirSync(distPath)
        .filter(file => file.endsWith('.html'))
        .map(file => path.join(distPath, file));

    console.log(`📁 발견된 HTML 파일: ${htmlFiles.length}개\n`);

    let processedCount = 0;

    htmlFiles.forEach(file => {
        if (processHtmlFile(file)) {
            processedCount++;
        }
    });

    console.log(`\n✨ 완료! ${processedCount}/${htmlFiles.length} 파일이 업데이트되었습니다.`);

    // 추가 권장사항
    console.log('\n💡 권장사항:');
    console.log('1. 브라우저에서 각 페이지를 테스트하세요');
    console.log('2. 모바일/태블릿/데스크톱 해상도를 확인하세요');
    console.log('3. 필요시 dist-responsive-system.css를 조정하세요');
}

// 스크립트 실행
main();