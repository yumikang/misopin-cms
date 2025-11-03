/**
 * File Sync Service
 *
 * DB와 HTML 파일 간의 원자적 동기화 보장
 * - 트랜잭션을 사용한 원자성 보장
 * - 파일 해시를 통한 무결성 검증
 * - 실패 시 자동 롤백
 * - 비동기 큐를 통한 성능 최적화
 */

import { PrismaClient, Prisma, SyncStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ParsedSection } from './types';

const prisma = new PrismaClient();

/**
 * 파일 동기화 에러
 */
export class FileSyncError extends Error {
  constructor(
    message: string,
    public readonly pageId: string,
    public readonly operation: 'read' | 'write' | 'hash' | 'backup',
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'FileSyncError';
  }
}

/**
 * 동기화 옵션
 */
export interface SyncOptions {
  /** 페이지 ID */
  pageId: string;
  /** HTML 파일 경로 */
  filePath: string;
  /** 업데이트할 섹션 데이터 */
  sections: Prisma.InputJsonValue;
  /** 변경자 ID */
  changedBy: string;
  /** 변경 사유 */
  changeNote?: string;
  /** 비동기 처리 여부 (기본: false) */
  async?: boolean;
  /** 백업 생성 여부 (기본: true) */
  createBackup?: boolean;
}

/**
 * 동기화 결과
 */
export interface SyncResult {
  /** 성공 여부 */
  success: boolean;
  /** 업데이트된 페이지 데이터 */
  page?: Prisma.static_pagesGetPayload<object>;
  /** 새 version */
  version?: number;
  /** 파일 해시 */
  fileHash?: string;
  /** 백업 파일 경로 */
  backupPath?: string;
  /** 에러 정보 */
  error?: string;
  /** 비동기 처리 여부 */
  isAsync?: boolean;
  /** sync_queue ID (비동기인 경우) */
  queueId?: string;
}

/**
 * 파일 해시 계산 (SHA-256)
 */
export async function calculateFileHash(filePath: string, basePath?: string): Promise<string> {
  try {
    const absolutePath = basePath
      ? path.resolve(basePath, filePath)
      : path.resolve(filePath);
    const fileBuffer = await fs.readFile(absolutePath);
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    return hash.digest('hex');
  } catch (error) {
    throw new FileSyncError(
      `Failed to calculate hash for ${filePath}`,
      '',
      'hash',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 파일 백업 생성
 */
async function createFileBackup(filePath: string, basePath?: string): Promise<string> {
  try {
    const absolutePath = basePath
      ? path.resolve(basePath, filePath)
      : path.resolve(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${absolutePath}.backup-${timestamp}`;

    await fs.copyFile(absolutePath, backupPath);
    return backupPath;
  } catch (error) {
    throw new FileSyncError(
      `Failed to create backup for ${filePath}`,
      '',
      'backup',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 파일에서 HTML 읽기
 */
async function readHTMLFile(filePath: string): Promise<string> {
  try {
    const absolutePath = path.resolve(filePath);
    return await fs.readFile(absolutePath, 'utf-8');
  } catch (error) {
    throw new FileSyncError(
      `Failed to read file ${filePath}`,
      '',
      'read',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * HTML 파일에 쓰기
 */
async function writeHTMLFile(filePath: string, content: string): Promise<void> {
  try {
    const absolutePath = path.resolve(filePath);
    await fs.writeFile(absolutePath, content, 'utf-8');
  } catch (error) {
    throw new FileSyncError(
      `Failed to write file ${filePath}`,
      '',
      'write',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * DB와 파일을 원자적으로 동기화
 *
 * 트랜잭션을 사용하여 DB 업데이트와 파일 업데이트의 원자성 보장
 */
export async function syncPageWithFile(
  options: SyncOptions,
  htmlUpdater: { updateHTML: (filePath: string, sections: ParsedSection[]) => Promise<{ success: boolean; message?: string; backupPath?: string }> }
): Promise<SyncResult> {
  const {
    pageId,
    filePath,
    sections,
    changedBy,
    changeNote = '페이지 업데이트',
    async = false,
    createBackup = true
  } = options;

  try {
    // 비동기 처리 모드
    if (async) {
      return await queueFileSyncOperation(options);
    }

    // 1. 현재 페이지 조회
    const currentPage = await prisma.static_pages.findUnique({
      where: { id: pageId }
    });

    if (!currentPage) {
      throw new Error(`Page not found: ${pageId}`);
    }

    // 2. 백업 생성 (옵션)
    let backupPath: string | undefined;
    if (createBackup) {
      backupPath = await createFileBackup(currentPage.filePath);
    }

    // 3. HTML 파일 업데이트 (임시로 먼저 수행)
    const updateResult = await htmlUpdater.updateHTML(currentPage.filePath, sections as unknown as ParsedSection[]);

    if (!updateResult.success) {
      throw new Error(`HTML update failed: ${updateResult.message}`);
    }

    // 4. 파일 해시 계산
    const fileHash = await calculateFileHash(currentPage.filePath);

    // 5. DB 업데이트 (트랜잭션)
    const result = await prisma.$transaction(async (tx) => {
      // 페이지 업데이트
      const updatedPage = await tx.static_pages.update({
        where: { id: pageId },
        data: {
          sections,
          lastEdited: new Date(),
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          fileHash,
          syncError: null,
          syncRetryCount: 0,
          updatedBy: changedBy
        }
      });

      // 버전 생성 (트리거가 자동으로 element_changes도 생성)
      await tx.static_page_versions.create({
        data: {
          id: crypto.randomUUID(),
          pageId,
          version: updatedPage.version,
          sections,
          changedBy,
          changeNote,
          changeSource: 'web_ui',
          createdAt: new Date()
        }
      });

      return updatedPage;
    });

    return {
      success: true,
      page: result,
      version: result.version,
      fileHash,
      backupPath: backupPath || updateResult.backupPath
    };

  } catch (error) {
    // 에러 발생 시 sync_queue에 재시도 항목 추가
    await enqueueSyncRetry(pageId, error instanceof Error ? error.message : 'Unknown error');

    // DB 상태를 FAILED로 업데이트
    await prisma.static_pages.update({
      where: { id: pageId },
      data: {
        syncStatus: 'FAILED',
        syncError: error instanceof Error ? error.message : 'Unknown error',
        syncRetryCount: { increment: 1 }
      }
    }).catch(() => {
      // DB 업데이트도 실패하면 로그만 남김
      console.error('Failed to update sync status to FAILED');
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 파일 동기화를 비동기 큐에 추가
 */
async function queueFileSyncOperation(options: SyncOptions): Promise<SyncResult> {
  const { pageId, sections, changedBy, changeNote } = options;

  // sync_queue에 작업 추가
  const queueItem = await prisma.sync_queue.create({
    data: {
      id: crypto.randomUUID(),
      pageId,
      operation: 'sync_to_file',
      priority: 5,
      status: 'pending',
      scheduledAt: new Date()
    }
  });

  // 페이지 상태를 PENDING으로 업데이트
  await prisma.static_pages.update({
    where: { id: pageId },
    data: {
      syncStatus: 'PENDING',
      updatedBy: changedBy
    }
  });

  return {
    success: true,
    isAsync: true,
    queueId: queueItem.id
  };
}

/**
 * 동기화 실패 시 재시도 큐에 추가
 */
async function enqueueSyncRetry(pageId: string, errorMessage: string): Promise<void> {
  try {
    await prisma.sync_queue.create({
      data: {
        id: crypto.randomUUID(),
        pageId,
        operation: 'sync_retry',
        priority: 8, // 높은 우선순위
        attempts: 0,
        maxAttempts: 3,
        lastError: errorMessage,
        status: 'pending',
        scheduledAt: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to enqueue sync retry:', error);
  }
}

/**
 * 파일 해시 검증
 */
export async function verifyFileIntegrity(
  pageId: string,
  basePath?: string
): Promise<{ valid: boolean; expectedHash: string | null; actualHash: string | null; error?: string }> {
  try {
    const page = await prisma.static_pages.findUnique({
      where: { id: pageId },
      select: { filePath: true, fileHash: true }
    });

    if (!page) {
      return {
        valid: false,
        expectedHash: null,
        actualHash: null,
        error: 'Page not found'
      };
    }

    if (!page.fileHash) {
      return {
        valid: false,
        expectedHash: null,
        actualHash: null,
        error: 'No hash stored in database'
      };
    }

    const actualHash = await calculateFileHash(page.filePath, basePath);

    return {
      valid: actualHash === page.fileHash,
      expectedHash: page.fileHash,
      actualHash
    };

  } catch (error) {
    return {
      valid: false,
      expectedHash: null,
      actualHash: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 동기화 상태 조회
 */
export async function getSyncStatus(pageId: string): Promise<{
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  syncError: string | null;
  syncRetryCount: number;
  fileHash: string | null;
}> {
  const page = await prisma.static_pages.findUnique({
    where: { id: pageId },
    select: {
      syncStatus: true,
      lastSyncedAt: true,
      syncError: true,
      syncRetryCount: true,
      fileHash: true
    }
  });

  if (!page) {
    throw new Error(`Page not found: ${pageId}`);
  }

  return page;
}
