#!/usr/bin/env tsx
/**
 * Service Limits API 테스트 스크립트
 */

const API_BASE = 'http://localhost:3003';
const TEST_EMAIL = 'admin@misopin.com';
const TEST_PASSWORD = 'misopin123';

async function login(): Promise<string> {
  console.log('🔐 로그인 중...\n');

  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✅ 로그인 성공: ${data.user.email}\n`);

  return data.token;
}

async function testGetLimits(token: string) {
  console.log('='.repeat(70));
  console.log('📋 TEST 1: GET /api/admin/service-limits');
  console.log('='.repeat(70) + '\n');

  const response = await fetch(`${API_BASE}/api/admin/service-limits`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    console.error(`❌ GET 실패: ${response.status}`);
    const error = await response.json();
    console.error(error);
    return;
  }

  const data = await response.json();
  console.log(`✅ GET 성공: ${data.count}건 조회\n`);

  data.data.forEach((limit: any, idx: number) => {
    console.log(`[${idx + 1}] ${limit.service?.name || 'N/A'}`);
    console.log(`    serviceType: ${limit.serviceType}`);
    console.log(`    serviceId: ${limit.serviceId}`);
    console.log(`    dailyLimit: ${limit.dailyLimit}건`);
    console.log(`    isActive: ${limit.isActive}`);
    console.log(`    updatedBy: ${limit.updatedBy || 'N/A'}`);
    console.log(`    reason: ${limit.reason || 'N/A'}`);
    console.log();
  });

  return data.data;
}

async function testPostLimit(token: string, serviceId: string, dailyLimit: number) {
  console.log('='.repeat(70));
  console.log('📝 TEST 2: POST /api/admin/service-limits (Update)');
  console.log('='.repeat(70) + '\n');

  console.log(`요청: serviceId=${serviceId}, dailyLimit=${dailyLimit}\n`);

  const response = await fetch(`${API_BASE}/api/admin/service-limits`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serviceId: serviceId,
      dailyLimit: dailyLimit,
      isActive: true,
      reason: `테스트: 한도 변경 ${dailyLimit}건`
    })
  });

  if (!response.ok) {
    console.error(`❌ POST 실패: ${response.status}`);
    const error = await response.json();
    console.error(error);
    return;
  }

  const data = await response.json();
  console.log(`✅ ${data.message}\n`);
  console.log('업데이트된 데이터:');
  console.log(`  서비스: ${data.data.service?.name}`);
  console.log(`  한도: ${data.data.dailyLimit}건`);
  console.log(`  활성: ${data.data.isActive}`);
  console.log(`  변경자: ${data.data.updatedBy}`);
  console.log(`  사유: ${data.data.reason}\n`);
}

async function main() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 Service Limits API 테스트');
    console.log('='.repeat(70) + '\n');

    // 1. 로그인
    const token = await login();

    // 2. GET 테스트
    const limits = await testGetLimits(token);

    if (limits && limits.length > 0) {
      // 3. POST 테스트 (첫 번째 서비스 한도 변경)
      const firstLimit = limits[0];
      const newDailyLimit = firstLimit.dailyLimit === 5 ? 7 : 5; // 토글
      await testPostLimit(token, firstLimit.serviceId, newDailyLimit);

      // 4. 변경 확인
      console.log('='.repeat(70));
      console.log('✅ TEST 3: 변경 확인');
      console.log('='.repeat(70) + '\n');
      await testGetLimits(token);
    }

    console.log('='.repeat(70));
    console.log('🎉 모든 테스트 완료!');
    console.log('='.repeat(70) + '\n');

  } catch (error: any) {
    console.error('\n❌ 테스트 실패:\n');
    console.error(error.message);
    process.exit(1);
  }
}

main();
