/**
 * Misopin CMS API Client
 * Used for fetching data from the CMS backend
 */

class MisopinAPI {
  constructor() {
    // Configure API base URL
    this.baseURL = this.getAPIBaseURL();
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Get API base URL based on environment
   */
  getAPIBaseURL() {
    // Check if we're in development or production
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Development - CMS running locally
      return 'http://localhost:3000/api';
    } else if (hostname === 'misopin.one-q.xyz') {
      // Production static site - Use CMS domain
      return 'https://cms.one-q.xyz/api';
    } else if (hostname === 'misopin-renew.vercel.app') {
      // Vercel deployment - Use CMS domain
      return 'https://cms.one-q.xyz/api';
    } else if (hostname === 'misopin.com' || hostname === 'www.misopin.com') {
      // Future production domain - Use CMS domain
      return 'https://cms.one-q.xyz/api';
    } else {
      // Fallback to CMS domain
      return 'https://cms.one-q.xyz/api';
    }
  }

  /**
   * Fetch with error handling
   * ✅ 수정: 409 에러 시 응답 본문 파싱
   */
  async fetchAPI(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        },
        cache: 'no-cache' // Prevent browser caching
      });

      // ✅ 응답 본문을 먼저 파싱
      const data = await response.json();

      if (!response.ok) {
        // ✅ 에러 객체에 응답 데이터 포함
        const error = new Error(data.message || `API Error: ${response.status}`);
        error.status = response.status;
        error.code = data.code;
        error.details = data.details;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get board posts (notices and events)
   * @param {string} type - 'NOTICE' or 'EVENT' (optional)
   * @param {number} limit - Number of posts to fetch
   * @param {number} offset - Offset for pagination
   */
  async getBoardPosts(type = null, limit = 10, offset = 0) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      t: Date.now().toString() // Add cache buster
    });

    if (type) {
      params.append('type', type);
    }

    return this.fetchAPI(`/public/board-posts?${params}`);
  }

  /**
   * Get active popups
   */
  async getPopups() {
    console.log('Fetching popups from:', this.baseURL + '/public/popups');
    // Add cache buster to prevent browser caching
    const cacheBuster = `t=${Date.now()}`;
    return this.fetchAPI(`/public/popups?${cacheBuster}`);
  }

  /**
   * Submit reservation
   * @param {Object} reservationData - Reservation form data
   */
  async submitReservation(reservationData) {
    return this.fetchAPI('/public/reservations', {
      method: 'POST',
      body: JSON.stringify(reservationData)
    });
  }

  /**
   * Query reservations
   * @param {Object} queryData - Query data (name, phone, birth_date)
   */
  async queryReservations(queryData) {
    const params = new URLSearchParams({
      name: queryData.name,
      phone: queryData.phone,
      birth_date: queryData.birth_date
    });

    return this.fetchAPI(`/public/reservations/query?${params}`);
  }

  /**
   * Cancel reservation
   * @param {string} reservationId - Reservation ID
   * @param {Object} verifyData - Verification data (phone, birth_date)
   */
  async cancelReservation(reservationId, verifyData) {
    return this.fetchAPI(`/public/reservations/${reservationId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(verifyData)
    });
  }

  /**
   * Get page content by slug
   * @param {string} slug - Page slug
   */
  async getPageContent(slug) {
    return this.fetchAPI(`/public/pages/${slug}`);
  }

  /**
   * Get reservation status for a month
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   */
  async getReservationStatus(year, month) {
    const params = new URLSearchParams({
      year: year.toString(),
      month: month.toString()
    });

    return this.fetchAPI(`/public/reservation-status?${params}`);
  }
}

// Create global instance
const misopinAPI = new MisopinAPI();

// Helper functions for easy integration
const MisopinHelpers = {
  /**
   * Format date to Korean format
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  },

  /**
   * Render board posts to HTML
   */
  renderBoardPosts(posts, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    container.innerHTML = posts.map(post => `
      <div class="board-item" data-id="${post.id}">
        <div class="board-header">
          <span class="board-type board-type-${post.board_type.toLowerCase()}">
            ${post.board_type === 'NOTICE' ? '공지' : '이벤트'}
          </span>
          ${post.is_pinned ? '<span class="board-pinned">📌</span>' : ''}
          <h3 class="board-title">${post.title}</h3>
        </div>
        <p class="board-excerpt">${post.excerpt || ''}</p>
        <div class="board-meta">
          <span class="board-author">${post.author}</span>
          <span class="board-date">${this.formatDate(post.created_at)}</span>
          <span class="board-views">조회 ${post.view_count}</span>
        </div>
      </div>
    `).join('');
  },

  /**
   * Show popup
   */
  showPopup(popup, forceShow = false) {
    console.log('showPopup called for:', popup);

    // forceShow가 true면 localStorage 체크 건너뛰기
    if (!forceShow) {
      // Check if popup was already shown today
      const todayClosedPopups = JSON.parse(localStorage.getItem('closedPopups') || '{}');
      const today = new Date().toDateString();

      if (todayClosedPopups[popup.id] === today) {
        console.log('Popup already closed today:', popup.id);
        return; // Skip if already closed today
      }
    }

    // 이미지만 있는 팝업인지 확인 (제목과 내용 없음)
    const isImageOnly = popup.image_url && !popup.title && !popup.content;
    const containerClass = isImageOnly ? 'popup-image-only' : '';

    // 이미지 URL이 상대 경로인 경우 CMS 도메인으로 절대 경로 변환
    let imageUrl = popup.image_url;
    if (imageUrl && !imageUrl.startsWith('http')) {
      const cmsBaseUrl = 'https://cms.one-q.xyz';
      // /uploads로 시작하면 /api/uploads로 변경
      if (imageUrl.startsWith('/uploads/')) {
        imageUrl = `${cmsBaseUrl}/api${imageUrl}`;
      } else if (!imageUrl.startsWith('/api/')) {
        imageUrl = `${cmsBaseUrl}${imageUrl}`;
      } else {
        imageUrl = `${cmsBaseUrl}${imageUrl}`;
      }
    }

    const popupHTML = `
      <div class="popup-overlay" id="popup-${popup.id}" data-type="${popup.display_type}" data-position="${popup.position}">
        <div class="popup-container popup-${popup.display_type.toLowerCase()} ${containerClass}">
          ${!popup.image_url && popup.title ? `<h3 class="popup-title">${popup.title}</h3>` : ''}
          <div class="popup-content">
            ${popup.image_url ? (popup.link_url ? `<a href="${popup.link_url}" target="_blank"><img src="${imageUrl}" alt="${popup.title}" style="cursor: pointer;" /></a>` : `<img src="${imageUrl}" alt="${popup.title}" />`) : ''}
            ${!popup.image_url && popup.content ? `<p>${popup.content}</p>` : ''}
          </div>
          <div class="popup-footer">
            <button onclick="MisopinHelpers.closePopup('${popup.id}', true)">오늘 하루 보지 않기</button>
            <button onclick="MisopinHelpers.closePopup('${popup.id}')">닫기</button>
          </div>
        </div>
      </div>
    `;

    console.log('Adding popup to DOM with position:', popup.position);
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    console.log('Popup added to DOM:', document.getElementById(`popup-${popup.id}`));
  },

  /**
   * Close popup
   */
  closePopup(popupId, todayClose = false) {
    const popup = document.getElementById(`popup-${popupId}`);
    if (popup) {
      popup.remove();
    }

    if (todayClose) {
      const todayClosedPopups = JSON.parse(localStorage.getItem('closedPopups') || '{}');
      todayClosedPopups[popupId] = new Date().toDateString();
      localStorage.setItem('closedPopups', JSON.stringify(todayClosedPopups));
    }
  },

  /**
   * Initialize popups on page load
   */
  async initPopups() {
    console.log('Initializing popups...');

    // Clear old popup data from previous day
    const todayClosedPopups = JSON.parse(localStorage.getItem('closedPopups') || '{}');
    const today = new Date().toDateString();
    const cleanedPopups = {};

    // Keep only today's closed popups
    for (const [popupId, closeDate] of Object.entries(todayClosedPopups)) {
      if (closeDate === today) {
        cleanedPopups[popupId] = closeDate;
      }
    }
    localStorage.setItem('closedPopups', JSON.stringify(cleanedPopups));

    try {
      const popups = await misopinAPI.getPopups();
      console.log('Fetched popups:', popups);

      if (!popups || popups.length === 0) {
        console.log('No active popups found');
        return;
      }

      // URL 파라미터 확인 (강제 표시 옵션)
      const urlParams = new URLSearchParams(window.location.search);
      const forceShow = urlParams.get('showPopups') === 'true' ||
                       urlParams.get('forcePopups') === 'true';

      // 첫 방문 확인 (세션 스토리지 사용)
      const hasVisitedToday = sessionStorage.getItem('hasVisitedToday');
      const shouldForceShow = forceShow || !hasVisitedToday;

      if (!hasVisitedToday) {
        sessionStorage.setItem('hasVisitedToday', 'true');
        console.log('First visit today - showing popups');
      }

      // Sort by priority and show popups
      popups.forEach((popup, index) => {
        console.log(`Showing popup ${index + 1}:`, popup);
        setTimeout(() => {
          this.showPopup(popup, shouldForceShow);
        }, index * 1000); // Stagger popup display
      });
    } catch (error) {
      console.error('Failed to load popups:', error);
    }
  },

  /**
   * Load board posts into container
   */
  async loadBoardPosts(type = null, containerSelector = '#board-posts') {
    try {
      const data = await misopinAPI.getBoardPosts(type);
      this.renderBoardPosts(data.posts, containerSelector);
    } catch (error) {
      console.error('Failed to load board posts:', error);
      const container = document.querySelector(containerSelector);
      if (container) {
        container.innerHTML = '<p class="error">게시글을 불러올 수 없습니다.</p>';
      }
    }
  }
};

// Popup System Initialization with Robust Error Handling
(function() {
  'use strict';

  // System monitoring
  window.MisopinPopupSystem = {
    version: '1.3.0',  // ✅ 버전 업데이트
    loadTime: new Date().toISOString(),
    initialized: false,
    debug: true,

    log: function(message, data = null) {
      if (this.debug) {
        console.log(`[Misopin Popup System] ${message}`, data || '');
      }
    },

    error: function(message, error = null) {
      console.error(`[Misopin Popup System ERROR] ${message}`, error || '');
    }
  };

  const system = window.MisopinPopupSystem;
  system.log('API Client loaded (v1.3.0 - Enhanced error handling)', {
    readyState: document.readyState,
    timestamp: system.loadTime,
    userAgent: navigator.userAgent.substring(0, 100)
  });

  // Auto-clear old popup storage (24시간 이상 된 데이터 자동 삭제)
  function autoCleanPopupStorage() {
    try {
      const closedPopups = JSON.parse(localStorage.getItem('closedPopups') || '{}');
      const today = new Date().toDateString();
      let hasOldData = false;

      // 오늘이 아닌 날짜의 데이터가 있으면 삭제
      Object.keys(closedPopups).forEach(popupId => {
        if (closedPopups[popupId] !== today) {
          hasOldData = true;
        }
      });

      if (hasOldData) {
        system.log('Clearing old popup storage data');
        localStorage.removeItem('closedPopups');
      }
    } catch (e) {
      system.log('Error cleaning popup storage:', e);
    }
  }

  // Enhanced initialization with multiple fallbacks
  function initializePopups() {
    system.log('Starting popup initialization...');

    // 오래된 팝업 데이터 자동 정리
    autoCleanPopupStorage();

    try {
      if (system.initialized) {
        system.log('System already initialized, skipping...');
        return;
      }

      // Verify dependencies
      if (typeof MisopinHelpers === 'undefined') {
        system.error('MisopinHelpers not found - critical error');
        return;
      }

      if (typeof misopinAPI === 'undefined') {
        system.error('misopinAPI not found - critical error');
        return;
      }

      system.log('Dependencies verified, calling initPopups...');
      MisopinHelpers.initPopups()
        .then(() => {
          system.initialized = true;
          system.log('Popup initialization completed successfully');
        })
        .catch(error => {
          system.error('Popup initialization failed', error);
        });

    } catch (error) {
      system.error('Critical error during initialization', error);
    }
  }

  // Multi-strategy initialization
  if (document.readyState === 'loading') {
    system.log('Document still loading, setting up event listeners...');

    document.addEventListener('DOMContentLoaded', () => {
      system.log('DOMContentLoaded fired');
      initializePopups();
    });

    // Backup timer in case DOMContentLoaded fails
    setTimeout(() => {
      if (!system.initialized) {
        system.log('Backup initialization triggered after 2 seconds');
        initializePopups();
      }
    }, 2000);

  } else {
    system.log('Document already loaded, initializing immediately...');
    // Small delay to ensure all scripts are loaded
    setTimeout(initializePopups, 100);
  }

  // Additional backup timer
  setTimeout(() => {
    if (!system.initialized) {
      system.log('Final backup initialization triggered after 5 seconds');
      initializePopups();
    }
  }, 5000);

  // Expose system status for debugging
  window.checkPopupSystem = function() {
    console.log('Popup System Status:', {
      version: system.version,
      initialized: system.initialized,
      loadTime: system.loadTime,
      misopinAPI: typeof misopinAPI !== 'undefined',
      misopinHelpers: typeof MisopinHelpers !== 'undefined',
      activePopups: document.querySelectorAll('.popup-overlay').length
    });
  };

})();
