#!/usr/bin/env tsx
/**
 * API 통합 테스트
 *
 * 로컬 개발 서버에서 실제 API 동작 테스트
 *
 * 실행 방법:
 * 1. 터미널 1: npm run dev (개발 서버 실행)
 * 2. 터미널 2: npm run test:api (이 스크립트 실행)
 */

const API_BASE = 'http://localhost:3002/api/static-pages';
const TEST_USER_ID = 'test-user-' + Date.now();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
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
 * 테스트 1: 페이지 목록 조회
 */
async function testGetPages(): Promise<void> {
  const response = await fetch(API_BASE);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !Array.isArray(data.pages)) {
    throw new Error('Invalid response format');
  }

  if (data.pages.length === 0) {
    throw new Error('No pages found');
  }

  console.log(`   📄 Found ${data.pages.length} pages`);
}

/**
 * 테스트 2: 특정 페이지 조회 (version, lockInfo, syncStatus 포함)
 */
async function testGetPage(): Promise<void> {
  // 먼저 페이지 목록에서 첫 번째 페이지 가져오기
  const listResponse = await fetch(API_BASE);
  const listData = await listResponse.json();

  if (listData.pages.length === 0) {
    throw new Error('No pages to test');
  }

  const pageId = listData.pages[0].id;

  // 상세 조회
  const response = await fetch(`${API_BASE}/${pageId}?userId=${TEST_USER_ID}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error('Request failed');
  }

  // 새로운 필드들이 있는지 확인
  if (typeof data.version !== 'number') {
    throw new Error('version field missing');
  }

  if (!data.lockInfo) {
    throw new Error('lockInfo field missing');
  }

  if (typeof data.canEdit !== 'boolean') {
    throw new Error('canEdit field missing');
  }

  if (!data.syncStatus) {
    throw new Error('syncStatus field missing');
  }

  console.log(`   📄 Page: ${data.page.title}`);
  console.log(`   🔢 Version: ${data.version}`);
  console.log(`   🔓 Can edit: ${data.canEdit}`);
  console.log(`   🔄 Sync status: ${data.syncStatus.syncStatus}`);
}

/**
 * 테스트 3: Edit Lock 획득
 */
async function testAcquireLock(): Promise<void> {
  const listResponse = await fetch(API_BASE);
  const listData = await listResponse.json();
  const pageId = listData.pages[0].id;

  const response = await fetch(`${API_BASE}/${pageId}/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: TEST_USER_ID,
      lockDuration: 60000 // 1분
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to acquire lock');
  }

  console.log(`   🔒 Lock acquired by ${TEST_USER_ID}`);
  console.log(`   ⏰ Expires at: ${new Date(data.lockInfo.lockExpiry!).toLocaleTimeString()}`);
}

/**
 * 테스트 4: Edit Lock 갱신
 */
async function testRenewLock(): Promise<void> {
  const listResponse = await fetch(API_BASE);
  const listData = await listResponse.json();
  const pageId = listData.pages[0].id;

  const response = await fetch(`${API_BASE}/${pageId}/lock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: TEST_USER_ID,
      lockDuration: 60000 // 추가 1분
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to renew lock');
  }

  console.log(`   🔄 Lock renewed`);
  console.log(`   ⏰ New expiry: ${new Date(data.lockInfo.lockExpiry!).toLocaleTimeString()}`);
}

/**
 * 테스트 5: 페이지 업데이트 (Optimistic Locking)
 */
async function testUpdatePage(): Promise<void> {
  const listResponse = await fetch(API_BASE);
  const listData = await listResponse.json();
  const pageId = listData.pages[0].id;

  // 먼저 현재 데이터 조회
  const getResponse = await fetch(`${API_BASE}/${pageId}?userId=${TEST_USER_ID}`);
  const getData = await getResponse.json();

  const currentVersion = getData.version;
  const currentSections = getData.page.sections;

  console.log(`   📝 Current version: ${currentVersion}`);

  // 업데이트 시도
  const response = await fetch(`${API_BASE}/${pageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sections: currentSections, // 변경 없이 그대로
      expectedVersion: currentVersion,
      userId: TEST_USER_ID,
      changedBy: 'API Test',
      changeNote: 'API 통합 테스트'
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown error'}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Update failed');
  }

  console.log(`   ✅ Updated to version: ${data.version}`);
  console.log(`   🗂️  File hash: ${data.fileHash?.substring(0, 12)}...`);
  console.log(`   💾 Backup: ${data.backupPath ? 'Created' : 'None'}`);
}

/**
 * 테스트 6: Version 충돌 시뮬레이션
 */
async function testVersionConflict(): Promise<void> {
  const listResponse = await fetch(API_BASE);
  const listData = await listResponse.json();
  const pageId = listData.pages[0].id;

  // 현재 버전 조회
  const getResponse = await fetch(`${API_BASE}/${pageId}?userId=${TEST_USER_ID}`);
  const getData = await getResponse.json();
  const currentSections = getData.page.sections;

  // 잘못된(오래된) 버전으로 업데이트 시도
  const response = await fetch(`${API_BASE}/${pageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sections: currentSections,
      expectedVersion: 1, // 매우 오래된 버전
      userId: TEST_USER_ID,
      changedBy: 'API Test',
      changeNote: 'Conflict test'
    })
  });

  if (response.status !== 409) {
    throw new Error(`Expected 409 Conflict, got ${response.status}`);
  }

  const data = await response.json();

  if (data.code !== 'VERSION_CONFLICT') {
    throw new Error('Expected VERSION_CONFLICT code');
  }

  console.log(`   ⚠️  Conflict detected correctly`);
  console.log(`   📊 Expected: 1, Current: ${data.currentVersion}`);
}

/**
 * 테스트 7: Edit Lock 해제
 */
async function testReleaseLock(): Promise<void> {
  const listResponse = await fetch(API_BASE);
  const listData = await listResponse.json();
  const pageId = listData.pages[0].id;

  const response = await fetch(`${API_BASE}/${pageId}/lock`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: TEST_USER_ID
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to release lock');
  }

  console.log(`   🔓 Lock released`);
}

/**
 * 모든 테스트 실행
 */
async function runAllTests(): Promise<void> {
  console.log('🚀 API 통합 테스트 시작\n');
  console.log('📡 API Base: ' + API_BASE);
  console.log('👤 Test User: ' + TEST_USER_ID);
  console.log('='.repeat(60));

  // 개발 서버 연결 확인
  try {
    const healthCheck = await fetch(API_BASE);
    if (!healthCheck.ok && healthCheck.status !== 404) {
      console.error('\n❌ 개발 서버가 실행 중이 아닙니다!');
      console.error('다음 명령어로 서버를 먼저 실행하세요:');
      console.error('  npm run dev\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ 개발 서버에 연결할 수 없습니다!');
    console.error('다음 명령어로 서버를 먼저 실행하세요:');
    console.error('  npm run dev\n');
    process.exit(1);
  }

  await runTest('1. 페이지 목록 조회', testGetPages);
  await runTest('2. 페이지 상세 조회 (version, lockInfo, syncStatus)', testGetPage);
  await runTest('3. Edit Lock 획득', testAcquireLock);
  await runTest('4. Edit Lock 갱신', testRenewLock);
  await runTest('5. 페이지 업데이트 (Optimistic Locking)', testUpdatePage);
  await runTest('6. Version 충돌 감지', testVersionConflict);
  await runTest('7. Edit Lock 해제', testReleaseLock);

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
    console.log('\n🎉 모든 API 테스트 통과!\n');
    console.log('✅ 정적 페이지 에디터가 정상적으로 작동합니다!');
    console.log('✅ Optimistic Locking이 작동합니다!');
    console.log('✅ Edit Lock이 작동합니다!');
    console.log('✅ File Sync가 작동합니다!\n');
  } else {
    console.log(`\n💥 ${failed}개 테스트 실패\n`);
    process.exit(1);
  }
}

// 테스트 실행
runAllTests().catch(error => {
  console.error('\n💥 테스트 실행 중 치명적 오류:', error);
  process.exit(1);
});
