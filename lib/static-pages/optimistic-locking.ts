/**
 * Optimistic Locking Service
 *
 * 동시 편집 충돌 방지를 위한 Optimistic Locking 구현
 * - Version 기반 충돌 감지
 * - 자동 재시도 로직
 * - 충돌 해결 전략
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Optimistic Locking 에러
 */
export class OptimisticLockError extends Error {
  constructor(
    message: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number,
    public readonly pageId: string
  ) {
    super(message);
    this.name = 'OptimisticLockError';
  }
}

/**
 * 업데이트 옵션
 */
export interface UpdateWithVersionOptions<T> {
  /** 업데이트할 데이터 */
  data: T;
  /** 기대하는 version */
  expectedVersion: number;
  /** 재시도 횟수 (기본: 3) */
  maxRetries?: number;
  /** 재시도 간격 ms (기본: 100) */
  retryDelay?: number;
  /** 충돌 시 자동 병합 여부 (기본: false) */
  autoMerge?: boolean;
}

/**
 * 업데이트 결과
 */
export interface UpdateResult<T> {
  /** 업데이트 성공 여부 */
  success: boolean;
  /** 업데이트된 데이터 */
  data?: T;
  /** 새로운 version */
  version?: number;
  /** 에러 정보 */
  error?: OptimisticLockError;
  /** 재시도 횟수 */
  retryCount?: number;
}

/**
 * 페이지 업데이트용 데이터 타입
 */
export type StaticPageUpdateData = Omit<
  Prisma.static_pagesUpdateInput,
  'version' | 'updatedAt' | 'static_page_versions' | 'editable_elements' | 'element_changes' | 'sync_queue'
>;

/**
 * Optimistic Locking을 사용한 페이지 업데이트
 *
 * @param pageId 페이지 ID
 * @param options 업데이트 옵션
 * @returns 업데이트 결과
 */
export async function updatePageWithVersion(
  pageId: string,
  options: UpdateWithVersionOptions<StaticPageUpdateData>
): Promise<UpdateResult<Prisma.static_pagesGetPayload<object>>> {
  const {
    data,
    expectedVersion,
    maxRetries = 3,
    retryDelay = 100,
    autoMerge = false
  } = options;

  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      // 1. 현재 페이지 조회 (version 확인)
      const currentPage = await prisma.static_pages.findUnique({
        where: { id: pageId }
      });

      if (!currentPage) {
        throw new Error(`Page not found: ${pageId}`);
      }

      // 2. Version 충돌 검사
      if (currentPage.version !== expectedVersion) {
        if (retryCount < maxRetries) {
          // 재시도
          retryCount++;
          await sleep(retryDelay * retryCount); // Exponential backoff
          continue;
        } else {
          // 재시도 횟수 초과
          throw new OptimisticLockError(
            `Version conflict: expected ${expectedVersion}, but current is ${currentPage.version}`,
            expectedVersion,
            currentPage.version,
            pageId
          );
        }
      }

      // 3. 업데이트 실행 (PostgreSQL 트리거가 version을 자동으로 +1)
      const updatedPage = await prisma.static_pages.update({
        where: {
          id: pageId,
          version: expectedVersion // WHERE 조건에 version 포함 (원자적 검사)
        },
        data: {
          ...data,
          updatedAt: new Date() // 명시적으로 updatedAt 설정
        }
      });

      return {
        success: true,
        data: updatedPage,
        version: updatedPage.version,
        retryCount
      };

    } catch (error) {
      // Prisma P2025 에러: Record not found (version 불일치로 인한)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        if (retryCount < maxRetries) {
          retryCount++;
          await sleep(retryDelay * retryCount);
          continue;
        }

        // 현재 버전 다시 조회
        const currentPage = await prisma.static_pages.findUnique({
          where: { id: pageId }
        });

        const optimisticError = new OptimisticLockError(
          `Version conflict detected during update`,
          expectedVersion,
          currentPage?.version ?? -1,
          pageId
        );

        return {
          success: false,
          error: optimisticError,
          retryCount
        };
      }

      // OptimisticLockError인 경우
      if (error instanceof OptimisticLockError) {
        return {
          success: false,
          error,
          retryCount
        };
      }

      // 기타 에러는 다시 throw
      throw error;
    }
  }

  // 여기 도달하면 재시도 초과
  const currentPage = await prisma.static_pages.findUnique({
    where: { id: pageId }
  });

  return {
    success: false,
    error: new OptimisticLockError(
      `Failed after ${maxRetries} retries`,
      expectedVersion,
      currentPage?.version ?? -1,
      pageId
    ),
    retryCount
  };
}

/**
 * 현재 페이지의 version 조회
 */
export async function getCurrentVersion(pageId: string): Promise<number> {
  const page = await prisma.static_pages.findUnique({
    where: { id: pageId },
    select: { version: true }
  });

  if (!page) {
    throw new Error(`Page not found: ${pageId}`);
  }

  return page.version;
}

/**
 * Version 충돌 감지
 */
export async function checkVersionConflict(
  pageId: string,
  expectedVersion: number
): Promise<{ hasConflict: boolean; currentVersion: number }> {
  const currentVersion = await getCurrentVersion(pageId);

  return {
    hasConflict: currentVersion !== expectedVersion,
    currentVersion
  };
}

/**
 * Sleep 유틸리티
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 충돌 발생 시 최신 데이터와 비교하여 병합 가능 여부 판단
 */
export async function canAutoMerge(
  pageId: string,
  localChanges: Partial<StaticPageUpdateData>
): Promise<{ canMerge: boolean; conflicts: string[] }> {
  const currentPage = await prisma.static_pages.findUnique({
    where: { id: pageId }
  });

  if (!currentPage) {
    throw new Error(`Page not found: ${pageId}`);
  }

  const conflicts: string[] = [];

  // 변경된 필드 확인
  const changedFields = Object.keys(localChanges) as Array<keyof StaticPageUpdateData>;

  for (const field of changedFields) {
    // sections 같은 복잡한 필드는 자동 병합 불가
    if (field === 'sections') {
      conflicts.push('sections');
    }
  }

  return {
    canMerge: conflicts.length === 0,
    conflicts
  };
}

/**
 * Version 충돌 발생 시 클라이언트에 반환할 에러 응답 생성
 */
export function createVersionConflictResponse(error: OptimisticLockError): {
  error: string;
  code: string;
  expectedVersion: number;
  currentVersion: number;
  pageId: string;
} {
  return {
    error: error.message,
    code: 'VERSION_CONFLICT',
    expectedVersion: error.expectedVersion,
    currentVersion: error.actualVersion,
    pageId: error.pageId
  };
}
