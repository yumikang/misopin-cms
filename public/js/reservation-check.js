/**
 * 예약 확인 기능
 * 전화번호로 예약 조회 및 취소
 */

(function() {
  'use strict';

  // Modal state
  let currentView = 'form'; // 'form' or 'results'
  let currentReservations = [];
  let api = null;

  /**
   * 모달 생성
   */
  function createReservationCheckModal() {
    // API 인스턴스 초기화
    if (typeof MisopinAPI !== 'undefined') {
      api = new MisopinAPI();
    } else {
      console.error('MisopinAPI not found');
      alert('시스템 오류가 발생했습니다. 페이지를 새로고침 해주세요.');
      return;
    }

    const modalHTML = `
      <div id="rsv-check-modal" class="rsv-check-modal" style="display: none;">
        <div class="rsv-check-overlay" onclick="closeReservationCheckModal()"></div>
        <div class="rsv-check-container">
          <button class="rsv-check-close" onclick="closeReservationCheckModal()">
            <span></span>
          </button>
          <div class="rsv-check-content" id="rsv-check-view"></div>
        </div>
      </div>
    `;

    // 기존 모달 제거 후 추가
    const existingModal = document.getElementById('rsv-check-modal');
    if (existingModal) {
      existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  /**
   * 폼 뷰 렌더링
   */
  function renderFormView() {
    currentView = 'form';
    const viewContainer = document.getElementById('rsv-check-view');

    viewContainer.innerHTML = `
      <h2 class="rsv-check-title">예약 확인</h2>
      <p class="rsv-check-desc">전화번호를 입력하여 예약 내역을 조회하세요</p>

      <form id="rsv-check-form">
        <div class="form-group">
          <label for="check_phone">전화번호 *</label>
          <input
            type="tel"
            id="check_phone"
            name="phone"
            placeholder="010-1234-5678"
            required
            pattern="[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}"
          />
        </div>

        <button type="submit" class="rsv-check-submit">조회하기</button>
      </form>
    `;

    // 폼 이벤트 핸들러 등록
    const form = document.getElementById('rsv-check-form');
    form.addEventListener('submit', handleReservationCheck);
  }

  /**
   * 결과 뷰 렌더링
   */
  function renderResultsView(reservations) {
    currentView = 'results';
    currentReservations = reservations;
    const viewContainer = document.getElementById('rsv-check-view');

    if (!reservations || reservations.length === 0) {
      viewContainer.innerHTML = `
        <button class="rsv-check-back" onclick="window.reservationCheckBackToForm()">
          ← 뒤로가기
        </button>
        <div class="rsv-check-empty">
          <p>조회된 예약 내역이 없습니다.</p>
          <p style="font-size: 14px; color: #999; margin-top: 10px;">
            최근 90일 이내의 예약만 조회됩니다.
          </p>
        </div>
      `;
      return;
    }

    const reservationItems = reservations.map(rsv => {
      const statusText = getStatusText(rsv.status);
      const canCancel = rsv.status === 'PENDING';

      return `
        <div class="rsv-check-item">
          <div class="rsv-check-item-header">
            <span class="rsv-check-status status-${rsv.status}">${statusText}</span>
            <span class="rsv-check-date">${formatDate(rsv.preferred_date)}</span>
          </div>
          <div class="rsv-check-item-body">
            <div class="rsv-info-row">
              <span class="rsv-label">예약 시간</span>
              <span class="rsv-value">${rsv.preferred_time}</span>
            </div>
            <div class="rsv-info-row">
              <span class="rsv-label">이름</span>
              <span class="rsv-value">${rsv.patient_name}</span>
            </div>
            <div class="rsv-info-row">
              <span class="rsv-label">시술 종류</span>
              <span class="rsv-value">${rsv.service_name}</span>
            </div>
            ${rsv.notes ? `
              <div class="rsv-info-row">
                <span class="rsv-label">요청사항</span>
                <span class="rsv-value">${rsv.notes}</span>
              </div>
            ` : ''}
          </div>
          ${canCancel ? `
            <div class="rsv-check-item-footer">
              <button
                class="rsv-cancel-btn"
                onclick="window.handleReservationCancel('${rsv.id}')"
              >
                예약 취소
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    viewContainer.innerHTML = `
      <button class="rsv-check-back" onclick="window.reservationCheckBackToForm()">
        ← 뒤로가기
      </button>
      <div class="rsv-check-list">
        <h3>예약 내역 (${reservations.length}건)</h3>
        ${reservationItems}
      </div>
    `;
  }

  /**
   * 예약 조회 핸들러
   */
  async function handleReservationCheck(event) {
    // event가 없으면 early return
    if (!event) {
      console.error('Event is undefined');
      return;
    }

    event.preventDefault();

    const form = event.target;
    const phone = form.querySelector('#check_phone').value;
    const submitBtn = form.querySelector('.rsv-check-submit');

    // 유효성 검사
    if (!phone) {
      alert('전화번호를 입력해주세요.');
      return;
    }

    try {
      // 버튼 비활성화
      submitBtn.disabled = true;
      submitBtn.textContent = '조회 중...';

      // API 호출
      const response = await api.checkReservationsByPhone(phone);

      if (response.success) {
        renderResultsView(response.reservations);
      } else {
        throw new Error(response.error || '예약 조회에 실패했습니다.');
      }

    } catch (error) {
      console.error('예약 조회 오류:', error);

      // 429 Rate Limit 에러 처리
      if (error.status === 429) {
        alert('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
      } else if (error.code === 'INVALID_PHONE_FORMAT') {
        alert('올바른 전화번호 형식이 아닙니다.\n(예: 010-1234-5678)');
      } else {
        alert(error.message || '예약 조회 중 오류가 발생했습니다.');
      }

    } finally {
      // 버튼 활성화
      submitBtn.disabled = false;
      submitBtn.textContent = '조회하기';
    }
  }

  /**
   * 예약 취소 핸들러
   */
  async function handleReservationCancel(reservationId) {
    if (!confirm('정말 예약을 취소하시겠습니까?')) {
      return;
    }

    const reservation = currentReservations.find(r => r.id === reservationId);
    if (!reservation) {
      alert('예약 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      // Cancel API 호출 - phone으로 검증
      const response = await api.cancelReservation(reservationId, {
        phone: reservation.phone
      });

      if (response.success) {
        alert('예약이 취소되었습니다.');
        // 결과 다시 조회
        const checkResponse = await api.checkReservationsByPhone(reservation.phone);
        if (checkResponse.success) {
          renderResultsView(checkResponse.reservations);
        }
      } else {
        throw new Error(response.error || '예약 취소에 실패했습니다.');
      }

    } catch (error) {
      console.error('예약 취소 오류:', error);
      alert(error.message || '예약 취소 중 오류가 발생했습니다.');
    }
  }

  /**
   * 뒤로가기 핸들러
   */
  function backToForm() {
    renderFormView();
  }

  /**
   * 모달 열기
   */
  function openReservationCheckModal() {
    createReservationCheckModal();
    const modal = document.getElementById('rsv-check-modal');
    if (modal) {
      modal.style.display = 'block';
      renderFormView();

      // 포커스
      setTimeout(() => {
        const phoneInput = document.getElementById('check_phone');
        if (phoneInput) {
          phoneInput.focus();
        }
      }, 100);
    }
  }

  /**
   * 모달 닫기
   */
  function closeReservationCheckModal() {
    const modal = document.getElementById('rsv-check-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    currentView = 'form';
    currentReservations = [];
  }

  /**
   * 상태 텍스트 변환
   */
  function getStatusText(status) {
    const statusMap = {
      'PENDING': '대기중',
      'CONFIRMED': '확정',
      'CANCELLED': '취소됨',
      'COMPLETED': '완료',
      'NO_SHOW': '노쇼'
    };
    return statusMap[status] || status;
  }

  /**
   * 날짜 포맷팅
   */
  function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${year}.${month}.${day} (${weekday})`;
  }

  // 전역 함수로 노출 (HTML onclick에서 사용)
  window.openReservationCheckModal = openReservationCheckModal;
  window.closeReservationCheckModal = closeReservationCheckModal;
  window.handleReservationCancel = handleReservationCancel;
  window.reservationCheckBackToForm = backToForm;

  // rsv_chk 함수 등록 (기존 calendar-page.html 호환성)
  window.rsv_chk = function(link, type) {
    openReservationCheckModal();
    return false;
  };

  console.log('Reservation Check module loaded');
})();
