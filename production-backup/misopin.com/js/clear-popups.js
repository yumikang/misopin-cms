/**
 * 팝업 localStorage 초기화 스크립트
 * 브라우저 콘솔에서 실행하거나 HTML에 포함시켜 사용
 */

// 팝업 관련 localStorage 초기화
function clearPopupStorage() {
  console.log('🧹 Clearing popup storage...');

  // 기존 저장된 데이터 확인
  const existingData = localStorage.getItem('closedPopups');
  if (existingData) {
    console.log('Found existing closed popups:', existingData);
  }

  // localStorage에서 팝업 관련 데이터 삭제
  localStorage.removeItem('closedPopups');

  console.log('✅ Popup storage cleared!');
  console.log('🔄 Reloading page to show popups...');

  // 페이지 새로고침
  setTimeout(() => {
    location.reload();
  }, 1000);
}

// 팝업 강제 표시 (디버깅용)
function forceShowAllPopups() {
  console.log('🚀 Force showing all popups...');

  // localStorage 초기화
  localStorage.removeItem('closedPopups');

  // API에서 팝업 가져와서 직접 표시
  if (typeof misopinAPI !== 'undefined' && typeof MisopinHelpers !== 'undefined') {
    misopinAPI.getPopups().then(popups => {
      console.log(`Found ${popups.length} popups to display`);
      popups.forEach((popup, index) => {
        setTimeout(() => {
          console.log(`Displaying popup: ${popup.title}`);
          MisopinHelpers.showPopup(popup);
        }, index * 1000);
      });
    }).catch(error => {
      console.error('Failed to fetch popups:', error);
    });
  } else {
    console.error('API client not loaded. Please refresh the page.');
  }
}

// 자동 실행 옵션 (URL 파라미터로 제어)
if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search);

  // ?clearPopups=true 파라미터가 있으면 자동으로 초기화
  if (urlParams.get('clearPopups') === 'true') {
    clearPopupStorage();
  }

  // ?forcePopups=true 파라미터가 있으면 강제 표시
  if (urlParams.get('forcePopups') === 'true') {
    forceShowAllPopups();
  }

  // 전역 함수로 등록
  window.clearPopupStorage = clearPopupStorage;
  window.forceShowAllPopups = forceShowAllPopups;

  console.log('📌 Popup control functions ready:');
  console.log('- clearPopupStorage(): Clear stored popup preferences');
  console.log('- forceShowAllPopups(): Force display all active popups');
  console.log('- Add ?clearPopups=true to URL to auto-clear');
  console.log('- Add ?forcePopups=true to URL to force show');
}