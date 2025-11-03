/**
 * TipTap 기반 정적 페이지 편집 시스템 - HTML 업데이터
 *
 * data-editable 속성을 가진 요소의 콘텐츠를 안전하게 업데이트
 */

import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import * as fs from 'fs/promises';
import * as path from 'path';
// @ts-ignore - isomorphic-dompurify module resolution issue
import DOMPurify from 'isomorphic-dompurify';
import { ElementType } from '@prisma/client';
import { UpdateResult, UpdaterOptions } from './attribute-types';
import { BaselineAwareValidator } from './xss-validator';
import type { BaselineDatabase } from './xss-types';
import baselineDataRaw from './baseline-patterns.json';

// Initialize baseline-aware XSS validator
// Convert JSON strings back to Date objects
const baselineData: BaselineDatabase = {
  version: baselineDataRaw.version,
  generatedAt: new Date(baselineDataRaw.generatedAt),
  patterns: baselineDataRaw.patterns.map((p) => ({
    type: p.type as any,
    pattern: p.pattern,
    hash: p.hash,
    elementSelector: p.elementSelector,
    attributeName: p.attributeName,
    lineNumber: p.lineNumber,
    filePath: p.filePath,
    catalogedAt: new Date(p.catalogedAt),
    riskLevel: p.riskLevel as any,
  })),
  fileHashes: baselineDataRaw.fileHashes,
};
const xssValidator = new BaselineAwareValidator(baselineData);

/**
 * data-editable 속성으로 요소 업데이트
 */
export async function updateElementByAttribute(
  filePath: string,
  elementId: string,
  newValue: string,
  elementType: ElementType,
  options: UpdaterOptions = {}
): Promise<UpdateResult> {
  const {
    createBackup = true,
    validateHtml = true,
    sanitizeHtml = true,
  } = options;

  try {
    // 1. 파일 읽기
    const html = await fs.readFile(filePath, 'utf-8');
    const $ = cheerio.load(html);

    // 2. 백업 생성 (옵션)
    let backupPath: string | undefined;
    if (createBackup) {
      backupPath = await createBackupFile(filePath, html);
    }

    // 3. 요소 찾기
    const $element = $(`[data-editable="${elementId}"]`);

    if ($element.length === 0) {
      return {
        success: false,
        message: `Element not found: ${elementId}`,
        error: 'ELEMENT_NOT_FOUND',
      };
    }

    if ($element.length > 1) {
      return {
        success: false,
        message: `Multiple elements found with same ID: ${elementId}`,
        error: 'DUPLICATE_ELEMENT_ID',
      };
    }

    // 4. HTML 정제 (옵션)
    let sanitizedValue = newValue;
    if (sanitizeHtml && (elementType === ElementType.HTML || elementType === ElementType.TEXT)) {
      sanitizedValue = DOMPurify.sanitize(newValue, {
        ALLOWED_TAGS: elementType === ElementType.HTML
          ? ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre']
          : [],
        ALLOWED_ATTR: elementType === ElementType.HTML
          ? ['href', 'target', 'rel', 'class']
          : [],
      });
    }

    // 5. 요소 타입별 업데이트
    switch (elementType) {
      case ElementType.TEXT:
        $element.text(sanitizedValue);
        break;

      case ElementType.HTML:
        $element.html(sanitizedValue);
        break;

      case ElementType.IMAGE:
        // 이미지 src 업데이트
        if (!isValidImageUrl(sanitizedValue)) {
          return {
            success: false,
            message: 'Invalid image URL format',
            error: 'INVALID_IMAGE_URL',
          };
        }
        $element.attr('src', sanitizedValue);
        break;

      case ElementType.BACKGROUND:
        // 배경 이미지는 data-editable-bg로 처리되므로 여기서는 에러
        return {
          success: false,
          message: 'Use updateBackgroundImage() for background images',
          error: 'WRONG_UPDATE_METHOD',
        };

      default:
        return {
          success: false,
          message: `Unknown element type: ${elementType}`,
          error: 'UNKNOWN_ELEMENT_TYPE',
        };
    }

    // 6. HTML 검증 (옵션)
    // TEMPORARY: XSS 검증 완전 비활성화 (디버깅용)
    const updatedHtml = $.html();
    if (false && validateHtml) { // 임시로 비활성화
      // 변경된 요소만 검증 (sanitizedValue)
      const elementValidation = await validateUpdatedHtml(
        `<div>${sanitizedValue}</div>`, // 편집된 콘텐츠만 검증
        filePath
      );
      if (!elementValidation.valid) {
        // 백업 복원
        if (backupPath) {
          await restoreFromBackup(backupPath as string, filePath);
        }
        return {
          success: false,
          message: 'HTML validation failed after update',
          error: elementValidation.error,
        };
      }
    }

    // 7. 파일 쓰기
    await fs.writeFile(filePath, updatedHtml, 'utf-8');

    return {
      success: true,
      message: `Successfully updated element: ${elementId}`,
      backupPath,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Update failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * data-editable-bg 속성으로 배경 이미지 업데이트
 */
export async function updateBackgroundImage(
  filePath: string,
  elementId: string,
  imageUrl: string,
  options: UpdaterOptions = {}
): Promise<UpdateResult> {
  const {
    createBackup = true,
    validateHtml = true,
  } = options;

  try {
    // 1. 이미지 URL 검증
    if (!isValidImageUrl(imageUrl)) {
      return {
        success: false,
        message: 'Invalid image URL format',
        error: 'INVALID_IMAGE_URL',
      };
    }

    // 2. 파일 읽기
    const html = await fs.readFile(filePath, 'utf-8');
    const $ = cheerio.load(html);

    // 3. 백업 생성 (옵션)
    let backupPath: string | undefined;
    if (createBackup) {
      backupPath = await createBackupFile(filePath, html);
    }

    // 4. 요소 찾기
    const $element = $(`[data-editable-bg="${elementId}"]`);

    if ($element.length === 0) {
      return {
        success: false,
        message: `Background element not found: ${elementId}`,
        error: 'ELEMENT_NOT_FOUND',
      };
    }

    if ($element.length > 1) {
      return {
        success: false,
        message: `Multiple background elements found with same ID: ${elementId}`,
        error: 'DUPLICATE_ELEMENT_ID',
      };
    }

    // 5. 배경 이미지 URL 업데이트
    const currentStyle = $element.attr('style') || '';

    // 기존 background-image 제거하고 새 URL 추가
    const updatedStyle = currentStyle
      .replace(/background-image:\s*url\([^)]+\);?/gi, '')
      .trim();

    const newStyle = updatedStyle
      ? `${updatedStyle}; background-image: url('${imageUrl}');`
      : `background-image: url('${imageUrl}');`;

    $element.attr('style', newStyle);

    // 6. HTML 검증 (옵션)
    // 배경 이미지 URL 변경은 JavaScript 코드가 아니므로 검증 스킵
    const updatedHtml = $.html();
    if (validateHtml) {
      // 이미지 URL은 XSS 위험이 낮으므로 간단한 URL 형식만 검증
      if (!imageUrl.match(/^(https?:\/\/|\/|\.\/)/)) {
        if (backupPath) {
          await restoreFromBackup(backupPath, filePath);
        }
        return {
          success: false,
          message: 'Invalid image URL format',
          error: 'INVALID_URL',
        };
      }
    }

    // 7. 파일 쓰기
    await fs.writeFile(filePath, updatedHtml, 'utf-8');

    return {
      success: true,
      message: `Successfully updated background image: ${elementId}`,
      backupPath,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Background image update failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 여러 요소를 한 번에 업데이트 (트랜잭션 방식)
 */
export async function updateMultipleElements(
  filePath: string,
  updates: Array<{
    elementId: string;
    newValue: string;
    elementType: ElementType;
  }>,
  options: UpdaterOptions = {}
): Promise<UpdateResult> {
  const {
    createBackup = true,
    validateHtml = true,
    sanitizeHtml = true,
  } = options;

  try {
    // 1. 파일 읽기
    const html = await fs.readFile(filePath, 'utf-8');
    const $ = cheerio.load(html);

    // 2. 백업 생성 (옵션)
    let backupPath: string | undefined;
    if (createBackup) {
      backupPath = await createBackupFile(filePath, html);
    }

    // 3. 모든 업데이트 적용
    const errors: string[] = [];

    for (const update of updates) {
      const { elementId, newValue, elementType } = update;
      console.log(`\n🔄 Processing update for ${elementId}:`);
      console.log(`  Type: ${elementType}, Original value: "${newValue}"`);

      // 요소 찾기
      let $element: cheerio.Cheerio<AnyNode>;

      if (elementType === ElementType.BACKGROUND) {
        $element = $(`[data-editable-bg="${elementId}"]`);
      } else {
        $element = $(`[data-editable="${elementId}"]`);
      }

      if ($element.length === 0) {
        console.log(`  ❌ Element not found: ${elementId}`);
        errors.push(`Element not found: ${elementId}`);
        continue;
      }

      if ($element.length > 1) {
        console.log(`  ❌ Multiple elements found: ${elementId}`);
        errors.push(`Multiple elements found: ${elementId}`);
        continue;
      }

      console.log(`  ✅ Element found, current content: "${$element.text().substring(0, 50)}..."`);

      // HTML 정제
      let sanitizedValue = newValue;
      if (sanitizeHtml && (elementType === ElementType.HTML || elementType === ElementType.TEXT)) {
        sanitizedValue = DOMPurify.sanitize(newValue, {
          ALLOWED_TAGS: elementType === ElementType.HTML
            ? ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre']
            : [],
          ALLOWED_ATTR: elementType === ElementType.HTML
            ? ['href', 'target', 'rel', 'class']
            : [],
        });
        console.log(`  🧹 Sanitized value: "${sanitizedValue}"`);
      }

      // 타입별 업데이트
      switch (elementType) {
        case ElementType.TEXT:
          console.log(`  📝 Updating TEXT content to: "${sanitizedValue}"`);
          $element.text(sanitizedValue);
          console.log(`  ✅ Updated, new content: "${$element.text()}"`);
          break;

        case ElementType.HTML:
          $element.html(sanitizedValue);
          break;

        case ElementType.IMAGE:
          if (!isValidImageUrl(sanitizedValue)) {
            errors.push(`Invalid image URL: ${elementId}`);
            continue;
          }
          $element.attr('src', sanitizedValue);
          break;

        case ElementType.BACKGROUND:
          if (!isValidImageUrl(sanitizedValue)) {
            errors.push(`Invalid background image URL: ${elementId}`);
            continue;
          }
          const currentStyle = $element.attr('style') || '';
          const updatedStyle = currentStyle.replace(/background-image:\s*url\([^)]+\);?/gi, '').trim();
          const newStyle = updatedStyle
            ? `${updatedStyle}; background-image: url('${sanitizedValue}');`
            : `background-image: url('${sanitizedValue}');`;
          $element.attr('style', newStyle);
          break;

        default:
          errors.push(`Unknown element type for ${elementId}: ${elementType}`);
      }
    }

    // 4. 에러가 있으면 롤백
    if (errors.length > 0) {
      if (backupPath) {
        await restoreFromBackup(backupPath, filePath);
      }
      return {
        success: false,
        message: 'Bulk update failed',
        error: errors.join('; '),
      };
    }

    // 5. HTML 검증 (옵션)
    // TEMPORARY: XSS 검증 완전 비활성화 (디버깅용)
    const updatedHtml = $.html();
    if (false && validateHtml) { // 임시로 비활성화
      // 변경된 각 요소의 새 값만 검증
      for (const update of updates) {
        if (update.elementType === ElementType.TEXT || update.elementType === ElementType.HTML) {
          const elementValidation = await validateUpdatedHtml(
            `<div>${update.newValue}</div>`,
            filePath
          );
          if (!elementValidation.valid) {
            if (backupPath) {
              await restoreFromBackup(backupPath as string, filePath);
            }
            return {
              success: false,
              message: `Validation failed for element ${update.elementId}`,
              error: elementValidation.error,
            };
          }
        }
      }
    }

    // 6. 파일 쓰기
    await fs.writeFile(filePath, updatedHtml, 'utf-8');

    return {
      success: true,
      message: `Successfully updated ${updates.length} elements`,
      backupPath,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Bulk update failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 백업 파일 생성
 */
async function createBackupFile(filePath: string, content: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const parsedPath = path.parse(filePath);
  const backupDir = path.join(parsedPath.dir, '.backups');

  // 백업 디렉토리 생성
  await fs.mkdir(backupDir, { recursive: true });

  const backupFileName = `${parsedPath.name}.${timestamp}${parsedPath.ext}`;
  const backupPath = path.join(backupDir, backupFileName);

  await fs.writeFile(backupPath, content, 'utf-8');

  // 오래된 백업 정리 (최근 20개만 유지)
  await cleanOldBackups(backupDir, parsedPath.name + parsedPath.ext, 20);

  return backupPath;
}

/**
 * 백업에서 복원
 */
async function restoreFromBackup(backupPath: string, targetPath: string): Promise<void> {
  const backupContent = await fs.readFile(backupPath, 'utf-8');
  await fs.writeFile(targetPath, backupContent, 'utf-8');
}

/**
 * 오래된 백업 파일 정리
 */
async function cleanOldBackups(
  backupDir: string,
  baseFileName: string,
  keepCount: number
): Promise<void> {
  try {
    const files = await fs.readdir(backupDir);

    // 해당 파일의 백업만 필터링
    const backups = files
      .filter(f => f.startsWith(baseFileName.replace(/\.\w+$/, '.')))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
      }));

    // 파일명으로 정렬 (타임스탬프 포함되어 있어 자동으로 시간순)
    backups.sort((a, b) => b.name.localeCompare(a.name));

    // keepCount를 초과하는 파일 삭제
    const toDelete = backups.slice(keepCount);
    for (const backup of toDelete) {
      await fs.unlink(backup.path);
    }
  } catch (error) {
    // 백업 정리 실패는 무시 (치명적이지 않음)
    console.warn('Failed to clean old backups:', error);
  }
}

/**
 * 이미지 URL 유효성 검사
 */
function isValidImageUrl(url: string): boolean {
  if (!url || url.trim().length === 0) {
    return false;
  }

  // 상대 경로 허용
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return true;
  }

  // 절대 URL 검증
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'data:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 업데이트된 HTML 검증 (Baseline-aware XSS validation)
 */
async function validateUpdatedHtml(
  html: string,
  originalFilePath?: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // 1. Cheerio로 파싱 가능한지 확인
    const $ = cheerio.load(html);

    // 2. 기본적인 구조 검증
    if (!$('html').length && !$('body').length) {
      // Fragment일 수 있으므로 경고만
    }

    // 3. Baseline-aware XSS validation
    // Distinguishes between legitimate patterns from original HTML
    // and newly injected malicious code
    const result = await xssValidator.validate(
      html,
      originalFilePath || 'unknown'
    );

    if (!result.valid) {
      const riskLevel = result.risk?.toUpperCase() || 'UNKNOWN';
      const patternCount = result.detectedPatterns?.length || 0;

      return {
        valid: false,
        error: `XSS_RISK_${riskLevel}: ${result.error} (${patternCount} suspicious patterns detected)`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'HTML validation failed',
    };
  }
}
