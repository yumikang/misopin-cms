import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import fs from 'fs';
import path from 'path';

export interface ParsedSection {
  id: string;
  type: 'text' | 'image' | 'background';
  label: string;
  selector: string;
  content?: string;
  imageUrl?: string;
  alt?: string;
  preview?: string;
}

export interface ParseResult {
  success: boolean;
  sections: ParsedSection[];
  error?: string;
}

export class HTMLParser {
  private staticSitePath: string;

  constructor(staticSitePath: string) {
    this.staticSitePath = staticSitePath;
  }

  /**
   * HTML 파일에서 편집 가능한 섹션 파싱
   */
  async parseHTML(filePath: string): Promise<ParseResult> {
    try {
      const fullPath = path.join(this.staticSitePath, filePath);

      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          sections: [],
          error: `파일을 찾을 수 없습니다: ${filePath}`,
        };
      }

      const html = fs.readFileSync(fullPath, 'utf-8');
      const $ = cheerio.load(html);

      const sections: ParsedSection[] = [];

      // 패턴 1: <section> 태그 파싱
      this.parseSectionTags($, sections);

      // 패턴 2: .treatment-section 같은 콘텐츠 클래스
      this.parseContentClasses($, sections);

      // 패턴 3: 특정 div.container 영역
      this.parseContainerDivs($, sections);

      // 패턴 4: 배너 이미지 (배경)
      this.parseBannerImages($, sections);

      return {
        success: true,
        sections,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        sections: [],
        error: errorMessage,
      };
    }
  }

  /**
   * 패턴 1: <section> 태그 파싱
   */
  private parseSectionTags(
    $: cheerio.CheerioAPI,
    sections: ParsedSection[]
  ): void {
    $('section').each((index, element) => {
      const $section = $(element);
      const id = $section.attr('id') || `section-${index}`;
      const className = $section.attr('class') || '';

      // 텍스트 콘텐츠 추출
      const heading = $section.find('h1, h2, h3, h4').first();
      if (heading.length) {
        const selector = this.generateSelector($section, heading);
        sections.push({
          id: `${id}-heading`,
          type: 'text',
          label: `${id} 제목`,
          selector,
          content: heading.html() || '',
          preview: heading.text().substring(0, 50),
        });
      }

      // 단락 콘텐츠
      $section.find('p').each((pIndex, p) => {
        const $p = $(p);
        const pId = $p.attr('id') || `${id}-p-${pIndex}`;
        const selector = this.generateSelector($section, $p);

        sections.push({
          id: pId,
          type: 'text',
          label: `${id} 단락 ${pIndex + 1}`,
          selector,
          content: $p.html() || '',
          preview: $p.text().substring(0, 50),
        });
      });

      // 이미지
      $section.find('img').each((imgIndex, img) => {
        const $img = $(img);
        const imgId = $img.attr('id') || `${id}-img-${imgIndex}`;
        const selector = this.generateSelector($section, $img);

        sections.push({
          id: imgId,
          type: 'image',
          label: `${id} 이미지 ${imgIndex + 1}`,
          selector,
          imageUrl: $img.attr('src') || '',
          alt: $img.attr('alt') || '',
        });
      });
    });
  }

  /**
   * 패턴 2: 콘텐츠 클래스 파싱 (.treatment-section, .info-section 등)
   */
  private parseContentClasses(
    $: cheerio.CheerioAPI,
    sections: ParsedSection[]
  ): void {
    const contentClasses = [
      '.treatment-section',
      '.info-section',
      '.intro-section',
      '.features',
    ];

    contentClasses.forEach((className) => {
      $(className).each((index, element) => {
        const $element = $(element);
        const id = $element.attr('id') || `${className.slice(1)}-${index}`;

        // 제목
        const heading = $element.find('h2, h3, h4').first();
        if (heading.length) {
          const selector = this.generateSelector($element, heading);
          sections.push({
            id: `${id}-heading`,
            type: 'text',
            label: `${className} 제목`,
            selector,
            content: heading.html() || '',
            preview: heading.text().substring(0, 50),
          });
        }

        // 설명 텍스트
        const description = $element.find('.description, .text, p').first();
        if (description.length) {
          const selector = this.generateSelector($element, description);
          sections.push({
            id: `${id}-desc`,
            type: 'text',
            label: `${className} 설명`,
            selector,
            content: description.html() || '',
            preview: description.text().substring(0, 50),
          });
        }
      });
    });
  }

  /**
   * 패턴 3: div.container 영역 파싱
   */
  private parseContainerDivs(
    $: cheerio.CheerioAPI,
    sections: ParsedSection[]
  ): void {
    $('div.container').each((index, element) => {
      const $container = $(element);
      const id = $container.attr('id') || `container-${index}`;

      // 카드 요소들
      $container.find('.card, .feature-card, .service-card').each((cardIndex, card) => {
        const $card = $(card);
        const cardId = `${id}-card-${cardIndex}`;

        // 카드 제목
        const cardTitle = $card.find('h3, h4, .card-title').first();
        if (cardTitle.length) {
          const selector = this.generateSelector($card, cardTitle);
          sections.push({
            id: `${cardId}-title`,
            type: 'text',
            label: `카드 ${cardIndex + 1} 제목`,
            selector,
            content: cardTitle.html() || '',
            preview: cardTitle.text().substring(0, 50),
          });
        }

        // 카드 이미지
        const cardImg = $card.find('img').first();
        if (cardImg.length) {
          const selector = this.generateSelector($card, cardImg);
          sections.push({
            id: `${cardId}-img`,
            type: 'image',
            label: `카드 ${cardIndex + 1} 이미지`,
            selector,
            imageUrl: cardImg.attr('src') || '',
            alt: cardImg.attr('alt') || '',
          });
        }
      });
    });
  }

  /**
   * 패턴 4: 배너 배경 이미지 파싱
   */
  private parseBannerImages(
    $: cheerio.CheerioAPI,
    sections: ParsedSection[]
  ): void {
    const bannerSelectors = [
      '.sub-banner',
      '.main-banner',
      '.hero-banner',
      '[style*="background-image"]',
    ];

    bannerSelectors.forEach((selector) => {
      $(selector).each((index, element) => {
        const $element = $(element);
        const style = $element.attr('style') || '';
        const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/i);

        if (bgMatch) {
          const id = $element.attr('id') || `${selector.replace(/[.\[\]]/g, '')}-${index}`;
          const elementSelector = this.generateSelector($element, $element);

          sections.push({
            id: `${id}-bg`,
            type: 'background',
            label: `${selector} 배경 이미지`,
            selector: elementSelector,
            imageUrl: bgMatch[1],
          });
        }
      });
    });
  }

  /**
   * CSS 선택자 생성 (고유하고 안정적인 선택자)
   */
  private generateSelector(
    $parent: cheerio.Cheerio<AnyNode>,
    $element: cheerio.Cheerio<AnyNode>
  ): string {
    // 1. ID가 있으면 ID 사용
    const id = $element.attr('id');
    if (id) {
      return `#${id}`;
    }

    // 2. 고유한 클래스 조합
    const className = $element.attr('class');
    if (className) {
      const classes = className.trim().split(/\s+/);
      if (classes.length > 0) {
        // 부모 컨텍스트 추가
        const parentId = $parent.attr('id');
        const parentClass = $parent.attr('class')?.split(/\s+/)[0];

        if (parentId) {
          return `#${parentId} .${classes.join('.')}`;
        } else if (parentClass) {
          return `.${parentClass} .${classes.join('.')}`;
        }
        return `.${classes.join('.')}`;
      }
    }

    // 3. 태그명 + nth-child (마지막 수단)
    const tagName = $element.prop('tagName')?.toLowerCase();
    const siblings = $parent.find(tagName || '*');
    const index = siblings.index($element[0]);

    if (index >= 0) {
      const parentId = $parent.attr('id');
      if (parentId) {
        return `#${parentId} ${tagName}:nth-child(${index + 1})`;
      }
    }

    // 4. 폴백: 태그명만
    return tagName || 'div';
  }
}
