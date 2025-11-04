/**
 * TimeSlotLoader - 동적 시간 슬롯 로더
 *
 * 서비스와 날짜 선택에 따라 실시간으로 예약 가능한 시간대를 로드하고 표시합니다.
 *
 * Features:
 * - 실시간 가용성 체크
 * - 용량 표시 (여유/제한/마감)
 * - Graceful degradation (API 실패 시 정적 시간 표시)
 * - 로딩 상태 처리
 * - 에러 복구
 *
 * Usage:
 * const loader = new TimeSlotLoader({
 *   serviceSelect: '#sh_service',
 *   dateInput: '#sh_checkday',
 *   timeSelect: '#sh_checktime',
 *   apiBaseURL: 'http://localhost:3002'
 * });
 * loader.init();
 */

class TimeSlotLoader {
  /**
   * @param {Object} config - 설정 객체
   * @param {string} config.serviceSelect - 서비스 선택 select 요소 selector
   * @param {string} config.dateInput - 날짜 입력 input 요소 selector
   * @param {string} config.timeSelect - 시간 선택 select 요소 selector
   * @param {string} config.apiBaseURL - API 기본 URL
   * @param {boolean} config.debug - 디버그 모드 (기본값: false)
   */
  constructor(config) {
    this.serviceSelect = document.querySelector(config.serviceSelect);
    this.dateInput = document.querySelector(config.dateInput);
    this.timeSelect = document.querySelector(config.timeSelect);
    this.apiBaseURL = config.apiBaseURL || '';
    this.debug = config.debug || false;

    // State
    this.isLoading = false;
    this.lastLoadedKey = null;
    this.cache = new Map(); // 캐시 (5분 TTL)
    this.cacheTTL = 5 * 60 * 1000; // 5분

    // Static fallback times
    this.staticTimes = [
      { value: '09:00', label: '오전 09:00', period: 'MORNING' },
      { value: '09:30', label: '오전 09:30', period: 'MORNING' },
      { value: '10:00', label: '오전 10:00', period: 'MORNING' },
      { value: '10:30', label: '오전 10:30', period: 'MORNING' },
      { value: '11:00', label: '오전 11:00', period: 'MORNING' },
      { value: '11:30', label: '오전 11:30', period: 'MORNING' },
      { value: '14:00', label: '오후 02:00', period: 'AFTERNOON' },
      { value: '14:30', label: '오후 02:30', period: 'AFTERNOON' },
      { value: '15:00', label: '오후 03:00', period: 'AFTERNOON' },
      { value: '15:30', label: '오후 03:30', period: 'AFTERNOON' },
      { value: '16:00', label: '오후 04:00', period: 'AFTERNOON' },
      { value: '16:30', label: '오후 04:30', period: 'AFTERNOON' }
    ];

    // Validate required elements
    if (!this.serviceSelect || !this.dateInput || !this.timeSelect) {
      console.error('TimeSlotLoader: Required elements not found');
      console.error('serviceSelect:', this.serviceSelect);
      console.error('dateInput:', this.dateInput);
      console.error('timeSelect:', this.timeSelect);
    }
  }

  /**
   * 초기화 - 이벤트 리스너 등록
   */
  init() {
    if (!this.serviceSelect || !this.dateInput || !this.timeSelect) {
      console.warn('TimeSlotLoader: Cannot initialize - missing elements');
      return;
    }

    // 서비스 변경 시 시간 로드
    this.serviceSelect.addEventListener('change', () => {
      this.loadTimeSlots();
    });

    // 날짜 변경 시 시간 로드
    this.dateInput.addEventListener('change', () => {
      this.loadTimeSlots();
    });

    this.log('TimeSlotLoader initialized');

    // 초기 로드 (서비스와 날짜가 이미 선택되어 있다면)
    if (this.serviceSelect.value && this.dateInput.value) {
      this.loadTimeSlots();
    }
  }

  /**
   * 시간 슬롯 로드 (캐싱 포함)
   */
  async loadTimeSlots() {
    const service = this.serviceSelect.value;
    const date = this.dateInput.value;

    // Validate inputs
    if (!service) {
      this.log('No service selected');
      this.renderStaticTimes();
      return;
    }

    if (!date) {
      this.log('No date selected');
      this.renderStaticTimes();
      return;
    }

    // Check if already loaded (avoid duplicate requests)
    const cacheKey = `${service}-${date}`;
    if (this.lastLoadedKey === cacheKey && !this.isExpired(cacheKey)) {
      this.log('Already loaded and cached:', cacheKey);
      return;
    }

    // Check cache
    const cached = this.getCache(cacheKey);
    if (cached) {
      this.log('Loading from cache:', cacheKey);
      this.renderTimeSlots(cached.slots);
      return;
    }

    // Set loading state
    this.setLoading(true);

    try {
      // Fetch time slots from API
      const url = `${this.apiBaseURL}/api/public/reservations/time-slots?service=${encodeURIComponent(service)}&date=${encodeURIComponent(date)}`;
      this.log('Fetching:', url);

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to fetch time slots');
      }

      if (!data.success) {
        throw new Error(data.message || 'API returned error');
      }

      // Cache the result
      this.setCache(cacheKey, data);
      this.lastLoadedKey = cacheKey;

      // Render slots
      this.renderTimeSlots(data.slots);
      this.log('Loaded time slots:', data.slots.length);

    } catch (error) {
      console.error('Error loading time slots:', error);
      this.handleError(error);
      this.renderStaticTimes(); // Fallback to static times
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * 시간 슬롯 렌더링
   * @param {Array} slots - TimeSlot 배열
   */
  renderTimeSlots(slots) {
    // Clear existing options
    this.timeSelect.innerHTML = '<option value="">예약 시간을 선택해주세요.</option>';

    if (!slots || slots.length === 0) {
      this.log('No slots available, showing static times');
      this.renderStaticTimes();
      return;
    }

    // Add each slot
    slots.forEach(slot => {
      const option = document.createElement('option');
      option.value = slot.time;
      option.textContent = this.formatSlotLabel(slot);

      // Disable if not available
      if (!slot.available) {
        option.disabled = true;
        option.textContent += ' (마감)';
      }

      // Add data attributes for styling
      option.dataset.status = slot.status;
      option.dataset.remaining = slot.remaining;

      this.timeSelect.appendChild(option);
    });

    // Apply CSS classes based on status
    this.applySlotStyles();
  }

  /**
   * 정적 시간 렌더링 (Fallback)
   */
  renderStaticTimes() {
    this.timeSelect.innerHTML = '<option value="">예약 시간을 선택해주세요.</option>';

    this.staticTimes.forEach(time => {
      const option = document.createElement('option');
      option.value = time.value;
      option.textContent = time.label;
      this.timeSelect.appendChild(option);
    });

    this.log('Rendered static times (fallback)');
  }

  /**
   * 슬롯 라벨 포맷
   * @param {Object} slot - TimeSlot 객체
   * @returns {string} 포맷된 라벨
   */
  formatSlotLabel(slot) {
    const periodLabel = slot.period === 'MORNING' ? '오전' : '오후';
    const time = slot.time;

    // Format time: "09:00" → "09:00"
    const [hours, minutes] = time.split(':');
    const displayHours = hours.padStart(2, '0');
    const displayMinutes = minutes.padStart(2, '0');

    let label = `${periodLabel} ${displayHours}:${displayMinutes}`;

    // Add status indicator
    if (slot.status === 'available') {
      label += ' ✓'; // 여유
    } else if (slot.status === 'limited') {
      label += ' ⚠'; // 제한
    } else if (slot.status === 'full') {
      label += ' ✕'; // 마감
    }

    return label;
  }

  /**
   * 슬롯 스타일 적용
   */
  applySlotStyles() {
    const options = this.timeSelect.querySelectorAll('option[data-status]');

    options.forEach(option => {
      const status = option.dataset.status;

      // Remove existing classes
      option.classList.remove('slot-available', 'slot-limited', 'slot-full');

      // Add appropriate class
      if (status === 'available') {
        option.classList.add('slot-available');
      } else if (status === 'limited') {
        option.classList.add('slot-limited');
      } else if (status === 'full') {
        option.classList.add('slot-full');
      }
    });
  }

  /**
   * 로딩 상태 설정
   * @param {boolean} loading - 로딩 중 여부
   */
  setLoading(loading) {
    this.isLoading = loading;

    if (loading) {
      this.timeSelect.disabled = true;
      this.timeSelect.innerHTML = '<option value="">로딩 중...</option>';
    } else {
      this.timeSelect.disabled = false;
    }
  }

  /**
   * 에러 처리
   * @param {Error} error - 에러 객체
   */
  handleError(error) {
    console.error('TimeSlotLoader error:', error);

    // Show user-friendly error message
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '시간 로드 실패 - 기본 시간 표시';
    option.disabled = true;
    this.timeSelect.insertBefore(option, this.timeSelect.firstChild);

    // Log for debugging
    this.log('Error:', error.message);
  }

  /**
   * 캐시 설정
   * @param {string} key - 캐시 키
   * @param {Object} data - 캐시할 데이터
   */
  setCache(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
    this.log('Cached:', key);
  }

  /**
   * 캐시 조회
   * @param {string} key - 캐시 키
   * @returns {Object|null} 캐시된 데이터 또는 null
   */
  getCache(key) {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check expiration
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      this.log('Cache expired:', key);
      return null;
    }

    return cached.data;
  }

  /**
   * 캐시 만료 확인
   * @param {string} key - 캐시 키
   * @returns {boolean} 만료 여부
   */
  isExpired(key) {
    const cached = this.cache.get(key);

    if (!cached) {
      return true;
    }

    return Date.now() - cached.timestamp > this.cacheTTL;
  }

  /**
   * 캐시 초기화
   */
  clearCache() {
    this.cache.clear();
    this.lastLoadedKey = null;
    this.log('Cache cleared');
  }

  /**
   * 디버그 로그
   * @param {...any} args - 로그 인자
   */
  log(...args) {
    if (this.debug) {
      console.log('[TimeSlotLoader]', ...args);
    }
  }

  /**
   * 현재 선택된 슬롯 정보 조회
   * @returns {Object|null} 선택된 슬롯 정보
   */
  getSelectedSlot() {
    const selectedOption = this.timeSelect.options[this.timeSelect.selectedIndex];

    if (!selectedOption || !selectedOption.value) {
      return null;
    }

    return {
      time: selectedOption.value,
      status: selectedOption.dataset.status,
      remaining: parseInt(selectedOption.dataset.remaining, 10),
      label: selectedOption.textContent
    };
  }

  /**
   * 특정 시간 선택
   * @param {string} time - 선택할 시간 (예: "09:00")
   */
  selectTime(time) {
    const option = this.timeSelect.querySelector(`option[value="${time}"]`);

    if (option && !option.disabled) {
      this.timeSelect.value = time;
      this.log('Selected time:', time);
      return true;
    }

    this.log('Cannot select time:', time, '(not available or not found)');
    return false;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeSlotLoader;
}
