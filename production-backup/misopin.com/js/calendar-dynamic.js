/**
 * Dynamic Calendar Generator
 * URL 파라미터를 읽어서 해당 월의 달력을 동적으로 생성
 */

(function() {
  'use strict';

  // URL 파라미터 파싱
  function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  }

  // 달력 생성 함수
  function generateCalendar(year, month) {
    console.log(`Generating calendar for ${year}-${month}`);

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const prevLastDay = new Date(year, month - 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = prevLastDay.getDate();

    // 이전/다음 달 계산
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    // 제목 업데이트
    const titleElement = document.querySelector('#mara_cal_view .title');
    if (titleElement) {
      const monthStr = String(month).padStart(2, '0');
      titleElement.innerHTML = `
        <a href="#none" onclick="movePage('${prevYear}-${String(prevMonth).padStart(2, '0')}-01');"><span class="c_btn prev_btn"><i class="fa fa-angle-left"></i></span></a>
        ${year}년 ${monthStr}월
        <a href="#none" onclick="movePage('${nextYear}-${String(nextMonth).padStart(2, '0')}-01');"><span class="c_btn next_btn"><i class="fa fa-angle-right"></i></span></a>
      `;
    }

    // 달력 테이블 바디 생성
    const tbody = document.querySelector('#mara_cal_view tbody');
    if (!tbody) return;

    tbody.innerHTML = ''; // 기존 내용 지우기

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let html = '<tr>';
    let date = 1;

    // 첫 주의 이전 달 날짜들
    for (let i = 0; i < firstDayOfWeek; i++) {
      html += '<td class="null">&nbsp;</td>';
    }

    // 이번 달 날짜들
    for (let i = firstDayOfWeek; i < 7; i++) {
      html += generateDayCell(year, month, date, i, today);
      date++;
    }
    html += '</tr>';

    // 나머지 주들
    while (date <= daysInMonth) {
      html += '<tr>';
      for (let i = 0; i < 7; i++) {
        if (date <= daysInMonth) {
          html += generateDayCell(year, month, date, i, today);
          date++;
        } else {
          html += '<td class="null">&nbsp;</td>';
        }
      }
      html += '</tr>';
    }

    tbody.innerHTML = html;
  }

  // 날짜 셀 생성
  function generateDayCell(year, month, day, dayOfWeek, today) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cellDate = new Date(year, month - 1, day);

    // 요일별 클래스
    let dayClass = '';
    if (dayOfWeek === 0) dayClass = 't_red'; // 일요일
    else if (dayOfWeek === 6) dayClass = 't_blue'; // 토요일

    // 과거 날짜인지 확인
    if (cellDate < today) {
      return `<td class="null"><p class="title_day t_gray"><span class="day t_gray">${day} </span></p>예약종료</td>`;
    }

    // 예약 가능한 날짜
    const weekDay = dayOfWeek + 1; // 1-7로 변환
    return `
      <td class="">
        <p class="title_day ${dayClass}">
          <a class="day ${dayClass}" href="javascript:void(0)" onclick="calendar_inqOpen();selectday('https://skincare1007.shiningcorp.com/skin/board/hos_calendar','${dateStr}','','${weekDay}','','')">${day} </a>
        </p>
        <a href="javascript:void(0)" onclick="calendar_inqOpen();selectday('https://skincare1007.shiningcorp.com/skin/board/hos_calendar','${dateStr}','','${weekDay}','','')">예약가능</a>
      </td>`;
  }

  // 초기화
  function init() {
    const selectParam = getUrlParam('select');

    let year, month;

    if (selectParam) {
      // select 파라미터에서 년월 추출
      const match = selectParam.match(/(\d{4})-(\d{2})/);
      if (match) {
        year = parseInt(match[1]);
        month = parseInt(match[2]);
      }
    }

    // 파라미터가 없으면 현재 날짜 사용
    if (!year || !month) {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    console.log(`Calendar init: ${year}-${month}`);

    // DOM이 준비된 후 달력 생성
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        generateCalendar(year, month);
        // API 데이터도 로드
        if (typeof loadReservationStatus === 'function') {
          loadReservationStatus();
        }
      });
    } else {
      generateCalendar(year, month);
      // API 데이터도 로드
      if (typeof loadReservationStatus === 'function') {
        loadReservationStatus();
      }
    }
  }

  // 시작
  init();

  // 전역 함수로 노출 (다른 스크립트에서 사용 가능)
  window.generateCalendar = generateCalendar;

})();