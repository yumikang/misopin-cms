/**
 * attribute-updater 테스트
 * data-editable 속성 기반 HTML 업데이트 기능 검증
 */

// Mock isomorphic-dompurify before imports
jest.mock('isomorphic-dompurify', () => ({
  sanitize: (html: string) => html.replace(/<script[^>]*>.*?<\/script>/gi, ''),
}));

import * as fs from 'fs/promises';
import * as path from 'path';
import { ElementType } from '@prisma/client';
import {
  updateElementByAttribute,
  updateBackgroundImage,
  updateMultipleElements,
} from '../attribute-updater';

// 테스트용 임시 디렉토리
const TEST_DIR = path.join(__dirname, '.tmp-test');
const TEST_FILE = path.join(TEST_DIR, 'test.html');

describe('attribute-updater', () => {
  beforeEach(async () => {
    // 테스트 디렉토리 생성
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    // 테스트 디렉토리 정리
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('updateElementByAttribute', () => {
    it('should update TEXT element correctly', async () => {
      const html = `
        <html>
          <body>
            <h1 data-editable="title">Old Title</h1>
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const result = await updateElementByAttribute(
        TEST_FILE,
        'title',
        'New Title',
        ElementType.TEXT
      );

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();

      const updated = await fs.readFile(TEST_FILE, 'utf-8');
      expect(updated).toContain('New Title');
      expect(updated).not.toContain('Old Title');
    });

    it('should update HTML element with nested tags', async () => {
      const html = `
        <html>
          <body>
            <div data-editable="content">Old content</div>
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const newContent = '<p>New <strong>paragraph</strong></p>';
      const result = await updateElementByAttribute(
        TEST_FILE,
        'content',
        newContent,
        ElementType.HTML
      );

      expect(result.success).toBe(true);

      const updated = await fs.readFile(TEST_FILE, 'utf-8');
      expect(updated).toContain('<p>New <strong>paragraph</strong></p>');
    });

    it('should update IMAGE element src attribute', async () => {
      const html = `
        <html>
          <body>
            <img data-editable="hero-img" src="/old.jpg" alt="Hero" />
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const result = await updateElementByAttribute(
        TEST_FILE,
        'hero-img',
        '/new.jpg',
        ElementType.IMAGE
      );

      expect(result.success).toBe(true);

      const updated = await fs.readFile(TEST_FILE, 'utf-8');
      expect(updated).toContain('src="/new.jpg"');
      expect(updated).not.toContain('/old.jpg');
    });

    it('should sanitize HTML content by default', async () => {
      const html = `
        <html>
          <body>
            <div data-editable="content">Safe content</div>
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const maliciousContent = '<p>Text</p><script>alert("xss")</script>';
      const result = await updateElementByAttribute(
        TEST_FILE,
        'content',
        maliciousContent,
        ElementType.HTML
      );

      expect(result.success).toBe(true);

      const updated = await fs.readFile(TEST_FILE, 'utf-8');
      expect(updated).toContain('<p>Text</p>');
      expect(updated).not.toContain('<script>');
    });

    it('should create backup file by default', async () => {
      const html = `
        <html>
          <body>
            <h1 data-editable="title">Title</h1>
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const result = await updateElementByAttribute(
        TEST_FILE,
        'title',
        'New Title',
        ElementType.TEXT
      );

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeDefined();

      // 백업 파일 존재 확인
      const backupExists = await fs.access(result.backupPath!).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);
    });

    it('should skip backup when createBackup is false', async () => {
      const html = `
        <html>
          <body>
            <h1 data-editable="title">Title</h1>
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const result = await updateElementByAttribute(
        TEST_FILE,
        'title',
        'New Title',
        ElementType.TEXT,
        { createBackup: false }
      );

      expect(result.success).toBe(true);
      expect(result.backupPath).toBeUndefined();
    });

    it('should fail when element not found', async () => {
      const html = `
        <html>
          <body>
            <h1 data-editable="title">Title</h1>
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const result = await updateElementByAttribute(
        TEST_FILE,
        'non-existent',
        'New Value',
        ElementType.TEXT
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('ELEMENT_NOT_FOUND');
    });

    it('should fail when multiple elements with same ID exist', async () => {
      const html = `
        <html>
          <body>
            <h1 data-editable="duplicate">Title 1</h1>
            <h2 data-editable="duplicate">Title 2</h2>
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const result = await updateElementByAttribute(
        TEST_FILE,
        'duplicate',
        'New Value',
        ElementType.TEXT
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('DUPLICATE_ELEMENT_ID');
    });

    it('should reject invalid image URLs', async () => {
      const html = `
        <html>
          <body>
            <img data-editable="img" src="/old.jpg" />
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const result = await updateElementByAttribute(
        TEST_FILE,
        'img',
        'javascript:alert("xss")',
        ElementType.IMAGE
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_IMAGE_URL');
    });
  });

  describe('updateBackgroundImage', () => {
    it('should update background-image style correctly', async () => {
      const html = `
        <html>
          <body>
            <section data-editable-bg="hero-bg" style="background-image: url('/old-bg.jpg'); padding: 20px;">
              Content
            </section>
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const result = await updateBackgroundImage(
        TEST_FILE,
        'hero-bg',
        '/new-bg.jpg'
      );

      expect(result.success).toBe(true);

      const updated = await fs.readFile(TEST_FILE, 'utf-8');
      expect(updated).toContain("background-image: url('/new-bg.jpg')");
      expect(updated).not.toContain('/old-bg.jpg');
      expect(updated).toContain('padding: 20px'); // Other styles preserved
    });

    it('should add background-image when not present', async () => {
      const html = `
        <html>
          <body>
            <section data-editable-bg="hero-bg" style="padding: 20px;">
              Content
            </section>
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const result = await updateBackgroundImage(
        TEST_FILE,
        'hero-bg',
        '/new-bg.jpg'
      );

      expect(result.success).toBe(true);

      const updated = await fs.readFile(TEST_FILE, 'utf-8');
      expect(updated).toContain("background-image: url('/new-bg.jpg')");
    });

    it('should reject invalid image URLs', async () => {
      const html = `
        <html>
          <body>
            <section data-editable-bg="hero-bg" style="background-image: url('/old.jpg');">
              Content
            </section>
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const result = await updateBackgroundImage(
        TEST_FILE,
        'hero-bg',
        'javascript:void(0)'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_IMAGE_URL');
    });
  });

  describe('updateMultipleElements', () => {
    it('should update multiple elements successfully', async () => {
      const html = `
        <html>
          <body>
            <h1 data-editable="title">Old Title</h1>
            <p data-editable="text">Old text</p>
            <img data-editable="img" src="/old.jpg" />
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const updates = [
        { elementId: 'title', newValue: 'New Title', elementType: ElementType.TEXT },
        { elementId: 'text', newValue: 'New text', elementType: ElementType.TEXT },
        { elementId: 'img', newValue: '/new.jpg', elementType: ElementType.IMAGE },
      ];

      const result = await updateMultipleElements(TEST_FILE, updates);

      expect(result.success).toBe(true);

      const updated = await fs.readFile(TEST_FILE, 'utf-8');
      expect(updated).toContain('New Title');
      expect(updated).toContain('New text');
      expect(updated).toContain('/new.jpg');
    });

    it('should rollback on error (transaction behavior)', async () => {
      const html = `
        <html>
          <body>
            <h1 data-editable="title">Old Title</h1>
            <p data-editable="text">Old text</p>
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const updates = [
        { elementId: 'title', newValue: 'New Title', elementType: ElementType.TEXT },
        { elementId: 'non-existent', newValue: 'Value', elementType: ElementType.TEXT },
      ];

      const result = await updateMultipleElements(TEST_FILE, updates);

      expect(result.success).toBe(false);

      // 원본 유지 확인 (롤백)
      const content = await fs.readFile(TEST_FILE, 'utf-8');
      expect(content).toContain('Old Title');
    });

    it('should handle mixed element types', async () => {
      const html = `
        <html>
          <body>
            <h1 data-editable="title">Title</h1>
            <div data-editable="content">Content</div>
            <img data-editable="img" src="/img.jpg" />
            <section data-editable-bg="bg" style="background-image: url('/bg.jpg');">
              Section
            </section>
          </body>
        </html>
      `;

      await fs.writeFile(TEST_FILE, html, 'utf-8');

      const updates = [
        { elementId: 'title', newValue: 'New Title', elementType: ElementType.TEXT },
        { elementId: 'content', newValue: '<p>New content</p>', elementType: ElementType.HTML },
        { elementId: 'img', newValue: '/new-img.jpg', elementType: ElementType.IMAGE },
        { elementId: 'bg', newValue: '/new-bg.jpg', elementType: ElementType.BACKGROUND },
      ];

      const result = await updateMultipleElements(TEST_FILE, updates);

      expect(result.success).toBe(true);

      const updated = await fs.readFile(TEST_FILE, 'utf-8');
      expect(updated).toContain('New Title');
      expect(updated).toContain('<p>New content</p>');
      expect(updated).toContain('/new-img.jpg');
      expect(updated).toContain('/new-bg.jpg');
    });
  });
});
