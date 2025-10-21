#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 설정 파일 로드
const config = {
    pages: [
        {
            name: "botox",
            title: "보톡스",
            category: "주름/탄력",
            template: "treatment-master",
            content: "treatments/botox.html",
            output: "botox.html",
            banner_bg: "/images/banners/treatment-banner.jpg"
        },
        {
            name: "jeomin",
            title: "제오민",
            category: "주름/탄력",
            template: "treatment-master",
            content: "treatments/jeomin.html",
            output: "jeomin.html",
            banner_bg: "/images/banners/treatment-banner.jpg"
        },
        {
            name: "filler",
            title: "필러",
            category: "볼륨/리프팅",
            template: "treatment-master",
            content: "treatments/filler.html",
            output: "filler.html",
            banner_bg: "/images/banners/treatment-banner.jpg"
        },
        {
            name: "skinbooster",
            title: "스킨부스터",
            category: "볼륨/리프팅",
            template: "treatment-master",
            content: "treatments/skinbooster.html",
            output: "skinbooster.html",
            banner_bg: "/images/banners/treatment-banner.jpg"
        },
        {
            name: "lifting",
            title: "리프팅",
            category: "볼륨/리프팅",
            template: "treatment-master",
            content: "treatments/lifting.html",
            output: "lifting.html",
            banner_bg: "/images/banners/treatment-banner.jpg"
        },
        {
            name: "acne",
            title: "여드름치료",
            category: "피부케어",
            template: "treatment-master",
            content: "treatments/acne.html",
            output: "acne.html",
            banner_bg: "/images/banners/treatment-banner.jpg"
        },
        {
            name: "peeling",
            title: "필링",
            category: "피부케어",
            template: "treatment-master",
            content: "treatments/peeling.html",
            output: "peeling.html",
            banner_bg: "/images/banners/treatment-banner.jpg"
        },
        {
            name: "mole",
            title: "점",
            category: "제거시술",
            template: "treatment-master",
            content: "treatments/mole.html",
            output: "mole.html",
            banner_bg: "/images/banners/treatment-banner.jpg"
        },
        {
            name: "milia",
            title: "비립종",
            category: "제거시술",
            template: "treatment-master",
            content: "treatments/milia.html",
            output: "milia.html",
            banner_bg: "/images/banners/treatment-banner.jpg"
        },
        {
            name: "tattoo",
            title: "문신제거",
            category: "제거시술",
            template: "treatment-master",
            content: "treatments/tattoo.html",
            output: "tattoo.html",
            banner_bg: "/images/banners/treatment-banner.jpg"
        },
        {
            name: "hair-removal",
            title: "제모",
            category: "바디케어",
            template: "treatment-master",
            content: "treatments/hair-removal.html",
            output: "hair-removal.html",
            banner_bg: "/images/banners/treatment-banner.jpg"
        },
        {
            name: "diet",
            title: "다이어트",
            category: "바디케어",
            template: "treatment-master",
            content: "treatments/diet.html",
            output: "diet.html",
            banner_bg: "/images/banners/treatment-banner.jpg"
        }
    ]
};

// 템플릿 로드 함수
function loadTemplate(templatePath) {
    const fullPath = path.join(__dirname, 'templates', templatePath);
    if (!fs.existsSync(fullPath)) {
        console.error(`Template not found: ${fullPath}`);
        return null;
    }
    return fs.readFileSync(fullPath, 'utf8');
}

// 컨텐츠 로드 함수
function loadContent(contentPath) {
    const fullPath = path.join(__dirname, 'contents', contentPath);
    if (!fs.existsSync(fullPath)) {
        console.error(`Content not found: ${fullPath}`);
        return null;
    }
    return fs.readFileSync(fullPath, 'utf8');
}

// 템플릿 변수 치환 함수
function replaceVariables(template, variables) {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
    }
    
    // 조건부 블록 처리 ({{#if VARIABLE}} ... {{/if}})
    result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, varName, content) => {
        return variables[varName] ? content : '';
    });
    
    return result;
}

// 페이지 빌드 함수
function buildPage(pageConfig) {
    console.log(`Building ${pageConfig.name}...`);
    
    // 템플릿 로드
    const masterTemplate = loadTemplate(`${pageConfig.template}.html`);
    if (!masterTemplate) {
        console.error(`Failed to load template for ${pageConfig.name}`);
        return false;
    }
    
    // 컴포넌트 로드
    const header = loadTemplate('master/header.html');
    const footer = loadTemplate('master/footer.html');
    const quickmenu = loadTemplate('master/quickmenu.html');
    const subBanner = loadTemplate('master/sub-banner.html');
    
    // 컨텐츠 로드
    const content = loadContent(pageConfig.content);
    if (!content) {
        console.error(`Failed to load content for ${pageConfig.name}`);
        return false;
    }
    
    // SubBanner 변수 치환
    let processedSubBanner = subBanner;
    if (subBanner) {
        processedSubBanner = replaceVariables(subBanner, {
            CATEGORY_NAME: pageConfig.category,
            PAGE_TITLE: pageConfig.title,
            PARENT_MENU: '시술 안내'
        });
    }
    
    // 관련 시술 추천 (옵션)
    const relatedTreatments = pageConfig.related ? generateRelatedTreatments(pageConfig.related) : '';
    
    // 마스터 템플릿 변수 치환
    const variables = {
        PAGE_TITLE: pageConfig.title,
        HEADER: header || '',
        FOOTER: footer || '',
        QUICKMENU: quickmenu || '',
        SUB_BANNER: processedSubBanner || '',
        SUB_BANNER_BG: pageConfig.banner_bg || '/images/banners/default-banner.jpg',
        CONTENT: content,
        HERO_IMAGE: pageConfig.hero_image || '',
        RELATED_TREATMENTS: relatedTreatments
    };
    
    const finalHtml = replaceVariables(masterTemplate, variables);
    
    // 출력 디렉토리 확인
    const outputDir = path.join(__dirname, 'dist');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // HTML 파일 저장
    const outputPath = path.join(outputDir, pageConfig.output);
    fs.writeFileSync(outputPath, finalHtml, 'utf8');
    console.log(`✅ Generated: ${outputPath}`);
    
    return true;
}

// 관련 시술 HTML 생성
function generateRelatedTreatments(relatedList) {
    if (!relatedList || relatedList.length === 0) return '';
    
    return relatedList.map(item => `
        <div class="related-card">
            <img src="${item.image}" alt="${item.title}">
            <div class="related-card-content">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
            </div>
        </div>
    `).join('');
}

// 모든 페이지 빌드
function buildAll() {
    console.log('🚀 Starting build process...\n');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const pageConfig of config.pages) {
        if (buildPage(pageConfig)) {
            successCount++;
        } else {
            failCount++;
        }
    }
    
    console.log('\n📊 Build Summary:');
    console.log(`✅ Success: ${successCount} pages`);
    if (failCount > 0) {
        console.log(`❌ Failed: ${failCount} pages`);
    }
    console.log('\n✨ Build complete!');
}

// 단일 페이지 빌드 (커맨드라인 인자)
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // 모든 페이지 빌드
        buildAll();
    } else if (args[0] === '--page' && args[1]) {
        // 특정 페이지만 빌드
        const pageName = args[1];
        const pageConfig = config.pages.find(p => p.name === pageName);
        
        if (pageConfig) {
            buildPage(pageConfig);
        } else {
            console.error(`Page not found: ${pageName}`);
            process.exit(1);
        }
    } else if (args[0] === '--help') {
        console.log('Usage:');
        console.log('  node build-pages.js           # Build all pages');
        console.log('  node build-pages.js --page <name>  # Build specific page');
        console.log('  node build-pages.js --help    # Show this help');
    } else {
        console.error('Invalid arguments. Use --help for usage information.');
        process.exit(1);
    }
}

// 실행
main();