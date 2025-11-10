#!/usr/bin/env tsx
/**
 * Sync Queue Worker
 *
 * sync_queue 테이블의 pending 작업을 처리하는 백그라운드 워커
 *
 * 실행 방법:
 * - 개발: npm run worker:sync
 * - 프로덕션: pm2 start scripts/sync-queue-worker.ts --name sync-worker
 * - Docker: docker exec cms-app npm run worker:sync
 */

import { PrismaClient, SyncStatus } from '@prisma/client';
import { syncPageWithFile } from '../lib/static-pages/file-sync';
import { HTMLUpdater } from '../lib/static-pages/html-updater';
import { parseSectionsFromJson } from '../lib/static-pages/types';
import path from 'path';

const prisma = new PrismaClient();

/**
 * 워커 설정
 */
const WORKER_CONFIG = {
  /** 폴링 간격 (밀리초) */
  POLL_INTERVAL: 5000,
  /** 한 번에 처리할 최대 작업 수 */
  BATCH_SIZE: 10,
  /** 최대 재시도 횟수 */
  MAX_RETRIES: 3,
  /** 재시도 대기 시간 (밀리초) */
  RETRY_DELAY: 60000,
  /** 오래된 작업 정리 기준 (일) */
  CLEANUP_DAYS: 7,
  /** graceful shutdown 대기 시간 (밀리초) */
  SHUTDOWN_TIMEOUT: 30000
};

/**
 * 워커 상태
 */
let isRunning = true;
let isProcessing = false;

/**
 * HTML Updater 인스턴스
 */
const STATIC_SITE_PATH = process.env.STATIC_PAGES_DIR || path.join(process.cwd(), '../Misopin-renew');
const htmlUpdater = new HTMLUpdater(STATIC_SITE_PATH);

/**
 * 메인 워커 루프
 */
async function workerLoop(): Promise<void> {
  console.log('🚀 Sync Queue Worker started');
  console.log(`📊 Config: Poll interval=${WORKER_CONFIG.POLL_INTERVAL}ms, Batch size=${WORKER_CONFIG.BATCH_SIZE}`);

  while (isRunning) {
    try {
      await processQueue();
      await cleanupOldJobs();

      // 다음 폴링까지 대기
      await sleep(WORKER_CONFIG.POLL_INTERVAL);

    } catch (error) {
      console.error('❌ Worker loop error:', error);
      // 에러 발생 시 더 긴 대기 시간
      await sleep(WORKER_CONFIG.POLL_INTERVAL * 2);
    }
  }

  console.log('🛑 Sync Queue Worker stopped');
}

/**
 * 큐 처리
 */
async function processQueue(): Promise<void> {
  if (isProcessing) {
    // 이전 처리가 아직 진행 중이면 스킵
    return;
  }

  isProcessing = true;

  try {
    // 1. pending 상태의 작업 조회 (우선순위, 스케줄 순)
    const pendingJobs = await prisma.sync_queue.findMany({
      where: {
        status: 'pending',
        attempts: {
          lt: WORKER_CONFIG.MAX_RETRIES
        }
      },
      orderBy: [
        { priority: 'asc' }, // 낮은 숫자 = 높은 우선순위
        { scheduledAt: 'asc' }
      ],
      take: WORKER_CONFIG.BATCH_SIZE,
      include: {
        page: true
      }
    });

    if (pendingJobs.length === 0) {
      return;
    }

    console.log(`📦 Processing ${pendingJobs.length} jobs...`);

    // 2. 각 작업 처리
    for (const job of pendingJobs) {
      try {
        await processJob(job);
      } catch (error) {
        console.error(`❌ Job ${job.id} failed:`, error);
      }
    }

  } finally {
    isProcessing = false;
  }
}

/**
 * 개별 작업 처리
 */
async function processJob(job: {
  id: string;
  pageId: string;
  operation: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  page: {
    id: string;
    filePath: string;
    sections: unknown;
  };
}): Promise<void> {
  const startTime = Date.now();

  console.log(`⚙️  Processing job ${job.id} (${job.operation}) for page ${job.pageId}`);

  // 1. 작업 상태를 processing으로 변경
  await prisma.sync_queue.update({
    where: { id: job.id },
    data: {
      status: 'processing',
      attempts: { increment: 1 }
    }
  });

  // 2. 페이지 상태를 IN_PROGRESS로 변경
  await prisma.static_pages.update({
    where: { id: job.pageId },
    data: { syncStatus: 'IN_PROGRESS' }
  });

  try {
    // 3. 작업 실행
    if (job.operation === 'sync_to_file' || job.operation === 'sync_retry') {
      const sections = parseSectionsFromJson(job.page.sections);

      const result = await syncPageWithFile(
        {
          pageId: job.pageId,
          filePath: job.page.filePath,
          sections: job.page.sections,
          changedBy: 'sync-worker',
          changeNote: `Auto-sync by worker (job ${job.id})`,
          async: false, // 워커에서는 동기 실행
          createBackup: true
        },
        htmlUpdater
      );

      if (!result.success) {
        throw new Error(result.error || 'Sync failed');
      }

      console.log(`✅ Job ${job.id} completed in ${Date.now() - startTime}ms`);

      // 4. 작업 완료 처리
      await prisma.sync_queue.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          processedAt: new Date(),
          lastError: null
        }
      });

    } else {
      throw new Error(`Unknown operation: ${job.operation}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Job ${job.id} failed:`, errorMessage);

    // 5. 재시도 가능 여부 확인
    const shouldRetry = job.attempts < job.maxAttempts;

    if (shouldRetry) {
      // 재시도 대기열로 이동
      await prisma.sync_queue.update({
        where: { id: job.id },
        data: {
          status: 'pending',
          lastError: errorMessage,
          scheduledAt: new Date(Date.now() + WORKER_CONFIG.RETRY_DELAY)
        }
      });

      // 페이지 상태를 PENDING으로 변경
      await prisma.static_pages.update({
        where: { id: job.pageId },
        data: {
          syncStatus: 'PENDING',
          syncError: errorMessage,
          syncRetryCount: { increment: 1 }
        }
      });

      console.log(`🔄 Job ${job.id} scheduled for retry (attempt ${job.attempts + 1}/${job.maxAttempts})`);

    } else {
      // 재시도 횟수 초과 - failed 처리
      await prisma.sync_queue.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          lastError: errorMessage,
          processedAt: new Date()
        }
      });

      // 페이지 상태를 FAILED로 변경
      await prisma.static_pages.update({
        where: { id: job.pageId },
        data: {
          syncStatus: 'FAILED',
          syncError: errorMessage
        }
      });

      console.log(`💀 Job ${job.id} permanently failed after ${job.attempts} attempts`);
    }
  }
}

/**
 * 오래된 작업 정리
 */
async function cleanupOldJobs(): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - WORKER_CONFIG.CLEANUP_DAYS);

    const result = await prisma.sync_queue.deleteMany({
      where: {
        status: {
          in: ['completed', 'failed']
        },
        processedAt: {
          lt: cutoffDate
        }
      }
    });

    if (result.count > 0) {
      console.log(`🧹 Cleaned up ${result.count} old jobs`);
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

/**
 * Sleep 유틸리티
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Graceful shutdown 핸들러
 */
function setupShutdownHandlers(): void {
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
    isRunning = false;

    // 현재 처리 중인 작업 완료 대기
    const startTime = Date.now();
    while (isProcessing && Date.now() - startTime < WORKER_CONFIG.SHUTDOWN_TIMEOUT) {
      await sleep(100);
    }

    if (isProcessing) {
      console.warn('⚠️  Forced shutdown - some jobs may be incomplete');
    }

    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
}

/**
 * 헬스 체크 엔드포인트 (옵션)
 */
async function healthCheck(): Promise<{ status: string; queueSize: number; processing: boolean }> {
  const queueSize = await prisma.sync_queue.count({
    where: { status: 'pending' }
  });

  return {
    status: isRunning ? 'running' : 'stopped',
    queueSize,
    processing: isProcessing
  };
}

/**
 * 워커 시작
 */
async function start(): Promise<void> {
  try {
    // DB 연결 확인
    await prisma.$connect();
    console.log('✅ Database connected');

    // Shutdown 핸들러 등록
    setupShutdownHandlers();

    // 워커 루프 시작
    await workerLoop();

  } catch (error) {
    console.error('💥 Worker startup failed:', error);
    process.exit(1);
  }
}

// 워커 실행
if (require.main === module) {
  start();
}

export { start, healthCheck, WORKER_CONFIG };
