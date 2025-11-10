#!/usr/bin/env tsx
/**
 * Test API Save - 실제 편집 저장 시뮬레이션
 */

async function testSave() {
  console.log('🧪 Testing /api/admin/static-pages/index/elements PATCH\n');

  // 실제 요청과 동일한 형식으로 테스트
  const updates = [
    {
      elementId: 'hero-title', // 예시 elementId
      newValue: '테스트 제목 변경',
      elementType: 'TEXT',
    },
  ];

  const response = await fetch('http://localhost:3002/api/admin/static-pages/index/elements', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN_HERE', // 실제 토큰 필요
    },
    body: JSON.stringify({ updates }),
  });

  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);

  const data = await response.json();
  console.log('\nResponse:');
  console.log(JSON.stringify(data, null, 2));

  if (!data.success) {
    console.log('\n❌ Error Details:');
    console.log('  Code:', data.code);
    console.log('  Error:', data.error);
  }
}

// 로컬 서버가 실행 중인지 확인
fetch('http://localhost:3002/api/health')
  .then(() => testSave())
  .catch((err) => {
    console.error('❌ 로컬 서버가 실행되지 않았습니다.');
    console.error('   npm run dev 를 먼저 실행하세요.');
  });
