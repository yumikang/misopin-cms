/**
 * Edit Lock Service
 *
 * 편집 잠금 관리 (Pessimistic Locking)
 * - 페이지 편집 시작 시 잠금 획득
 * - 잠금 갱신 (heartbeat)
 * - 잠금 해제
 * - 만료된 잠금 자동 정리
 */

import { PrismaClient, LockStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 잠금 획득 실패 에러
 */
export class LockAcquisitionError extends Error {
  constructor(
    message: string,
    public readonly pageId: string,
    public readonly lockedBy: string | null,
    public readonly lockedAt: Date | null
  ) {
    super(message);
    this.name = 'LockAcquisitionError';
  }
}

/**
 * 잠금 획득 옵션
 */
export interface AcquireLockOptions {
  /** 페이지 ID */
  pageId: string;
  /** 잠금을 요청하는 사용자 ID */
  userId: string;
  /** 잠금 유지 시간 (밀리초, 기본: 5분) */
  lockDuration?: number;
  /** 이미 잠긴 경우 강제 획득 여부 (기본: false) */
  force?: boolean;
}

/**
 * 잠금 갱신 옵션
 */
export interface RenewLockOptions {
  /** 페이지 ID */
  pageId: string;
  /** 사용자 ID */
  userId: string;
  /** 추가 잠금 시간 (밀리초, 기본: 5분) */
  lockDuration?: number;
}

/**
 * 잠금 해제 옵션
 */
export interface ReleaseLockOptions {
  /** 페이지 ID */
  pageId: string;
  /** 사용자 ID */
  userId: string;
  /** 강제 해제 여부 (다른 사용자 잠금도 해제, 기본: false) */
  force?: boolean;
}

/**
 * 잠금 정보
 */
export interface LockInfo {
  /** 잠금 상태 */
  status: LockStatus;
  /** 잠금한 사용자 ID */
  lockedBy: string | null;
  /** 잠금 시작 시각 */
  lockedAt: Date | null;
  /** 잠금 만료 시각 */
  lockExpiry: Date | null;
  /** 잠금 중인지 여부 */
  isLocked: boolean;
  /** 만료되었는지 여부 */
  isExpired: boolean;
}

/**
 * 기본 잠금 유지 시간 (5분)
 */
const DEFAULT_LOCK_DURATION = 5 * 60 * 1000;

/**
 * 페이지 편집 잠금 획득
 */
export async function acquireEditLock(
  options: AcquireLockOptions
): Promise<{ success: boolean; lockInfo: LockInfo; error?: string }> {
  const {
    pageId,
    userId,
    lockDuration = DEFAULT_LOCK_DURATION,
    force = false
  } = options;

  try {
    // 1. 현재 잠금 상태 확인
    const currentLock = await getLockInfo(pageId);

    // 2. 이미 같은 사용자가 잠금 중이면 갱신
    if (currentLock.isLocked && currentLock.lockedBy === userId) {
      return await renewEditLock({ pageId, userId, lockDuration });
    }

    // 3. 다른 사용자가 잠금 중이고 만료되지 않았으면 실패
    if (currentLock.isLocked && !currentLock.isExpired && !force) {
      throw new LockAcquisitionError(
        `Page is locked by another user`,
        pageId,
        currentLock.lockedBy,
        currentLock.lockedAt
      );
    }

    // 4. 잠금 획득 (만료된 잠금이거나 force=true인 경우)
    const now = new Date();
    const expiry = new Date(now.getTime() + lockDuration);

    const updatedPage = await prisma.static_pages.update({
      where: { id: pageId },
      data: {
        lockStatus: 'LOCKED',
        lockedBy: userId,
        lockedAt: now,
        lockExpiry: expiry
      },
      select: {
        lockStatus: true,
        lockedBy: true,
        lockedAt: true,
        lockExpiry: true
      }
    });

    const lockInfo = toLockInfo(updatedPage);

    return {
      success: true,
      lockInfo
    };

  } catch (error) {
    if (error instanceof LockAcquisitionError) {
      return {
        success: false,
        lockInfo: await getLockInfo(pageId),
        error: error.message
      };
    }
    throw error;
  }
}

/**
 * 편집 잠금 갱신 (heartbeat)
 */
export async function renewEditLock(
  options: RenewLockOptions
): Promise<{ success: boolean; lockInfo: LockInfo; error?: string }> {
  const {
    pageId,
    userId,
    lockDuration = DEFAULT_LOCK_DURATION
  } = options;

  try {
    // 1. 현재 잠금 상태 확인
    const currentLock = await getLockInfo(pageId);

    // 2. 잠금이 없거나 다른 사용자의 잠금이면 실패
    if (!currentLock.isLocked || currentLock.lockedBy !== userId) {
      throw new Error(`Cannot renew lock: not locked by ${userId}`);
    }

    // 3. 잠금 갱신
    const now = new Date();
    const expiry = new Date(now.getTime() + lockDuration);

    const updatedPage = await prisma.static_pages.update({
      where: {
        id: pageId,
        lockedBy: userId // WHERE 조건에 포함하여 원자성 보장
      },
      data: {
        lockStatus: 'LOCKED',
        lockExpiry: expiry
      },
      select: {
        lockStatus: true,
        lockedBy: true,
        lockedAt: true,
        lockExpiry: true
      }
    });

    const lockInfo = toLockInfo(updatedPage);

    return {
      success: true,
      lockInfo
    };

  } catch (error) {
    return {
      success: false,
      lockInfo: await getLockInfo(pageId),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 편집 잠금 해제
 */
export async function releaseEditLock(
  options: ReleaseLockOptions
): Promise<{ success: boolean; lockInfo: LockInfo; error?: string }> {
  const { pageId, userId, force = false } = options;

  try {
    // 1. 현재 잠금 상태 확인
    const currentLock = await getLockInfo(pageId);

    // 2. 잠금이 없으면 성공 반환
    if (!currentLock.isLocked) {
      return {
        success: true,
        lockInfo: currentLock
      };
    }

    // 3. 다른 사용자의 잠금인 경우 force=false면 실패
    if (currentLock.lockedBy !== userId && !force) {
      throw new Error(`Cannot release lock: locked by ${currentLock.lockedBy}`);
    }

    // 4. 잠금 해제
    const updatedPage = await prisma.static_pages.update({
      where: { id: pageId },
      data: {
        lockStatus: 'UNLOCKED',
        lockedBy: null,
        lockedAt: null,
        lockExpiry: null
      },
      select: {
        lockStatus: true,
        lockedBy: true,
        lockedAt: true,
        lockExpiry: true
      }
    });

    const lockInfo = toLockInfo(updatedPage);

    return {
      success: true,
      lockInfo
    };

  } catch (error) {
    return {
      success: false,
      lockInfo: await getLockInfo(pageId),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 잠금 정보 조회
 */
export async function getLockInfo(pageId: string): Promise<LockInfo> {
  const page = await prisma.static_pages.findUnique({
    where: { id: pageId },
    select: {
      lockStatus: true,
      lockedBy: true,
      lockedAt: true,
      lockExpiry: true
    }
  });

  if (!page) {
    throw new Error(`Page not found: ${pageId}`);
  }

  return toLockInfo(page);
}

/**
 * 만료된 잠금 자동 정리
 */
export async function cleanupExpiredLocks(): Promise<{ cleaned: number }> {
  const result = await prisma.static_pages.updateMany({
    where: {
      lockStatus: 'LOCKED',
      lockExpiry: {
        lt: new Date() // 만료 시각이 현재보다 과거
      }
    },
    data: {
      lockStatus: 'EXPIRED',
      lockedBy: null,
      lockedAt: null,
      lockExpiry: null
    }
  });

  return { cleaned: result.count };
}

/**
 * 특정 사용자의 모든 잠금 해제 (로그아웃 시 사용)
 */
export async function releaseAllLocksForUser(userId: string): Promise<{ released: number }> {
  const result = await prisma.static_pages.updateMany({
    where: {
      lockStatus: 'LOCKED',
      lockedBy: userId
    },
    data: {
      lockStatus: 'UNLOCKED',
      lockedBy: null,
      lockedAt: null,
      lockExpiry: null
    }
  });

  return { released: result.count };
}

/**
 * 내부 헬퍼: DB 결과를 LockInfo로 변환
 */
function toLockInfo(page: {
  lockStatus: LockStatus;
  lockedBy: string | null;
  lockedAt: Date | null;
  lockExpiry: Date | null;
}): LockInfo {
  const now = new Date();
  const isExpired = page.lockExpiry ? page.lockExpiry < now : false;

  return {
    status: page.lockStatus,
    lockedBy: page.lockedBy,
    lockedAt: page.lockedAt,
    lockExpiry: page.lockExpiry,
    isLocked: page.lockStatus === 'LOCKED' && !isExpired,
    isExpired
  };
}

/**
 * 잠금 상태 체크 (클라이언트 폴링용)
 */
export async function checkLockStatus(pageId: string, userId: string): Promise<{
  canEdit: boolean;
  lockInfo: LockInfo;
  message?: string;
}> {
  const lockInfo = await getLockInfo(pageId);

  // 잠금 없음 - 편집 가능
  if (!lockInfo.isLocked) {
    return {
      canEdit: true,
      lockInfo,
      message: 'Page is available for editing'
    };
  }

  // 본인이 잠금 - 편집 가능
  if (lockInfo.lockedBy === userId) {
    return {
      canEdit: true,
      lockInfo,
      message: 'You have the edit lock'
    };
  }

  // 다른 사용자가 잠금 - 편집 불가
  return {
    canEdit: false,
    lockInfo,
    message: `Page is locked by ${lockInfo.lockedBy}`
  };
}
