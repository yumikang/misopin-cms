#!/usr/bin/env tsx
/**
 * Phase 2 통합 테스트
 *
 * Optimistic Locking, Edit Lock, File Sync의 통합 동작 검증
 */

import { PrismaClient } from '@prisma/client';
import {
  updatePageWithVersion,
  getCurrentVersion,
  checkVersionConflict,
  OptimisticLockError
} from '../lib/static-pages/optimistic-locking';
import {
  acquireEditLock,
  renewEditLock,
  releaseEditLock,
  checkLockStatus,
  cleanupExpiredLocks,
  LockAcquisitionError
} from '../lib/static-pages/edit-lock';
import {
  syncPageWithFile,
  calculateFileHash,
  verifyFileIntegrity,
  getSyncStatus
} from '../lib/static-pages/file-sync';
import { HTMLUpdater } from '../lib/static-pages/html-updater';
import path from 'path';

const prisma = new PrismaClient();
const STATIC_SITE_PATH = process.env.STATIC_PAGES_DIR || path.join(process.cwd(), '../Misopin-renew');
const htmlUpdater = new HTMLUpdater(STATIC_SITE_PATH);

/**
 * 테스트 결과
 */
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

/**
 * 테스트 실행 헬퍼
 */
async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  console.log(`\n🧪 ${name}`);

  try {
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`   ✅ PASSED (${duration}ms)`);
    results.push({ name, passed: true, duration });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ FAILED: ${errorMessage}`);
    results.push({ name, passed: false, error: errorMessage, duration });
  }
}

/**
 * 테스트 1: Optimistic Locking - Version 증가
 */
async function testOptimisticLockingVersionIncrement(): Promise<void> {
  const page = await prisma.static_pages.findFirst();
  if (!page) throw new Error('No pages found');

  const initialVersion = page.version;

  const result = await updatePageWithVersion(page.id, {
    data: { title: `Test ${Date.now()}` },
    expectedVersion: initialVersion
  });

  if (!result.success) throw new Error('Update failed');
  if (result.version !== initialVersion + 1) {
    throw new Error(`Expected version ${initialVersion + 1}, got ${result.version}`);
  }
}

/**
 * 테스트 2: Optimistic Locking - Version 충돌 감지
 */
async function testOptimisticLockingConflictDetection(): Promise<void> {
  const page = await prisma.static_pages.findFirst();
  if (!page) throw new Error('No pages found');

  const currentVersion = await getCurrentVersion(page.id);

  // 잘못된 version으로 업데이트 시도
  const result = await updatePageWithVersion(page.id, {
    data: { title: `Conflict test ${Date.now()}` },
    expectedVersion: currentVersion - 1, // 이전 버전
    maxRetries: 0
  });

  if (result.success) {
    throw new Error('Expected conflict but update succeeded');
  }

  if (!(result.error instanceof OptimisticLockError)) {
    throw new Error('Expected OptimisticLockError');
  }
}

/**
 * 테스트 3: Edit Lock - 잠금 획득
 */
async function testEditLockAcquisition(): Promise<void> {
  const page = await prisma.static_pages.findFirst();
  if (!page) throw new Error('No pages found');

  const result = await acquireEditLock({
    pageId: page.id,
    userId: 'test-user-1',
    lockDuration: 60000 // 1분
  });

  if (!result.success) {
    throw new Error(`Failed to acquire lock: ${result.error}`);
  }

  if (!result.lockInfo.isLocked) {
    throw new Error('Lock is not active');
  }

  if (result.lockInfo.lockedBy !== 'test-user-1') {
    throw new Error('Lock owner mismatch');
  }

  // 정리
  await releaseEditLock({ pageId: page.id, userId: 'test-user-1' });
}

/**
 * 테스트 4: Edit Lock - 충돌 감지
 */
async function testEditLockConflict(): Promise<void> {
  const page = await prisma.static_pages.findFirst();
  if (!page) throw new Error('No pages found');

  // User 1이 잠금 획득
  await acquireEditLock({
    pageId: page.id,
    userId: 'test-user-1',
    lockDuration: 60000
  });

  // User 2가 잠금 시도 (실패해야 함)
  const result = await acquireEditLock({
    pageId: page.id,
    userId: 'test-user-2',
    lockDuration: 60000
  });

  if (result.success) {
    throw new Error('Expected lock conflict but succeeded');
  }

  // 정리
  await releaseEditLock({ pageId: page.id, userId: 'test-user-1' });
}

/**
 * 테스트 5: Edit Lock - 갱신 (Heartbeat)
 */
async function testEditLockRenewal(): Promise<void> {
  const page = await prisma.static_pages.findFirst();
  if (!page) throw new Error('No pages found');

  // 잠금 획득
  const acquireResult = await acquireEditLock({
    pageId: page.id,
    userId: 'test-user-1',
    lockDuration: 5000 // 5초
  });

  if (!acquireResult.success) {
    throw new Error('Failed to acquire lock');
  }

  const initialExpiry = acquireResult.lockInfo.lockExpiry;

  // 잠금 갱신
  const renewResult = await renewEditLock({
    pageId: page.id,
    userId: 'test-user-1',
    lockDuration: 60000 // 1분으로 연장
  });

  if (!renewResult.success) {
    throw new Error('Failed to renew lock');
  }

  if (!renewResult.lockInfo.lockExpiry) {
    throw new Error('Lock expiry not set');
  }

  if (renewResult.lockInfo.lockExpiry <= (initialExpiry || new Date())) {
    throw new Error('Lock expiry was not extended');
  }

  // 정리
  await releaseEditLock({ pageId: page.id, userId: 'test-user-1' });
}

/**
 * 테스트 6: Edit Lock - 만료된 잠금 정리
 */
async function testEditLockExpiry(): Promise<void> {
  const page = await prisma.static_pages.findFirst();
  if (!page) throw new Error('No pages found');

  // 짧은 시간의 잠금 생성
  await prisma.static_pages.update({
    where: { id: page.id },
    data: {
      lockStatus: 'LOCKED',
      lockedBy: 'test-user-expired',
      lockedAt: new Date(Date.now() - 60000), // 1분 전
      lockExpiry: new Date(Date.now() - 1000) // 1초 전 (이미 만료)
    }
  });

  // 만료된 잠금 정리
  const result = await cleanupExpiredLocks();

  if (result.cleaned === 0) {
    throw new Error('Expected at least 1 expired lock to be cleaned');
  }

  // 잠금이 해제되었는지 확인
  const lockInfo = await checkLockStatus(page.id, 'test-user-new');

  if (!lockInfo.canEdit) {
    throw new Error('Expected to be able to edit after cleanup');
  }
}

/**
 * 테스트 7: File Sync - 해시 계산
 */
async function testFileSyncHashCalculation(): Promise<void> {
  const page = await prisma.static_pages.findFirst();
  if (!page) throw new Error('No pages found');

  const hash1 = await calculateFileHash(page.filePath, STATIC_SITE_PATH);

  if (!hash1 || hash1.length !== 64) { // SHA-256 = 64 hex chars
    throw new Error('Invalid hash format');
  }

  // 같은 파일의 해시는 동일해야 함
  const hash2 = await calculateFileHash(page.filePath, STATIC_SITE_PATH);

  if (hash1 !== hash2) {
    throw new Error('Hash mismatch for same file');
  }
}

/**
 * 테스트 8: File Sync - 무결성 검증
 */
async function testFileSyncIntegrityVerification(): Promise<void> {
  const page = await prisma.static_pages.findFirst();
  if (!page) throw new Error('No pages found');

  // 현재 파일 해시 계산 및 저장
  const currentHash = await calculateFileHash(page.filePath, STATIC_SITE_PATH);

  await prisma.static_pages.update({
    where: { id: page.id },
    data: { fileHash: currentHash }
  });

  // 무결성 검증
  const verifyResult = await verifyFileIntegrity(page.id, STATIC_SITE_PATH);

  if (!verifyResult.valid) {
    throw new Error(`File integrity check failed: ${verifyResult.error}`);
  }

  if (verifyResult.expectedHash !== verifyResult.actualHash) {
    throw new Error('Hash mismatch');
  }
}

/**
 * 테스트 9: 동시성 시나리오 - Optimistic Lock + Edit Lock 조합
 */
async function testConcurrentEditingScenario(): Promise<void> {
  const page = await prisma.static_pages.findFirst();
  if (!page) throw new Error('No pages found');

  // 1. User 1이 Edit Lock 획득
  const lockResult = await acquireEditLock({
    pageId: page.id,
    userId: 'user1',
    lockDuration: 60000
  });

  if (!lockResult.success) {
    throw new Error('User 1 failed to acquire lock');
  }

  // 2. User 1이 페이지 업데이트 (Optimistic Locking으로)
  const version1 = await getCurrentVersion(page.id);

  const updateResult = await updatePageWithVersion(page.id, {
    data: { title: `Update by user1 ${Date.now()}` },
    expectedVersion: version1
  });

  if (!updateResult.success) {
    throw new Error('User 1 failed to update');
  }

  // 3. User 2가 잠금 획득 시도 (실패해야 함)
  const conflictResult = await acquireEditLock({
    pageId: page.id,
    userId: 'user2',
    lockDuration: 60000
  });

  if (conflictResult.success) {
    throw new Error('User 2 should not be able to acquire lock');
  }

  // 4. User 1이 잠금 해제
  await releaseEditLock({ pageId: page.id, userId: 'user1' });

  // 5. User 2가 잠금 획득 (이제 성공해야 함)
  const lock2Result = await acquireEditLock({
    pageId: page.id,
    userId: 'user2',
    lockDuration: 60000
  });

  if (!lock2Result.success) {
    throw new Error('User 2 failed to acquire lock after user 1 released');
  }

  // 정리
  await releaseEditLock({ pageId: page.id, userId: 'user2' });
}

/**
 * 테스트 실행
 */
async function runAllTests(): Promise<void> {
  console.log('🚀 Phase 2 통합 테스트 시작\n');
  console.log('='.repeat(60));

  await runTest('1. Optimistic Locking - Version 자동 증가', testOptimisticLockingVersionIncrement);
  await runTest('2. Optimistic Locking - Version 충돌 감지', testOptimisticLockingConflictDetection);
  await runTest('3. Edit Lock - 잠금 획득', testEditLockAcquisition);
  await runTest('4. Edit Lock - 충돌 감지', testEditLockConflict);
  await runTest('5. Edit Lock - 잠금 갱신 (Heartbeat)', testEditLockRenewal);
  await runTest('6. Edit Lock - 만료된 잠금 정리', testEditLockExpiry);
  await runTest('7. File Sync - 해시 계산', testFileSyncHashCalculation);
  await runTest('8. File Sync - 무결성 검증', testFileSyncIntegrityVerification);
  await runTest('9. 동시성 시나리오 - Optimistic + Edit Lock 조합', testConcurrentEditingScenario);

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 테스트 결과 요약:\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  console.log(`   ✅ 통과: ${passed}/${results.length}`);
  console.log(`   ❌ 실패: ${failed}/${results.length}`);
  console.log(`   ⏱️  총 소요 시간: ${totalDuration}ms\n`);

  if (failed > 0) {
    console.log('실패한 테스트:\n');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`   ❌ ${r.name}`);
        console.log(`      ${r.error}\n`);
      });
  }

  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 모든 테스트 통과!\n');
  } else {
    console.log(`\n💥 ${failed}개 테스트 실패\n`);
    process.exit(1);
  }
}

// 테스트 실행
runAllTests()
  .catch(error => {
    console.error('💥 테스트 실행 중 치명적 오류:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
