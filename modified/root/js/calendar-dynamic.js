/**
 * 동적 캘린더 렌더링 스크립트
 * 현재 날짜 기준으로 예약 가능 날짜 표시
 */

(function() {
    'use strict';

    // 현재 날짜 정보
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 0-based이므로 +1
    const currentDate = today.getDate();

    console.log('Dynamic Calendar: 현재 날짜', currentYear, currentMonth, currentDate);

    // 캘린더 동적 렌더링
    function renderCalendar(year, month) {
        console.log('Rendering calendar for:', year, month);

        // 월의 첫날과 마지막 날 계산
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0 = 일요일

        // 캘린더 테이블 생성
        const weeks = [];
        let currentWeek = [];

        // 첫 주의 빈 칸 채우기
        for (let i = 0; i < startDayOfWeek; i++) {
            currentWeek.push({ day: null, isAvailable: false });
        }

        // 날짜 채우기
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month - 1, day);
            const dayOfWeek = dateObj.getDay();

            // 과거 날짜 체크
            const isPast = (year < currentYear) ||
                          (year === currentYear && month < currentMonth) ||
                          (year === currentYear && month === currentMonth && day < currentDate);

            // 일요일 체크 (선택사항: 일요일 휴진 처리)
            const isSunday = dayOfWeek === 0;

            currentWeek.push({
                day: day,
                dayOfWeek: dayOfWeek,
                isAvailable: !isPast && !isSunday,
                isPast: isPast,
                isSunday: isSunday
            });

            // 토요일이면 주 끝
            if (dayOfWeek === 6) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }

        // 마지막 주 처리
        if (currentWeek.length > 0) {
            // 남은 칸 채우기
            while (currentWeek.length < 7) {
                currentWeek.push({ day: null, isAvailable: false });
            }
            weeks.push(currentWeek);
        }

        return weeks;
    }

    // 캘린더 HTML 생성
    function generateCalendarHTML(year, month) {
        const weeks = renderCalendar(year, month);
        const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

        let html = '<tr>';
        weeks.forEach(week => {
            week.forEach(dayInfo => {
                if (dayInfo.day === null) {
                    html += '<td class="null">&nbsp;</td>';
                } else if (!dayInfo.isAvailable) {
                    // 과거 날짜 또는 휴진일
                    html += `<td class="null"><p class="title_day t_gray"><span class="day t_gray">${dayInfo.day} </span></p>예약종료</td>`;
                } else {
                    // 예약 가능 날짜
                    const colorClass = dayInfo.dayOfWeek === 0 ? 't_red' : (dayInfo.dayOfWeek === 6 ? 't_blue' : '');
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayInfo.day).padStart(2, '0')}`;

                    html += `<td class="">
                        <p class="title_day ${colorClass}">
                            <a class="day ${colorClass}" href="javascript:void(0)"
                               onclick="calendar_inqOpen();selectday('', '${dateStr}','','${dayInfo.dayOfWeek + 1}','','')">
                                ${dayInfo.day}
                            </a>
                        </p>
                        <a href="javascript:void(0)"
                           onclick="calendar_inqOpen();selectday('', '${dateStr}','','${dayInfo.dayOfWeek + 1}','','')">
                            예약가능
                        </a>
                    </td>`;
                }
            });
            html += '</tr><tr>';
        });
        html += '</tr>';

        return html;
    }

    // 캘린더 초기화
    function initCalendar() {
        console.log('Initializing dynamic calendar...');

        const calendarTitle = document.querySelector('#mara_cal_view .title');
        const calendarBody = document.querySelector('#mara_cal_view .tbl_mara tbody');

        if (!calendarBody) {
            console.error('Calendar body not found');
            return;
        }

        // 초기 캘린더 렌더링 (현재 월)
        const calendarHTML = generateCalendarHTML(currentYear, currentMonth);
        calendarBody.innerHTML = calendarHTML;

        // 타이틀 업데이트
        if (calendarTitle) {
            const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
            const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
            const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
            const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

            calendarTitle.innerHTML = `
                <a href="#none" onclick="changeMonth(${prevYear}, ${prevMonth})">
                    <span class="c_btn prev_btn"><i class="fa fa-angle-left"></i></span>
                </a>
                ${currentYear}년 ${currentMonth}월
                <a href="#none" onclick="changeMonth(${nextYear}, ${nextMonth})">
                    <span class="c_btn next_btn"><i class="fa fa-angle-right"></i></span>
                </a>
            `;
        }

        console.log('Calendar initialized successfully');
    }

    // 월 변경 함수 (전역)
    window.changeMonth = function(year, month) {
        console.log('Changing month to:', year, month);

        const calendarBody = document.querySelector('#mara_cal_view .tbl_mara tbody');
        const calendarTitle = document.querySelector('#mara_cal_view .title');

        if (calendarBody) {
            const calendarHTML = generateCalendarHTML(year, month);
            calendarBody.innerHTML = calendarHTML;
        }

        if (calendarTitle) {
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            const nextMonth = month === 12 ? 1 : month + 1;
            const nextYear = month === 12 ? year + 1 : year;

            calendarTitle.innerHTML = `
                <a href="#none" onclick="changeMonth(${prevYear}, ${prevMonth})">
                    <span class="c_btn prev_btn"><i class="fa fa-angle-left"></i></span>
                </a>
                ${year}년 ${month}월
                <a href="#none" onclick="changeMonth(${nextYear}, ${nextMonth})">
                    <span class="c_btn next_btn"><i class="fa fa-angle-right"></i></span>
                </a>
            `;
        }
    };

    // selectday 함수 개선 (날짜 선택 시)
    window.selectday = function(url, dateStr, param1, dayOfWeek, param2, param3) {
        console.log('Date selected:', dateStr);

        // 폼에 날짜 설정
        const checkdayInput = document.getElementById('sh_checkday');
        if (checkdayInput) {
            checkdayInput.value = dateStr;
        }

        // 모달 열기 (이미 calendar_inqOpen()이 호출됨)
    };

    // DOM 로드 후 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCalendar);
    } else {
        initCalendar();
    }

})();
