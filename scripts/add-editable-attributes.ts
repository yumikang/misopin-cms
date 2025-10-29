import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';

const distPath = '/Users/blee/Desktop/cms/Misopin-renew/dist';

interface AttributeMapping {
  selector: string;
  idPattern: string;
  label: string;
  type?: 'text' | 'html' | 'image' | 'background';
  attribute?: string;
}

const COMMON_MAPPINGS: AttributeMapping[] = [
  // Hero section
  { selector: '#sub_main_banner', idPattern: '{page}-hero-background', label: '히어로 배경', type: 'background', attribute: 'data-editable-bg' },
  { selector: '#sub_main_banner p:first-child', idPattern: '{page}-hero-category', label: '카테고리' },
  { selector: '#sub_main_banner .breadcrumb span:last-child', idPattern: '{page}-hero-breadcrumb', label: '브레드크럼' },

  // First section (intro)
  { selector: 'section.first-section', idPattern: '{page}-intro-section', label: '소개 섹션', attribute: 'data-section', type: 'text' },
  { selector: '.first-section-label', idPattern: '{page}-intro-label', label: '라벨' },
  { selector: '.first-section h2.heading-main', idPattern: '{page}-intro-title', label: '소개 제목' },
  { selector: '.first-section .usp-text', idPattern: '{page}-intro-usp', label: 'USP 문구', type: 'html' },
  { selector: '.first-section img', idPattern: '{page}-intro-image', label: '소개 이미지', type: 'image' },
];

function addEditableAttributes(html: string, pageName: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  let changeCount = 0;

  // Add data-section to hero
  const hero = document.querySelector('#sub_main_banner');
  if (hero && !hero.hasAttribute('data-section')) {
    hero.setAttribute('data-section', 'hero');
    hero.setAttribute('data-editable-bg', `${pageName}-hero-background`);
    hero.setAttribute('data-label', '히어로 배경');
    changeCount++;
  }

  // Hero category
  const heroCategory = document.querySelector('#sub_main_banner .txt_area > p:first-child');
  if (heroCategory && !heroCategory.hasAttribute('data-editable')) {
    heroCategory.setAttribute('data-editable', `${pageName}-hero-category`);
    heroCategory.setAttribute('data-label', '카테고리');
    changeCount++;
  }

  // Hero breadcrumb
  const breadcrumbSpans = document.querySelectorAll('#sub_main_banner .breadcrumb span');
  if (breadcrumbSpans.length > 0) {
    const lastSpan = breadcrumbSpans[breadcrumbSpans.length - 1];
    if (!lastSpan.hasAttribute('data-editable')) {
      lastSpan.setAttribute('data-editable', `${pageName}-hero-breadcrumb`);
      lastSpan.setAttribute('data-label', '브레드크럼');
      changeCount++;
    }
  }

  // First section (intro)
  const firstSection = document.querySelector('section.first-section');
  if (firstSection && !firstSection.hasAttribute('data-section')) {
    firstSection.setAttribute('data-section', 'intro');
    changeCount++;

    const label = firstSection.querySelector('.first-section-label');
    if (label && !label.hasAttribute('data-editable')) {
      label.setAttribute('data-editable', `${pageName}-intro-label`);
      label.setAttribute('data-label', '라벨');
      changeCount++;
    }

    const title = firstSection.querySelector('h2.heading-main');
    if (title && !title.hasAttribute('data-editable')) {
      title.setAttribute('data-editable', `${pageName}-intro-title`);
      title.setAttribute('data-label', '소개 제목');
      changeCount++;
    }

    const usp = firstSection.querySelector('.usp-text');
    if (usp && !usp.hasAttribute('data-editable')) {
      usp.setAttribute('data-editable', `${pageName}-intro-usp`);
      usp.setAttribute('data-label', 'USP 문구');
      usp.setAttribute('data-type', 'html');
      changeCount++;
    }

    const paragraphs = firstSection.querySelectorAll('p:not(.usp-text)');
    paragraphs.forEach((p, idx) => {
      if (!p.hasAttribute('data-editable') && p.textContent && p.textContent.trim().length > 10) {
        p.setAttribute('data-editable', `${pageName}-intro-desc${idx + 1}`);
        p.setAttribute('data-label', `설명 ${idx + 1}`);
        p.setAttribute('data-type', 'html');
        changeCount++;
      }
    });

    const img = firstSection.querySelector('img');
    if (img && !img.hasAttribute('data-editable')) {
      img.setAttribute('data-editable', `${pageName}-intro-image`);
      img.setAttribute('data-label', '소개 이미지');
      changeCount++;
    }
  }

  // Principle/Treatment sections with has-background
  const principleSection = document.querySelector('section.has-background');
  if (principleSection && !principleSection.hasAttribute('data-section')) {
    principleSection.setAttribute('data-section', 'principle');
    changeCount++;

    const sectionTit = principleSection.querySelector('.section_tit, .text-label');
    if (sectionTit && !sectionTit.hasAttribute('data-editable')) {
      sectionTit.setAttribute('data-editable', `${pageName}-principle-label`);
      sectionTit.setAttribute('data-label', '원리 라벨');
      changeCount++;
    }

    const title = principleSection.querySelector('h2.heading-main');
    if (title && !title.hasAttribute('data-editable')) {
      title.setAttribute('data-editable', `${pageName}-principle-title`);
      title.setAttribute('data-label', '원리 제목');
      changeCount++;
    }

    const desc = principleSection.querySelector('.section_tit p, p[style*="margin-top"]');
    if (desc && !desc.hasAttribute('data-editable')) {
      desc.setAttribute('data-editable', `${pageName}-principle-desc`);
      desc.setAttribute('data-label', '원리 설명');
      changeCount++;
    }

    // Flow steps
    const flowSteps = principleSection.querySelectorAll('.flow-step');
    flowSteps.forEach((step, idx) => {
      const h4 = step.querySelector('h4');
      const p = step.querySelector('p');

      if (h4 && !h4.hasAttribute('data-editable')) {
        h4.setAttribute('data-editable', `${pageName}-principle-step${idx + 1}-title`);
        h4.setAttribute('data-label', `원리 ${idx + 1}단계 제목`);
        changeCount++;
      }

      if (p && !p.hasAttribute('data-editable')) {
        p.setAttribute('data-editable', `${pageName}-principle-step${idx + 1}-desc`);
        p.setAttribute('data-label', `원리 ${idx + 1}단계 설명`);
        changeCount++;
      }
    });

    // Duration box
    const durationBox = principleSection.querySelector('.treatment-duration-box p, .duration-text');
    if (durationBox && !durationBox.hasAttribute('data-editable')) {
      durationBox.setAttribute('data-editable', `${pageName}-principle-duration`);
      durationBox.setAttribute('data-label', '지속기간');
      durationBox.setAttribute('data-type', 'html');
      changeCount++;
    }
  }

  // Process section
  const processSections = document.querySelectorAll('section.treatment-section');
  processSections.forEach((section) => {
    const header = section.querySelector('.section-header h2');
    if (header && header.textContent?.includes('시술단계') && !section.hasAttribute('data-section')) {
      section.setAttribute('data-section', 'process');
      changeCount++;

      if (!header.hasAttribute('data-editable')) {
        header.setAttribute('data-editable', `${pageName}-process-title`);
        header.setAttribute('data-label', '시술단계 제목');
        changeCount++;
      }

      const subtitle = section.querySelector('.section-subtitle');
      if (subtitle && !subtitle.hasAttribute('data-editable')) {
        subtitle.setAttribute('data-editable', `${pageName}-process-subtitle`);
        subtitle.setAttribute('data-label', '시술단계 부제목');
        subtitle.setAttribute('data-type', 'html');
        changeCount++;
      }

      const steps = section.querySelectorAll('.process-step');
      steps.forEach((step, idx) => {
        const h4 = step.querySelector('h4');
        const p = step.querySelector('p');

        if (h4 && !h4.hasAttribute('data-editable')) {
          h4.setAttribute('data-editable', `${pageName}-process-step${idx + 1}-title`);
          h4.setAttribute('data-label', `${idx + 1}단계 제목`);
          changeCount++;
        }

        if (p && !p.hasAttribute('data-editable')) {
          p.setAttribute('data-editable', `${pageName}-process-step${idx + 1}-desc`);
          p.setAttribute('data-label', `${idx + 1}단계 설명`);
          changeCount++;
        }
      });
    }
  });

  // Banner section
  const bannerSection = document.querySelector('section.banner-section');
  if (bannerSection && !bannerSection.hasAttribute('data-section')) {
    bannerSection.setAttribute('data-section', 'banner');
    bannerSection.setAttribute('data-editable-bg', `${pageName}-banner-background`);
    bannerSection.setAttribute('data-label', '배너 배경');
    changeCount++;

    const label = bannerSection.querySelector('.text-label');
    if (label && !label.hasAttribute('data-editable')) {
      label.setAttribute('data-editable', `${pageName}-banner-label`);
      label.setAttribute('data-label', '배너 라벨');
      changeCount++;
    }

    const title = bannerSection.querySelector('h2.heading-main');
    if (title && !title.hasAttribute('data-editable')) {
      title.setAttribute('data-editable', `${pageName}-banner-title`);
      title.setAttribute('data-label', '배너 제목');
      changeCount++;
    }

    const leads = bannerSection.querySelectorAll('.text-lead');
    leads.forEach((lead, idx) => {
      if (!lead.hasAttribute('data-editable')) {
        lead.setAttribute('data-editable', `${pageName}-banner-desc${idx + 1}`);
        lead.setAttribute('data-label', `배너 설명 ${idx + 1}`);
        changeCount++;
      }
    });
  }

  console.log(`  ✅ Added ${changeCount} data-editable attributes`);
  return dom.serialize();
}

async function processAllFiles() {
  const htmlFiles = fs.readdirSync(distPath)
    .filter(f => f.endsWith('.html'))
    .filter(f => f !== 'botox.html'); // Skip botox as it's already done

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing ${htmlFiles.length} HTML files...`);
  console.log(`${'='.repeat(60)}\n`);

  for (const file of htmlFiles) {
    const filePath = path.join(distPath, file);
    const pageName = file.replace('.html', '');

    console.log(`📄 Processing: ${file}`);

    const html = fs.readFileSync(filePath, 'utf-8');
    const updatedHtml = addEditableAttributes(html, pageName);

    fs.writeFileSync(filePath, updatedHtml, 'utf-8');
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ All files processed successfully!`);
  console.log(`${'='.repeat(60)}\n`);
}

processAllFiles().catch(console.error);
