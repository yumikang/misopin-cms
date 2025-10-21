/**
 * CMS Integration Script
 * 미소핀의원 정적 사이트에 CMS 콘텐츠를 통합하는 메인 스크립트
 */

// CMS 설정
window.CMS_API_URL = 'https://misopin-cms.vercel.app/api/public'; // Vercel 배포 URL
// window.CMS_API_URL = 'http://localhost:3007/api/public'; // 로컬 개발 환경
window.CMS_DEBUG = true; // 디버그 모드

// CMS 로더 초기화
document.addEventListener('DOMContentLoaded', function() {
  // CMS 콘텐츠 로더 초기화
  if (window.CMSContentLoader) {
    window.CMSContentLoader.init({
      autoLoad: true, // 자동 로드 활성화
      cacheExpiration: 5 * 60 * 1000, // 5분 캐시
      debug: window.CMS_DEBUG
    });
  }

  // 편집 모드 체크 (관리자 로그인 상태)
  checkEditMode();
});

/**
 * 편집 모드 체크 및 활성화
 */
function checkEditMode() {
  // 쿼리 파라미터에서 edit 모드 체크
  const urlParams = new URLSearchParams(window.location.search);
  const editMode = urlParams.get('edit') === 'true';
  const token = urlParams.get('token');

  if (editMode && token) {
    // 편집 모드 활성화
    enableEditMode(token);
  }
}

/**
 * 편집 모드 활성화
 */
function enableEditMode(token) {
  // 편집 툴바 추가
  const toolbar = document.createElement('div');
  toolbar.className = 'cms-edit-toolbar';
  toolbar.innerHTML = `
    <div class="cms-toolbar-inner">
      <h3>편집 모드</h3>
      <button onclick="openCMSEditor()">CMS 편집기 열기</button>
      <button onclick="refreshContent()">콘텐츠 새로고침</button>
      <button onclick="exitEditMode()">편집 모드 종료</button>
    </div>
  `;

  document.body.insertBefore(toolbar, document.body.firstChild);

  // 편집 가능 섹션 표시
  const sections = document.querySelectorAll('[data-cms-section]');
  sections.forEach(section => {
    section.classList.add('cms-editable');
    section.title = '클릭하여 편집';

    section.addEventListener('click', function(e) {
      e.preventDefault();
      const sectionName = this.getAttribute('data-cms-section');
      openSectionEditor(sectionName);
    });
  });

  // 편집 모드 스타일 추가
  addEditModeStyles();
}

/**
 * CMS 편집기 열기
 */
function openCMSEditor() {
  const editorUrl = `${window.CMS_API_URL.replace('/api/public', '')}/webbuilder?page=${getCurrentPage()}`;
  window.open(editorUrl, 'cms-editor', 'width=1200,height=800');
}

/**
 * 섹션 편집기 열기
 */
function openSectionEditor(sectionName) {
  const editorUrl = `${window.CMS_API_URL.replace('/api/public', '')}/webbuilder?page=${getCurrentPage()}&section=${sectionName}`;
  window.open(editorUrl, 'cms-editor', 'width=1200,height=800');
}

/**
 * 콘텐츠 새로고침
 */
function refreshContent() {
  if (window.CMSContentLoader) {
    window.CMSContentLoader.refresh().then(() => {
      showNotification('콘텐츠가 새로고침되었습니다.');
    });
  }
}

/**
 * 편집 모드 종료
 */
function exitEditMode() {
  // URL에서 편집 파라미터 제거
  const url = new URL(window.location);
  url.searchParams.delete('edit');
  url.searchParams.delete('token');
  window.location.href = url.toString();
}

/**
 * 현재 페이지 slug 가져오기
 */
function getCurrentPage() {
  const path = window.location.pathname;
  if (path === '/' || path === '/index.html') return 'home';
  return path.replace(/^\/|\.html$/g, '');
}

/**
 * 편집 모드 스타일 추가
 */
function addEditModeStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* 편집 툴바 스타일 */
    .cms-edit-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #333;
      color: white;
      padding: 10px;
      z-index: 99999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }

    .cms-toolbar-inner {
      max-width: 1450px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .cms-toolbar-inner h3 {
      margin: 0;
      font-size: 16px;
    }

    .cms-toolbar-inner button {
      padding: 5px 15px;
      background: #38b0c9;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .cms-toolbar-inner button:hover {
      background: #2a8a9c;
    }

    /* 편집 가능 섹션 스타일 */
    .cms-editable {
      position: relative;
      outline: 2px dashed #38b0c9;
      outline-offset: 5px;
      cursor: pointer;
      transition: outline-color 0.3s;
    }

    .cms-editable:hover {
      outline-color: #2a8a9c;
      background: rgba(56, 176, 201, 0.05);
    }

    .cms-editable::before {
      content: attr(data-cms-section);
      position: absolute;
      top: -25px;
      left: 0;
      background: #38b0c9;
      color: white;
      padding: 2px 10px;
      font-size: 12px;
      border-radius: 3px;
      z-index: 1000;
    }

    /* 편집 모드일 때 body 패딩 추가 */
    body.cms-edit-mode {
      padding-top: 60px;
    }
  `;

  document.head.appendChild(style);
  document.body.classList.add('cms-edit-mode');
}

/**
 * 알림 표시
 */
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'cms-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    z-index: 100000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// 애니메이션 스타일 추가
const animationStyle = document.createElement('style');
animationStyle.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(animationStyle);