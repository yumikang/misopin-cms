#!/usr/bin/env node

/**
 * dist 폴더의 모든 HTML 파일에 첫 번째 섹션에 first-section 클래스를 추가하는 스크립트
 */

const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist');

function addFirstSectionClass(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // 패턴 1: <!-- 메인 소개 섹션 --> 다음의 section
        const pattern1 = /<!-- 메인 소개 섹션 -->\s*<section\s+class="([^"]*)"/g;

        content = content.replace(pattern1, (match, existingClasses) => {
            if (!existingClasses.includes('first-section')) {
                modified = true;
                return `<!-- 메인 소개 섹션 -->\n        <section class="${existingClasses} first-section"`;
            }
            return match;
        });

        // 패턴 2: 첫 번째 treatment-section (배너가 아닌)
        const pattern2 = /<main[^>]*>\s*<div[^>]*>\s*(?:<!--[^>]*-->\s*)*<section\s+class="treatment-section"(?!\s+banner-section)/;

        if (!modified) {
            content = content.replace(pattern2, (match) => {
                modified = true;
                return match.replace('class="treatment-section"', 'class="treatment-section first-section"');
            });
        }

        // 패턴 3: section class="section treatment-section" (첫 번째 것만)
        const pattern3 = /<section\s+class="section treatment-section"/;

        if (!modified && pattern3.test(content)) {
            content = content.replace(pattern3, '<section class="section treatment-section first-section"');
            modified = true;
        }

        // 텍스트 영역에 first-section-content 클래스 추가
        if (modified) {
            // 첫 번째 섹션 내의 텍스트 컬럼에 클래스 추가
            const sectionMatch = content.match(/<section[^>]*first-section[^>]*>([\s\S]*?)<\/section>/);
            if (sectionMatch) {
                let sectionContent = sectionMatch[1];

                // col-lg-6 또는 col-lg-7인 텍스트 영역 찾기
                sectionContent = sectionContent.replace(
                    /<div\s+class="col[^"]*col-lg-[67][^"]*"(\s+[^>]*)?>/,
                    (colMatch) => {
                        if (!colMatch.includes('first-section-content')) {
                            return colMatch.replace('>', ' first-section-content>');
                        }
                        return colMatch;
                    }
                );

                // 라벨 div에 클래스 추가
                sectionContent = sectionContent.replace(
                    /<div\s+style="color:\s*#d4a574[^"]*">/g,
                    '<div class="first-section-label">'
                );

                // 태그 버튼 컨테이너에 클래스 추가
                sectionContent = sectionContent.replace(
                    /<div\s+style="display:\s*flex;\s*flex-wrap[^"]*">/g,
                    '<div class="tag-buttons">'
                );

                // 태그 버튼에 클래스 추가
                sectionContent = sectionContent.replace(
                    /<span\s+style="display:\s*inline-block;[^"]*padding:\s*0\.625rem[^"]*">/g,
                    '<span class="tag-button">'
                );

                // 이미지 영역에 클래스 추가
                sectionContent = sectionContent.replace(
                    /<div\s+class="col[^"]*col-lg-[56][^"]*"(\s+[^>]*)?>(\s*<img)/,
                    (imgMatch) => {
                        if (!imgMatch.includes('first-section-image')) {
                            return imgMatch.replace('>', ' first-section-image>');
                        }
                        return imgMatch;
                    }
                );

                // 수정된 내용으로 교체
                content = content.replace(
                    /<section[^>]*first-section[^>]*>[\s\S]*?<\/section>/,
                    `<section class="treatment-section first-section">${sectionContent}</section>`
                );
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log(`✅ ${path.basename(filePath)}: first-section 클래스 추가 완료`);
            return true;
        } else {
            console.log(`⏭️  ${path.basename(filePath)}: 이미 적용됨 또는 패턴 없음`);
        }

        return false;
    } catch (error) {
        console.error(`❌ ${path.basename(filePath)}: ${error.message}`);
        return false;
    }
}

// 메인 실행
function main() {
    console.log('🚀 첫 번째 섹션에 first-section 클래스 추가 시작...\n');

    const htmlFiles = fs.readdirSync(distPath)
        .filter(file => file.endsWith('.html'))
        .map(file => path.join(distPath, file));

    console.log(`📁 발견된 HTML 파일: ${htmlFiles.length}개\n`);

    let processedCount = 0;

    htmlFiles.forEach(file => {
        if (addFirstSectionClass(file)) {
            processedCount++;
        }
    });

    console.log(`\n✨ 완료! ${processedCount}/${htmlFiles.length} 파일이 업데이트되었습니다.`);
}

main();