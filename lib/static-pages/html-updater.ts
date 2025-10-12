import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

export interface StaticPageSection {
  id: string;
  type: 'text' | 'image' | 'background';
  selector: string;
  content?: string;
  imageUrl?: string;
  alt?: string;
}

export interface UpdateResult {
  success: boolean;
  message: string;
  backupPath?: string;
  error?: string;
}

export class HTMLUpdater {
  private staticSitePath: string;

  constructor(staticSitePath: string) {
    this.staticSitePath = staticSitePath;
  }

  /**
   * HTML 파일 업데이트 (백업 포함)
   */
  async updateHTML(
    filePath: string,
    sections: StaticPageSection[]
  ): Promise<UpdateResult> {
    try {
      const fullPath = path.join(this.staticSitePath, filePath);

      // 1. 파일 존재 확인
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          message: `파일을 찾을 수 없습니다: ${filePath}`,
          error: 'FILE_NOT_FOUND',
        };
      }

      // 2. 백업 생성
      const backupPath = fullPath.replace('.html', '.backup.html');
      try {
        fs.copyFileSync(fullPath, backupPath);
      } catch (backupError) {
        return {
          success: false,
          message: '백업 파일 생성 실패',
          error: 'BACKUP_FAILED',
        };
      }

      // 3. HTML 로드
      const originalHTML = fs.readFileSync(fullPath, 'utf-8');
      const originalLength = originalHTML.length;

      // 4. Cheerio로 파싱 (중요: 올바른 옵션 설정)
      const $ = cheerio.load(originalHTML, {
        xmlMode: false, // HTML 모드 (XML 자동 수정 방지)
        decodeEntities: false, // 특수문자 인코딩 방지
      });

      // 5. 섹션별 업데이트
      for (const section of sections) {
        try {
          this.updateSection($, section);
        } catch (sectionError) {
          console.error(`섹션 업데이트 실패 [${section.id}]:`, sectionError);
          // 섹션 하나 실패해도 계속 진행
        }
      }

      // 6. HTML 생성
      let updatedHTML = $.html();

      // 7. DOCTYPE 보존 (Cheerio가 제거하는 경우 대비)
      if (
        originalHTML.startsWith('<!DOCTYPE') &&
        !updatedHTML.startsWith('<!DOCTYPE')
      ) {
        const doctypeMatch = originalHTML.match(/<!DOCTYPE[^>]+>/i);
        if (doctypeMatch) {
          updatedHTML = doctypeMatch[0] + '\n' + updatedHTML;
        }
      }

      // 8. 변경 검증 (HTML이 너무 짧아지면 오류로 간주)
      if (updatedHTML.length < originalLength * 0.5) {
        // 백업에서 복원
        fs.copyFileSync(backupPath, fullPath);
        return {
          success: false,
          message: 'HTML 길이가 비정상적으로 짧아졌습니다. 변경사항이 롤백되었습니다.',
          error: 'HTML_CORRUPTION_DETECTED',
          backupPath,
        };
      }

      // 9. 파일 저장
      fs.writeFileSync(fullPath, updatedHTML, 'utf-8');

      return {
        success: true,
        message: '페이지가 성공적으로 업데이트되었습니다.',
        backupPath,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 오류 발생 시 백업에서 복원 시도
      try {
        const fullPath = path.join(this.staticSitePath, filePath);
        const backupPath = fullPath.replace('.html', '.backup.html');

        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, fullPath);
          return {
            success: false,
            message: `업데이트 실패. 백업에서 복원했습니다: ${errorMessage}`,
            error: errorMessage,
            backupPath,
          };
        }
      } catch (restoreError) {
        console.error('백업 복원 실패:', restoreError);
      }

      return {
        success: false,
        message: `업데이트 중 오류 발생: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * 개별 섹션 업데이트
   */
  private updateSection(
    $: cheerio.CheerioAPI,
    section: StaticPageSection
  ): void {
    const element = $(section.selector);

    if (!element.length) {
      console.warn(`선택자를 찾을 수 없습니다: ${section.selector}`);
      return;
    }

    switch (section.type) {
      case 'text':
        if (section.content !== undefined) {
          // HTML 태그를 포함한 콘텐츠 업데이트
          element.html(section.content);
        }
        break;

      case 'image':
        if (section.imageUrl) {
          element.attr('src', section.imageUrl);
        }
        if (section.alt !== undefined) {
          element.attr('alt', section.alt);
        }
        break;

      case 'background':
        if (section.imageUrl) {
          const currentStyle = element.attr('style') || '';
          // background-image 스타일만 교체
          const newStyle = currentStyle.replace(
            /background-image:\s*url\([^)]+\)/gi,
            `background-image: url('${section.imageUrl}')`
          );

          // background-image가 없었다면 추가
          if (!/background-image/i.test(currentStyle)) {
            element.attr(
              'style',
              `${currentStyle}; background-image: url('${section.imageUrl}')`
            );
          } else {
            element.attr('style', newStyle);
          }
        }
        break;
    }
  }

  /**
   * 백업 파일 삭제
   */
  async deleteBackup(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.staticSitePath, filePath);
      const backupPath = fullPath.replace('.html', '.backup.html');

      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('백업 삭제 실패:', error);
      return false;
    }
  }

  /**
   * 백업에서 복원
   */
  async restoreFromBackup(filePath: string): Promise<UpdateResult> {
    try {
      const fullPath = path.join(this.staticSitePath, filePath);
      const backupPath = fullPath.replace('.html', '.backup.html');

      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          message: '백업 파일을 찾을 수 없습니다.',
          error: 'BACKUP_NOT_FOUND',
        };
      }

      fs.copyFileSync(backupPath, fullPath);

      return {
        success: true,
        message: '백업에서 성공적으로 복원되었습니다.',
        backupPath,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `복원 중 오류 발생: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }
}
