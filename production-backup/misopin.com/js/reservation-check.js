/**
 * 예약 확인 기능
 */

// 예약 확인 모달 HTML 생성
function createReservationCheckModal() {
    const modalHTML = `
        <div id="reservation_check_modal" class="rsv-check-modal" style="display: none;">
            <div class="rsv-check-overlay"></div>
            <div class="rsv-check-container">
                <button class="rsv-check-close" onclick="closeReservationCheckModal()">
                    <span></span>
                </button>

                <div class="rsv-check-content">
                    <h2 class="rsv-check-title">예약 확인</h2>

                    <!-- 조회 폼 -->
                    <div id="rsv-check-form-section">
                        <p class="rsv-check-desc">예약 정보를 입력하여 예약 내역을 확인하세요.</p>

                        <form id="rsv-check-form" onsubmit="handleReservationCheck(event); return false;">
                            <div class="form-group">
                                <label for="check_name">이름</label>
                                <input type="text" id="check_name" name="name" required
                                       placeholder="예약자 이름" oninput="korean_ck(this)">
                            </div>

                            <div class="form-group">
                                <label for="check_phone">연락처</label>
                                <input type="text" id="check_phone" name="phone" required
                                       placeholder="- 없이 숫자만 입력" oninput="Num_ck(this)"
                                       maxlength="11" inputmode="tel">
                            </div>

                            <div class="form-group">
                                <label for="check_birth">생년월일</label>
                                <input type="text" id="check_birth" name="birth_date" required
                                       placeholder="YYYY-MM-DD" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
                                       oninput="sh_birth_input(this);" maxlength="10" inputmode="numeric">
                            </div>

                            <button type="submit" class="rsv-check-submit">예약 조회</button>
                        </form>
                    </div>

                    <!-- 조회 결과 -->
                    <div id="rsv-check-result-section" style="display: none;">
                        <button class="rsv-check-back" onclick="showReservationCheckForm()">
                            ← 다시 조회
                        </button>

                        <div id="rsv-check-results"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 모달이 이미 있으면 제거
    const existingModal = document.getElementById('reservation_check_modal');
    if (existingModal) {
        existingModal.remove();
    }

    // body에 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 예약 확인 모달 열기
function openReservationCheckModal() {
    // 모달이 없으면 생성
    if (!document.getElementById('reservation_check_modal')) {
        createReservationCheckModal();
    }

    // 모달 표시
    const modal = document.getElementById('reservation_check_modal');
    modal.style.display = 'block';

    // 폼 초기화
    showReservationCheckForm();

    // body 스크롤 방지
    document.body.style.overflow = 'hidden';
}

// 예약 확인 모달 닫기
function closeReservationCheckModal() {
    const modal = document.getElementById('reservation_check_modal');
    if (modal) {
        modal.style.display = 'none';
    }

    // body 스크롤 복원
    document.body.style.overflow = '';
}

// 폼 표시
function showReservationCheckForm() {
    document.getElementById('rsv-check-form-section').style.display = 'block';
    document.getElementById('rsv-check-result-section').style.display = 'none';

    // 폼 초기화
    document.getElementById('rsv-check-form').reset();
}

// 결과 표시
function showReservationCheckResults(reservations) {
    document.getElementById('rsv-check-form-section').style.display = 'none';
    document.getElementById('rsv-check-result-section').style.display = 'block';

    const resultsContainer = document.getElementById('rsv-check-results');

    if (!reservations || reservations.length === 0) {
        resultsContainer.innerHTML = `
            <div class="rsv-check-empty">
                <p>예약 내역이 없습니다.</p>
            </div>
        `;
        return;
    }

    // 예약 내역 표시
    resultsContainer.innerHTML = `
        <div class="rsv-check-list">
            <h3>예약 내역 (${reservations.length}건)</h3>
            ${reservations.map(reservation => `
                <div class="rsv-check-item" data-id="${reservation.id}">
                    <div class="rsv-check-item-header">
                        <span class="rsv-check-status status-${reservation.status}">
                            ${getStatusText(reservation.status)}
                        </span>
                        <span class="rsv-check-date">
                            ${formatDateTime(reservation.preferred_date, reservation.preferred_time)}
                        </span>
                    </div>

                    <div class="rsv-check-item-body">
                        <div class="rsv-info-row">
                            <span class="rsv-label">진료 항목:</span>
                            <span class="rsv-value">${reservation.service}</span>
                        </div>
                        <div class="rsv-info-row">
                            <span class="rsv-label">진료 종류:</span>
                            <span class="rsv-value">${reservation.treatment_type === 'FIRST_VISIT' ? '초진' : '재진'}</span>
                        </div>
                        ${reservation.notes ? `
                            <div class="rsv-info-row">
                                <span class="rsv-label">메모:</span>
                                <span class="rsv-value">${reservation.notes}</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="rsv-check-item-footer">
                        ${reservation.status === 'PENDING' ? `
                            <button class="rsv-cancel-btn" onclick="handleReservationCancel('${reservation.id}')">
                                예약 취소
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 예약 상태 텍스트 변환
function getStatusText(status) {
    const statusMap = {
        'PENDING': '대기중',
        'CONFIRMED': '확정',
        'CANCELLED': '취소됨',
        'COMPLETED': '완료'
    };
    return statusMap[status] || status;
}

// 날짜/시간 포맷
function formatDateTime(date, time) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}.${month}.${day} ${time}`;
}

// 예약 조회 처리
async function handleReservationCheck(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    // 전화번호 포맷팅
    let phone = formData.get('phone');
    if (phone && phone.length === 11) {
        phone = phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (phone && phone.length === 10) {
        phone = phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }

    const queryData = {
        name: formData.get('name'),
        phone: phone,
        birth_date: formData.get('birth_date')
    };

    try {
        // 로딩 표시
        const submitBtn = form.querySelector('.rsv-check-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '조회 중...';
        submitBtn.disabled = true;

        // API 호출
        const api = new MisopinAPI();
        const response = await api.queryReservations(queryData);

        if (response.success) {
            // 결과 표시
            showReservationCheckResults(response.reservations);
        } else {
            alert('예약 조회에 실패했습니다. 입력 정보를 확인해주세요.');
        }

        // 버튼 복원
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

    } catch (error) {
        console.error('Reservation query error:', error);
        alert('예약 조회 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');

        // 버튼 복원
        const submitBtn = form.querySelector('.rsv-check-submit');
        submitBtn.textContent = '예약 조회';
        submitBtn.disabled = false;
    }
}

// 예약 취소 처리
async function handleReservationCancel(reservationId) {
    if (!confirm('정말 예약을 취소하시겠습니까?\n취소된 예약은 복구할 수 없습니다.')) {
        return;
    }

    // 인증 정보 가져오기 (이미 입력된 정보 사용)
    const phone = document.getElementById('check_phone').value;
    const birthDate = document.getElementById('check_birth').value;

    // 전화번호 포맷팅
    let formattedPhone = phone;
    if (phone && phone.length === 11) {
        formattedPhone = phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (phone && phone.length === 10) {
        formattedPhone = phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }

    const verifyData = {
        phone: formattedPhone,
        birth_date: birthDate
    };

    try {
        // API 호출
        const api = new MisopinAPI();
        const response = await api.cancelReservation(reservationId, verifyData);

        if (response.success) {
            alert('예약이 취소되었습니다.');

            // 목록 다시 조회
            const queryData = {
                name: document.getElementById('check_name').value,
                phone: formattedPhone,
                birth_date: birthDate
            };

            const queryResponse = await api.queryReservations(queryData);
            if (queryResponse.success) {
                showReservationCheckResults(queryResponse.reservations);
            }
        } else {
            alert('예약 취소에 실패했습니다.\n' + (response.message || '다시 시도해주세요.'));
        }

    } catch (error) {
        console.error('Reservation cancel error:', error);
        alert('예약 취소 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');
    }
}

// 기존 rsv_chk 함수 오버라이드 (전역 스코프에 확실하게 등록)
window.rsv_chk = function(link, type) {
    console.log('rsv_chk called with:', link, type);
    openReservationCheckModal();
    return false;
}

// DOM 로드 시 모달 생성
document.addEventListener('DOMContentLoaded', function() {
    console.log('Reservation check module loading...');
    createReservationCheckModal();

    // rsv_chk 함수가 제대로 오버라이드 되었는지 확인
    if (typeof window.rsv_chk === 'function') {
        console.log('rsv_chk function is ready');
    } else {
        console.error('rsv_chk function is not defined');
    }
});

// 페이지 로드 완료 후 한번 더 오버라이드 (외부 스크립트가 나중에 로드되는 경우 대비)
window.addEventListener('load', function() {
    console.log('Window load event - overriding rsv_chk again...');
    window.rsv_chk = function(link, type) {
        console.log('rsv_chk called (from load event) with:', link, type);
        openReservationCheckModal();
        return false;
    }
});