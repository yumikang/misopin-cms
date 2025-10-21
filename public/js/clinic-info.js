/**
 * Clinic Info API Client
 * Fetches clinic contact information from CMS and updates DOM elements
 */
(function(window) {
  'use strict';

  const CONFIG = {
    API_ENDPOINT: 'https://cms.one-q.xyz/api/public/clinic-info',
    CACHE_KEY: 'clinic_info_cache',
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    TIMEOUT: 5000 // 5 seconds
  };

  /**
   * Cache management
   */
  const Cache = {
    get: function() {
      try {
        const cached = sessionStorage.getItem(CONFIG.CACHE_KEY);
        if (!cached) return null;

        const data = JSON.parse(cached);
        const isExpired = Date.now() - data.timestamp > CONFIG.CACHE_TTL;

        return isExpired ? null : data.info;
      } catch (e) {
        console.warn('Cache read error:', e);
        return null;
      }
    },

    set: function(info) {
      try {
        const data = {
          info: info,
          timestamp: Date.now()
        };
        sessionStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('Cache write error:', e);
      }
    },

    clear: function() {
      try {
        sessionStorage.removeItem(CONFIG.CACHE_KEY);
      } catch (e) {
        console.warn('Cache clear error:', e);
      }
    }
  };

  /**
   * Fetch clinic info with retry logic
   */
  async function fetchWithRetry(attempt = 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

      const response = await fetch(CONFIG.API_ENDPOINT, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Invalid API response format');
      }

      return result.data;

    } catch (error) {
      if (attempt < CONFIG.RETRY_ATTEMPTS) {
        console.warn(`Fetch attempt ${attempt} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
        return fetchWithRetry(attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Update DOM element with text content
   */
  function updateElement(selector, value, fallback = '') {
    const elements = document.querySelectorAll(selector);
    const text = value || fallback;

    elements.forEach(el => {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = text;
      } else if (el.tagName === 'A') {
        // For phone links
        if (selector.includes('phone') || selector.includes('tel')) {
          el.href = `tel:${text.replace(/[^0-9]/g, '')}`;
          el.textContent = text;
        } else {
          // For URL links
          el.href = text;
          if (el.textContent === '' || el.textContent === '#') {
            el.textContent = text;
          }
        }
      } else {
        el.textContent = text;
      }
    });
  }

  /**
   * Update all DOM elements with clinic info
   */
  function updateDOM(info) {
    // Phone numbers
    updateElement('[data-clinic-phone]', info.phone_primary);
    updateElement('[data-clinic-phone-secondary]', info.phone_secondary);

    // Address
    updateElement('[data-clinic-address]', info.address_full);
    updateElement('[data-clinic-address-floor]', info.address_floor);

    // Combined address
    const fullAddress = info.address_floor
      ? `${info.address_full} ${info.address_floor}`
      : info.address_full;
    updateElement('[data-clinic-address-full]', fullAddress);

    // Business hours
    if (info.hours) {
      updateElement('[data-clinic-hours-weekday]', info.hours.weekday);
      updateElement('[data-clinic-hours-saturday]', info.hours.saturday);
      updateElement('[data-clinic-hours-sunday]', info.hours.sunday);
      updateElement('[data-clinic-hours-lunch]', info.hours.lunch);
      updateElement('[data-clinic-hours-note]', info.hours.special_note);
    }

    // SNS links
    if (info.sns) {
      if (info.sns.instagram) {
        updateElement('[data-clinic-sns-instagram]', info.sns.instagram);
        document.querySelectorAll('[data-clinic-sns-instagram]').forEach(el => {
          if (el.style) el.style.display = '';
        });
      }

      if (info.sns.kakao) {
        updateElement('[data-clinic-sns-kakao]', info.sns.kakao);
        document.querySelectorAll('[data-clinic-sns-kakao]').forEach(el => {
          if (el.style) el.style.display = '';
        });
      }

      if (info.sns.naver_blog) {
        updateElement('[data-clinic-sns-naver]', info.sns.naver_blog);
        document.querySelectorAll('[data-clinic-sns-naver]').forEach(el => {
          if (el.style) el.style.display = '';
        });
      }
    }

    // Business info
    if (info.business) {
      updateElement('[data-clinic-business-reg]', info.business.registration);
      updateElement('[data-clinic-representative]', info.business.representative_name);
    }
  }

  /**
   * Show error message in DOM
   */
  function showError(message) {
    console.error('Clinic info error:', message);

    // Optionally display user-facing error
    const errorElements = document.querySelectorAll('[data-clinic-error]');
    errorElements.forEach(el => {
      el.textContent = '정보를 불러오는 중 오류가 발생했습니다.';
      if (el.style) el.style.display = 'block';
    });
  }

  /**
   * Main initialization function
   */
  async function init() {
    try {
      // Try cache first
      let info = Cache.get();

      if (info) {
        console.log('Using cached clinic info');
        updateDOM(info);
        return;
      }

      // Fetch from API
      console.log('Fetching clinic info from API...');
      info = await fetchWithRetry();

      // Update cache
      Cache.set(info);

      // Update DOM
      updateDOM(info);

      console.log('Clinic info updated successfully');

    } catch (error) {
      console.error('Failed to load clinic info:', error);
      showError(error.message);
    }
  }

  /**
   * Manual refresh function
   */
  function refresh() {
    Cache.clear();
    return init();
  }

  // Expose public API
  window.ClinicInfo = {
    init: init,
    refresh: refresh,
    clearCache: Cache.clear
  };

  // Auto-initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
