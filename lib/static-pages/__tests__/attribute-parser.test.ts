/**
 * attribute-parser 테스트
 * data-editable 속성 기반 HTML 파싱 기능 검증
 */

import { ElementType } from '@prisma/client';
import {
  parseEditableAttributes,
  groupBySection,
} from '../attribute-parser';
import { EditableElement } from '../attribute-types';

describe('attribute-parser', () => {
  describe('parseEditableAttributes', () => {
    it('should parse TEXT elements correctly', () => {
      const html = `
        <div>
          <h1 data-editable="title">Main Title</h1>
          <p data-editable="description">Description text</p>
        </div>
      `;

      const result = parseEditableAttributes(html);

      expect(result.success).toBe(true);
      expect(result.elements).toHaveLength(2);

      const titleElement = result.elements.find(e => e.id === 'title');
      expect(titleElement).toBeDefined();
      expect(titleElement?.type).toBe(ElementType.TEXT);
      expect(titleElement?.currentValue).toBe('Main Title');
    });

    it('should parse HTML elements with nested tags', () => {
      const html = `
        <div data-editable="content" data-type="html">
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
        </div>
      `;

      const result = parseEditableAttributes(html);

      expect(result.success).toBe(true);
      expect(result.elements[0].type).toBe(ElementType.HTML);
      expect(result.elements[0].currentValue).toContain('<p>Paragraph 1</p>');
    });

    it('should parse IMAGE elements', () => {
      const html = `
        <img data-editable="hero-image" src="/images/hero.jpg" alt="Hero" />
      `;

      const result = parseEditableAttributes(html);

      expect(result.success).toBe(true);
      expect(result.elements[0].type).toBe(ElementType.IMAGE);
      expect(result.elements[0].currentValue).toBe('/images/hero.jpg');
    });

    it('should parse BACKGROUND elements', () => {
      const html = `
        <section data-editable-bg="hero-bg" style="background-image: url('/bg.jpg'); padding: 20px;">
          Content
        </section>
      `;

      const result = parseEditableAttributes(html, { includeBackgrounds: true });

      expect(result.success).toBe(true);
      const bgElement = result.elements.find(e => e.type === ElementType.BACKGROUND);
      expect(bgElement).toBeDefined();
      expect(bgElement?.currentValue).toBe('/bg.jpg');
    });

    it('should skip background elements when includeBackgrounds is false', () => {
      const html = `
        <section data-editable-bg="hero-bg" style="background-image: url('/bg.jpg');">
          Content
        </section>
      `;

      const result = parseEditableAttributes(html, { includeBackgrounds: false });

      expect(result.success).toBe(true);
      expect(result.elements).toHaveLength(0);
    });

    it('should generate unique selectors', () => {
      const html = `
        <div id="unique-id" data-editable="elem1">Text 1</div>
        <div data-editable="elem2" class="my-class">Text 2</div>
        <div data-editable="elem3">Text 3</div>
      `;

      const result = parseEditableAttributes(html);

      expect(result.success).toBe(true);
      expect(result.elements[0].selector).toBe('#unique-id');
      expect(result.elements[1].selector).toContain('[data-editable="elem2"]');
      expect(result.elements[2].selector).toContain('[data-editable="elem3"]');
    });

    it('should detect parent sections correctly', () => {
      const html = `
        <section data-section="hero">
          <h1 data-editable="hero-title">Hero Title</h1>
        </section>
        <section id="features">
          <h2 data-editable="features-title">Features</h2>
        </section>
        <div class="section-about">
          <p data-editable="about-text">About text</p>
        </div>
      `;

      const result = parseEditableAttributes(html);

      expect(result.success).toBe(true);
      expect(result.elements[0].sectionName).toBe('hero');
      expect(result.elements[1].sectionName).toBe('features');
      expect(result.elements[2].sectionName).toBe('about');
    });

    it('should use data-label when provided', () => {
      const html = `
        <h1 data-editable="title" data-label="Main Page Title">Content</h1>
      `;

      const result = parseEditableAttributes(html);

      expect(result.success).toBe(true);
      expect(result.elements[0].label).toBe('Main Page Title');
    });

    it('should generate readable labels from element IDs', () => {
      const html = `
        <h1 data-editable="section-0-title">Content</h1>
      `;

      const result = parseEditableAttributes(html);

      expect(result.success).toBe(true);
      expect(result.elements[0].label).toContain('Section');
      expect(result.elements[0].label).toContain('Title');
    });

    it('should assign order based on document position', () => {
      const html = `
        <div>
          <p data-editable="first">First</p>
          <p data-editable="second">Second</p>
          <p data-editable="third">Third</p>
        </div>
      `;

      const result = parseEditableAttributes(html);

      expect(result.success).toBe(true);
      expect(result.elements[0].order).toBe(0);
      expect(result.elements[1].order).toBe(1);
      expect(result.elements[2].order).toBe(2);
    });

    it('should detect duplicate IDs in validation', () => {
      const html = `
        <div>
          <p data-editable="duplicate">First</p>
          <p data-editable="duplicate">Second</p>
        </div>
      `;

      const result = parseEditableAttributes(html, { validateAttributes: true });

      expect(result.success).toBe(true); // Non-strict mode
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('Duplicate'))).toBe(true);
    });

    it('should fail in strict mode with duplicate IDs', () => {
      const html = `
        <div>
          <p data-editable="duplicate">First</p>
          <p data-editable="duplicate">Second</p>
        </div>
      `;

      const result = parseEditableAttributes(html, {
        validateAttributes: true,
        strictMode: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Duplicate');
    });

    it('should detect potential XSS risks', () => {
      const html = `
        <div data-editable="content" data-type="html">
          <script>alert('xss')</script>
        </div>
      `;

      const result = parseEditableAttributes(html, { validateAttributes: true });

      expect(result.success).toBe(true); // Non-strict mode
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('XSS'))).toBe(true);
    });

    it('should warn about empty values', () => {
      const html = `
        <p data-editable="empty"></p>
      `;

      const result = parseEditableAttributes(html, { validateAttributes: true });

      expect(result.success).toBe(true); // Non-strict mode
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('empty'))).toBe(true);
    });

    it('should handle malformed HTML gracefully', () => {
      const html = `
        <div data-editable="test">
          <p>Unclosed paragraph
          <div>Nested div
        </div>
      `;

      const result = parseEditableAttributes(html);

      expect(result.success).toBe(true);
      expect(result.elements).toHaveLength(1);
    });
  });

  describe('groupBySection', () => {
    it('should group elements by section name', () => {
      const elements: EditableElement[] = [
        {
          id: 'hero-title',
          type: ElementType.TEXT,
          selector: '#hero-title',
          currentValue: 'Hero',
          label: 'Hero Title',
          sectionName: 'hero',
          order: 0,
        },
        {
          id: 'hero-subtitle',
          type: ElementType.TEXT,
          selector: '#hero-subtitle',
          currentValue: 'Subtitle',
          label: 'Hero Subtitle',
          sectionName: 'hero',
          order: 1,
        },
        {
          id: 'about-text',
          type: ElementType.TEXT,
          selector: '#about-text',
          currentValue: 'About',
          label: 'About Text',
          sectionName: 'about',
          order: 0,
        },
      ];

      const groups = groupBySection(elements);

      expect(Object.keys(groups)).toHaveLength(2);
      expect(groups['hero']).toHaveLength(2);
      expect(groups['about']).toHaveLength(1);
    });

    it('should sort elements by order within sections', () => {
      const elements: EditableElement[] = [
        {
          id: 'third',
          type: ElementType.TEXT,
          selector: '#third',
          currentValue: 'Third',
          label: 'Third',
          sectionName: 'main',
          order: 2,
        },
        {
          id: 'first',
          type: ElementType.TEXT,
          selector: '#first',
          currentValue: 'First',
          label: 'First',
          sectionName: 'main',
          order: 0,
        },
        {
          id: 'second',
          type: ElementType.TEXT,
          selector: '#second',
          currentValue: 'Second',
          label: 'Second',
          sectionName: 'main',
          order: 1,
        },
      ];

      const groups = groupBySection(elements);

      expect(groups['main'][0].id).toBe('first');
      expect(groups['main'][1].id).toBe('second');
      expect(groups['main'][2].id).toBe('third');
    });

    it('should handle elements without section names', () => {
      const elements: EditableElement[] = [
        {
          id: 'no-section',
          type: ElementType.TEXT,
          selector: '#no-section',
          currentValue: 'Content',
          label: 'Content',
          sectionName: 'default',
          order: 0,
        },
      ];

      const groups = groupBySection(elements);

      expect(groups['default']).toBeDefined();
      expect(groups['default']).toHaveLength(1);
    });
  });
});
