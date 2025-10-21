#!/usr/bin/env node

/**
 * dist 폴더의 모든 HTML 파일에 배너 섹션 클래스를 적용하는 스크립트
 */

const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist');

// 배너 섹션 패턴들
const bannerPatterns = [
    // 패턴 1: 배경 이미지가 있고 오버레이가 있는 섹션
    {
        pattern: /<section class="treatment-section"\s+style="background-image:[^>]+>([\s\S]*?)<div style="position: absolute;[^>]*background: rgba\(0,0,0[^>]+><\/div>([\s\S]*?)<div[^>]*style="[^"]*position: relative; z-index: 2[^"]*"[^>]*>([\s\S]*?)<\/section>/g,
        replacement: (match, p1, p2, p3) => {
            // 배경 이미지 URL 추출
            const bgImageMatch = match.match(/background-image:\s*url\(['"](.*?)['"]\)/);
            const bgImage = bgImageMatch ? bgImageMatch[1] : '';

            // 텍스트 컨텐츠 부분 정리
            let content = p3
                .replace(/style="[^"]*color:\s*white[^"]*"/g, '')
                .replace(/style="[^"]*color:\s*#d4af37[^"]*"/g, '')
                .replace(/style="[^"]*color:\s*rgba\(255,255,255[^)]*\)[^"]*"/g, '')
                .replace(/style="text-align:\s*center;\s*"/g, '')
                .replace(/style=""/g, '');

            return `<section class="treatment-section banner-section" style="background-image: url('${bgImage}');">
            <div class="banner-overlay"></div>
            <div class="container responsive-container banner-content">${content}</section>`;
        }
    }
];

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        let changeLog = [];

        // 각 패턴 적용
        bannerPatterns.forEach((patternObj, index) => {
            const matches = content.match(patternObj.pattern);
            if (matches && matches.length > 0) {
                content = content.replace(patternObj.pattern, patternObj.replacement);
                changeLog.push(`✅ 배너 섹션 클래스 적용: ${matches.length}개`);
                modified = true;
            }
        });

        // 추가 정리: 인라인 color 스타일 제거
        const colorPatterns = [
            /style="color:\s*white;?"/g,
            /style="color:\s*#[a-f0-9]+;?"/g,
            /style="color:\s*rgba\([^)]+\);?"/g,
        ];

        colorPatterns.forEach(pattern => {
            if (content.match(pattern)) {
                content = content.replace(pattern, '');
                modified = true;
            }
        });

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

// 간단한 배너 섹션 찾기 및 변환
function findAndConvertBannerSections(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // 더 간단한 패턴: "마무리 메시지 섹션" 주석이 있는 부분 찾기
        const simplePattern = /<!-- 마무리 메시지 섹션 -->\s*<section[^>]*background-image[^>]*>([\s\S]*?)<\/section>/g;

        content = content.replace(simplePattern, (match) => {
            // 배경 이미지 URL 추출
            const bgImageMatch = match.match(/background-image:\s*url\(['"](.*?)['"]\)/);
            const bgImage = bgImageMatch ? bgImageMatch[1] : '';

            // 기존 내용에서 필요한 텍스트만 추출
            let innerContent = match
                .replace(/style="[^"]*color:\s*white[^"]*"/g, '')
                .replace(/style="[^"]*color:\s*#[a-f0-9]+[^"]*"/g, '')
                .replace(/style="[^"]*color:\s*rgba\([^)]+\)[^"]*"/g, '')
                .replace(/style="[^"]*text-align:\s*center[^"]*"/g, '')
                .replace(/style="[^"]*position:[^"]*"/g, '')
                .replace(/style="[^"]*z-index:[^"]*"/g, '')
                .replace(/style=""/g, '');

            // 텍스트 내용 추출
            const labelMatch = innerContent.match(/<div[^>]*>([^<]*Youth[^<]*)<\/div>/i);
            const h2Match = innerContent.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
            const pMatches = innerContent.match(/<p[^>]*>([\s\S]*?)<\/p>/g);

            let newContent = `<!-- 마무리 메시지 섹션 -->
        <section class="treatment-section banner-section" style="background-image: url('${bgImage}');">
            <div class="banner-overlay"></div>
            <div class="container responsive-container banner-content">
                <div class="row">
                    <div class="col col-sm-12">`;

            if (labelMatch) {
                newContent += `
                        <div class="text-label">${labelMatch[1].trim()}</div>`;
            }

            if (h2Match) {
                newContent += `
                        <h2 class="heading-main">${h2Match[1].trim()}</h2>`;
            }

            if (pMatches) {
                pMatches.forEach(p => {
                    const pContent = p.match(/<p[^>]*>([\s\S]*?)<\/p>/);
                    if (pContent) {
                        newContent += `
                        <p class="text-lead">${pContent[1].trim()}</p>`;
                    }
                });
            }

            newContent += `
                    </div>
                </div>
            </div>
        </section>`;

            modified = true;
            return newContent;
        });

        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log(`✅ ${path.basename(filePath)}: 배너 섹션 클래스 적용 완료`);
            return true;
        }

        return false;
    } catch (error) {
        console.error(`❌ ${path.basename(filePath)}: ${error.message}`);
        return false;
    }
}

// 메인 실행
function main() {
    console.log('🚀 배너 섹션 클래스 적용 시작...\n');

    const htmlFiles = fs.readdirSync(distPath)
        .filter(file => file.endsWith('.html'))
        .map(file => path.join(distPath, file));

    console.log(`📁 발견된 HTML 파일: ${htmlFiles.length}개\n`);

    let processedCount = 0;

    htmlFiles.forEach(file => {
        if (findAndConvertBannerSections(file)) {
            processedCount++;
        }
    });

    console.log(`\n✨ 완료! ${processedCount}/${htmlFiles.length} 파일이 업데이트되었습니다.`);
}

main();