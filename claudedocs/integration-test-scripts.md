# Integration Test Scripts

Browser console 테스트 스크립트 모음입니다. 배포 후 브라우저 개발자 도구(F12)의 콘솔 탭에서 실행하세요.

## 1. API 클라이언트 확인

### 1.1 기본 로드 확인
```javascript
// API 클라이언트가 로드되었는지 확인
console.log('MisopinAPI:', typeof MisopinAPI);
console.log('misopinAPI instance:', typeof misopinAPI);
console.log('MisopinHelpers:', typeof MisopinHelpers);
```

**기대 결과**:
```
MisopinAPI: function
misopinAPI instance: object
MisopinHelpers: object
```

### 1.2 Base URL 확인
```javascript
// API Base URL이 올바르게 설정되었는지 확인
const api = new MisopinAPI();
console.log('Current hostname:', window.location.hostname);
console.log('API Base URL:', api.baseURL);
```

**기대 결과**:
- one-q.xyz 접속 시: `https://cms.one-q.xyz/api`
- localhost 접속 시: `http://localhost:3001/api`

## 2. 예약 시스템 테스트

### 2.1 예약 제출 테스트 (Read-only)
```javascript
// 테스트 데이터 생성
const testReservation = {
  patient_name: "API테스트",
  phone: "010-9999-8888",
  email: "test@example.com",
  birth_date: "1990-01-01",
  gender: "MALE",
  treatment_type: "FIRST_VISIT",
  service: "피부진료",
  preferred_date: "2025-10-20",
  preferred_time: "10:00",
  notes: "콘솔 테스트용 예약입니다"
};

// API 호출 (실제로 제출하지 않고 검증만)
const api = new MisopinAPI();
console.log('Test data:', testReservation);
console.log('Would call:', `${api.baseURL}/public/reservations`);
```

### 2.2 실제 예약 제출 (주의: DB에 저장됨)
```javascript
// 실제 예약 제출 - 신중하게 사용
const api = new MisopinAPI();

const testReservation = {
  patient_name: "콘솔테스트",
  phone: "010-0000-0000",
  email: "test@test.com",
  birth_date: "1990-01-01",
  gender: "MALE",
  treatment_type: "FIRST_VISIT",
  service: "정기검진",
  preferred_date: "2025-10-25",
  preferred_time: "14:00",
  notes: "브라우저 콘솔 테스트"
};

api.submitReservation(testReservation)
  .then(result => {
    console.log('✓ 예약 성공:', result);
  })
  .catch(error => {
    console.error('✗ 예약 실패:', error);
    console.error('Error details:', error.message);
  });
```

### 2.3 예약 조회 테스트
```javascript
// 예약 조회
const queryData = {
  name: "콘솔테스트",
  phone: "010-0000-0000",
  birth_date: "1990-01-01"
};

api.queryReservations(queryData)
  .then(result => {
    console.log('조회된 예약:', result);
  })
  .catch(error => {
    console.error('조회 실패:', error);
  });
```

## 3. 게시판 테스트

### 3.1 게시글 목록 가져오기
```javascript
const api = new MisopinAPI();

// 전체 게시글 (공지 + 이벤트)
api.getBoardPosts(null, 20, 0)
  .then(response => {
    console.log('총 게시글 수:', response.total);
    console.log('첫 페이지 게시글:', response.posts);
    console.log('첫 번째 게시글 제목:', response.posts[0]?.title);
  })
  .catch(error => {
    console.error('게시글 로드 실패:', error);
  });
```

### 3.2 공지사항만 가져오기
```javascript
api.getBoardPosts('NOTICE', 10, 0)
  .then(response => {
    console.log('공지사항 수:', response.total);
    console.log('공지사항:', response.posts);
  })
  .catch(error => {
    console.error('공지사항 로드 실패:', error);
  });
```

### 3.3 이벤트만 가져오기
```javascript
api.getBoardPosts('EVENT', 10, 0)
  .then(response => {
    console.log('이벤트 수:', response.total);
    console.log('이벤트:', response.posts);
  })
  .catch(error => {
    console.error('이벤트 로드 실패:', error);
  });
```

### 3.4 게시판 렌더링 확인
```javascript
// board-page.html에서 실행
const tbody = document.getElementById('board-posts-list');
console.log('게시판 리스트 요소:', tbody);
console.log('렌더링된 게시글 수:', tbody?.children.length);
```

## 4. 팝업 시스템 테스트

### 4.1 팝업 시스템 상태 확인
```javascript
// 팝업 시스템 진단
window.checkPopupSystem();
```

**기대 결과**:
```javascript
{
  version: "1.2.0",
  initialized: true,
  loadTime: "2025-10-16T...",
  misopinAPI: true,
  misopinHelpers: true,
  activePopups: 0  // 또는 실제 팝업 수
}
```

### 4.2 팝업 데이터 가져오기
```javascript
const api = new MisopinAPI();

api.getPopups()
  .then(popups => {
    console.log('활성 팝업 수:', popups.length);
    console.log('팝업 목록:', popups);
    popups.forEach((popup, index) => {
      console.log(`팝업 ${index + 1}:`, popup.title, `(우선순위: ${popup.priority})`);
    });
  })
  .catch(error => {
    console.error('팝업 로드 실패:', error);
  });
```

### 4.3 팝업 강제 표시 (테스트용)
```javascript
// URL에 파라미터 추가하여 팝업 강제 표시
window.location.href = window.location.pathname + '?showPopups=true';
```

### 4.4 팝업 로컬스토리지 확인
```javascript
// 오늘 닫은 팝업 목록
const closedPopups = JSON.parse(localStorage.getItem('closedPopups') || '{}');
console.log('오늘 닫은 팝업:', closedPopups);

// 로컬스토리지 초기화 (팝업 다시 보기)
localStorage.removeItem('closedPopups');
sessionStorage.removeItem('hasVisitedToday');
console.log('팝업 스토리지 초기화 완료. 페이지 새로고침하면 팝업이 다시 표시됩니다.');
```

## 5. 네트워크 모니터링

### 5.1 API 응답 시간 측정
```javascript
async function measureAPIPerformance() {
  const api = new MisopinAPI();
  const tests = [
    { name: '게시글 목록', fn: () => api.getBoardPosts(null, 10, 0) },
    { name: '팝업 목록', fn: () => api.getPopups() },
  ];

  for (const test of tests) {
    const start = performance.now();
    try {
      await test.fn();
      const duration = performance.now() - start;
      console.log(`✓ ${test.name}: ${duration.toFixed(2)}ms`);
    } catch (error) {
      console.error(`✗ ${test.name}: 실패`, error.message);
    }
  }
}

measureAPIPerformance();
```

### 5.2 CORS 검증
```javascript
// 네트워크 탭에서 CORS 헤더 확인
fetch('https://cms.one-q.xyz/api/public/board-posts?limit=1', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
  .then(response => {
    console.log('Status:', response.status);
    console.log('CORS Headers:');
    console.log('  Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
    console.log('  Access-Control-Allow-Methods:', response.headers.get('Access-Control-Allow-Methods'));
    return response.json();
  })
  .then(data => {
    console.log('Data:', data);
  })
  .catch(error => {
    console.error('CORS Error:', error);
  });
```

## 6. 전체 통합 테스트

### 6.1 종합 헬스체크
```javascript
async function comprehensiveHealthCheck() {
  console.log('========================================');
  console.log('Misopin Integration Health Check');
  console.log('========================================');

  const api = new MisopinAPI();
  const results = {};

  // 1. API 클라이언트 로드
  results.apiClientLoaded = typeof MisopinAPI !== 'undefined';
  console.log('1. API Client:', results.apiClientLoaded ? '✓' : '✗');

  // 2. Base URL 확인
  results.baseURL = api.baseURL;
  results.baseURLCorrect = api.baseURL.includes('cms.one-q.xyz') || api.baseURL.includes('localhost');
  console.log('2. Base URL:', results.baseURL, results.baseURLCorrect ? '✓' : '✗');

  // 3. 게시판 API
  try {
    const boardData = await api.getBoardPosts(null, 1, 0);
    results.boardAPI = '✓ ' + boardData.total + ' posts';
    console.log('3. Board API:', results.boardAPI);
  } catch (error) {
    results.boardAPI = '✗ ' + error.message;
    console.error('3. Board API:', results.boardAPI);
  }

  // 4. 팝업 API
  try {
    const popups = await api.getPopups();
    results.popupAPI = '✓ ' + popups.length + ' popups';
    console.log('4. Popup API:', results.popupAPI);
  } catch (error) {
    results.popupAPI = '✗ ' + error.message;
    console.error('4. Popup API:', results.popupAPI);
  }

  // 5. 팝업 시스템
  results.popupSystem = window.MisopinPopupSystem?.initialized || false;
  console.log('5. Popup System:', results.popupSystem ? '✓' : '✗');

  // 6. DOM 요소 확인
  results.boardElement = !!document.getElementById('board-posts-list');
  console.log('6. Board Element:', results.boardElement ? '✓' : '⊘ (not on board page)');

  console.log('========================================');
  console.log('Summary:');
  const passed = Object.values(results).filter(r =>
    typeof r === 'boolean' ? r : r.toString().startsWith('✓')
  ).length;
  const total = Object.keys(results).length;
  console.log(`Tests Passed: ${passed}/${total}`);

  return results;
}

comprehensiveHealthCheck();
```

## 7. 디버깅 헬퍼

### 7.1 에러 상세 정보
```javascript
// 전역 에러 캐처
window.addEventListener('error', (event) => {
  console.error('Global Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// Promise rejection 캐처
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise
  });
});

console.log('Error listeners registered');
```

### 7.2 API 요청 인터셉터
```javascript
// 모든 API 요청 로깅
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('→ API Request:', args[0]);
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('← API Response:', args[0], response.status);
      return response;
    })
    .catch(error => {
      console.error('✗ API Error:', args[0], error);
      throw error;
    });
};

console.log('API request interceptor installed');
```

## 8. 모바일 테스트

### 8.1 모바일 시뮬레이션
```javascript
// 모바일 환경 정보
console.log('User Agent:', navigator.userAgent);
console.log('Screen:', {
  width: screen.width,
  height: screen.height,
  availWidth: screen.availWidth,
  availHeight: screen.availHeight
});
console.log('Viewport:', {
  width: window.innerWidth,
  height: window.innerHeight
});
console.log('Touch support:', 'ontouchstart' in window);
```

### 8.2 네트워크 상태
```javascript
// 네트워크 정보 (지원되는 브라우저만)
if ('connection' in navigator) {
  const connection = navigator.connection;
  console.log('Network:', {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData
  });
} else {
  console.log('Network API not supported');
}
```

## 9. 성능 모니터링

### 9.1 페이지 로드 성능
```javascript
// 페이지 로드 타이밍
const perfData = performance.getEntriesByType('navigation')[0];
console.log('Page Load Performance:');
console.log('  DNS Lookup:', perfData.domainLookupEnd - perfData.domainLookupStart, 'ms');
console.log('  TCP Connection:', perfData.connectEnd - perfData.connectStart, 'ms');
console.log('  Request:', perfData.responseStart - perfData.requestStart, 'ms');
console.log('  Response:', perfData.responseEnd - perfData.responseStart, 'ms');
console.log('  DOM Processing:', perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart, 'ms');
console.log('  Total Load Time:', perfData.loadEventEnd - perfData.fetchStart, 'ms');
```

### 9.2 리소스 로딩
```javascript
// 모든 리소스 로딩 시간
const resources = performance.getEntriesByType('resource');
console.log('Loaded Resources:', resources.length);

const sorted = resources
  .filter(r => r.name.includes('api-client') || r.name.includes('api/public'))
  .map(r => ({
    name: r.name.split('/').pop(),
    duration: r.duration.toFixed(2) + 'ms',
    size: r.transferSize ? (r.transferSize / 1024).toFixed(2) + 'KB' : 'cached'
  }));

console.table(sorted);
```

## 사용 방법

### 배포 후 테스트 순서

1. **기본 확인** (Section 1):
   ```javascript
   // API 클라이언트 로드 및 Base URL 확인
   ```

2. **종합 헬스체크** (Section 6.1):
   ```javascript
   comprehensiveHealthCheck();
   ```

3. **기능별 테스트** (Section 2-4):
   - 예약 시스템
   - 게시판
   - 팝업

4. **성능 측정** (Section 5, 9):
   - API 응답 시간
   - CORS 검증
   - 페이지 로드 성능

### 문제 발생 시

1. **API 호출 실패**:
   - Section 7.2 (API 인터셉터) 활성화
   - Section 5.2 (CORS 검증) 실행

2. **팝업 안 뜨는 경우**:
   - Section 4.1 (시스템 상태) 확인
   - Section 4.4 (스토리지 초기화) 실행

3. **느린 응답**:
   - Section 5.1 (응답 시간 측정) 실행
   - Section 9 (성능 모니터링) 확인

## 주의사항

- **실제 DB 영향**: Section 2.2의 예약 제출 테스트는 실제 데이터베이스에 저장됩니다
- **테스트 데이터**: 테스트 후 관리자 페이지에서 테스트 예약을 삭제하세요
- **로컬스토리지**: 팝업 테스트 후 `localStorage.removeItem('closedPopups')` 실행
- **에러 로깅**: Section 7.1의 에러 리스너는 디버깅 후 제거 권장
