#!/usr/bin/env node

/**
 * 템플릿 업데이트 스크립트
 * 마스터 템플릿의 변경사항을 모든 기존 페이지에 자동 적용
 * 예: 이벤트 버튼 텍스트 변경 시 모든 페이지에 일괄 적용
 */

const fs = require('fs');
const path = require('path');

// 템플릿 파일 경로
const HEADER_TEMPLATE = './templates/master/header.html';

// 업데이트할 페이지들
const PAGES_TO_UPDATE = [
    './index.html',
    './board-page.html',
    './calendar-page.html',
    './dist/filler.html',
    './dist/botox.html',
    './dist/jeomin.html',
    './dist/skinbooster.html',
    './dist/lifting.html',
    './dist/acne.html',
    './dist/peeling.html',
    './dist/mole.html',
    './dist/milia.html',
    './dist/tattoo.html',
    './dist/hair-removal.html',
    './dist/diet.html',
    './dist/about.html'
];

// 헤더 템플릿에서 이벤트 텍스트 추출 및 업데이트 + 로고 업데이트
function updateEventButton() {
    if (!fs.existsSync(HEADER_TEMPLATE)) {
        console.error(`❌ 템플릿 파일을 찾을 수 없습니다: ${HEADER_TEMPLATE}`);
        return;
    }
    
    const headerContent = fs.readFileSync(HEADER_TEMPLATE, 'utf8');
    
    // 헤더에서 이벤트 버튼 텍스트 추출
    const eventMatch = headerContent.match(/<a class="event"[^>]*>([^<]+)<\/a>/);
    if (!eventMatch) {
        console.error('❌ 헤더 템플릿에서 이벤트 버튼을 찾을 수 없습니다.');
        return;
    }
    
    const eventText = eventMatch[1].trim();
    console.log(`📌 템플릿의 이벤트 버튼 텍스트: "${eventText}"`);
    console.log('');
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    PAGES_TO_UPDATE.forEach(pagePath => {
        if (!fs.existsSync(pagePath)) {
            console.log(`⚠️  파일 없음: ${pagePath}`);
            skippedCount++;
            return;
        }
        
        let content = fs.readFileSync(pagePath, 'utf8');
        const originalContent = content;
        
        // 이벤트 버튼 텍스트 업데이트
        // class="event" 를 가진 모든 a 태그의 텍스트를 변경
        content = content.replace(
            /<a class="event"([^>]*)>[^<]*<\/a>/g,
            `<a class="event"$1>${eventText}</a>`
        );
        
        // 헤더 로고 업데이트 (SVG를 PNG로)
        content = content.replace(
            /<img src="..\/img\/미소핀로고\.svg"/g,
            '<img src="../img/misopin-temporary-logo.png"'
        );
        
        // 푸터 로고 업데이트 (SVG를 PNG로)
        content = content.replace(
            /<img class="ft_logo" src="..\/img\/미소핀로고\.svg"/g,
            '<img class="ft_logo" src="../img/misopin-temporary-logo.png"'
        );
        
        // 변경사항이 있는 경우에만 파일 저장
        if (content !== originalContent) {
            fs.writeFileSync(pagePath, content);
            console.log(`✅ 업데이트 완료: ${pagePath}`);
            updatedCount++;
        } else {
            console.log(`⏭️  변경사항 없음: ${pagePath}`);
            skippedCount++;
        }
    });
    
    console.log('\n========================================');
    console.log(`📊 업데이트 결과:`);
    console.log(`   ✅ 업데이트된 파일: ${updatedCount}개`);
    console.log(`   ⏭️  스킵된 파일: ${skippedCount}개`);
    console.log('========================================');
}

// 메인 실행 함수
function main() {
    console.log('========================================');
    console.log('템플릿 업데이트 스크립트 실행');
    console.log('========================================\n');
    
    try {
        updateEventButton();
        
        console.log('\n✨ 템플릿 업데이트 완료!');
        console.log('');
        console.log('💡 사용법:');
        console.log('   1. templates/master/header.html 에서 이벤트 텍스트 수정');
        console.log('   2. node update-templates.js 실행');
        console.log('   3. 모든 페이지에 자동 반영!');
    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        process.exit(1);
    }
}

// 스크립트 실행
if (require.main === module) {
    main();
}