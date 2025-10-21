/**
 * Calendar Integration with CMS
 * Handles dynamic calendar updates with real reservation data
 */

(function() {
  'use strict';

  // Get current month and year from calendar or URL
  function getCurrentMonthYear() {
    // 먼저 URL 파라미터에서 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const selectParam = urlParams.get('select');

    if (selectParam) {
      const match = selectParam.match(/(\d{4})-(\d{2})/);
      if (match) {
        return {
          year: parseInt(match[1]),
          month: parseInt(match[2])
        };
      }
    }

    // URL에 없으면 달력 제목에서 가져오기
    const titleElement = document.querySelector('#mara_cal_view .title');
    if (!titleElement) return null;

    const titleText = titleElement.textContent.trim();
    const titleMatch = titleText.match(/(\d{4})년\s+(\d{2})월/);

    if (!titleMatch) {
      // 기본값으로 현재 날짜 사용
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth() + 1
      };
    }

    return {
      year: parseInt(titleMatch[1]),
      month: parseInt(titleMatch[2])
    };
  }

  // Update calendar cell with reservation status
  function updateCalendarCell(date, status) {
    // Find all calendar cells
    const cells = document.querySelectorAll('#mara_cal_view tbody td');

    cells.forEach(cell => {
      const dayLink = cell.querySelector('.day');
      if (!dayLink) return;

      const dayNum = parseInt(dayLink.textContent.trim());
      const dateObj = new Date(date);

      if (dayNum === dateObj.getDate()) {
        // Find the status text element (예약가능/예약종료/예약마감)
        const statusElement = cell.querySelector('a:not(.day)') || cell;

        if (status.status === 'closed') {
          // Past date
          cell.className = 'null';
          if (statusElement && statusElement !== cell) {
            statusElement.textContent = '예약종료';
            statusElement.removeAttribute('href');
            statusElement.removeAttribute('onclick');
          } else {
            cell.innerHTML = cell.innerHTML.replace(/예약가능|예약마감/g, '예약종료');
          }
        } else if (status.status === 'full') {
          // Fully booked
          cell.className = 'full';
          if (statusElement && statusElement !== cell) {
            statusElement.textContent = '예약마감';
            statusElement.style.color = '#999';
            statusElement.removeAttribute('href');
            statusElement.removeAttribute('onclick');
          }
        } else {
          // Available
          if (statusElement && statusElement !== cell) {
            statusElement.textContent = `예약가능 (${status.availableSlots.length}슬롯)`;
          }
        }
      }
    });
  }

  // Load reservation status from API
  async function loadReservationStatus() {
    try {
      const monthYear = getCurrentMonthYear();
      if (!monthYear) {
        console.log('Could not get current month/year from calendar');
        return;
      }

      console.log(`Loading reservation status for ${monthYear.year}-${monthYear.month}`);

      if (typeof misopinAPI === 'undefined') {
        console.error('misopinAPI not available');
        return;
      }

      const data = await misopinAPI.getReservationStatus(monthYear.year, monthYear.month);
      console.log('Reservation status loaded:', data);

      // Update each day in the calendar
      Object.entries(data.availability).forEach(([date, status]) => {
        updateCalendarCell(date, status);
      });

      // Add summary information
      const calendarView = document.querySelector('#mara_cal_view');
      let summaryElement = document.querySelector('.reservation-summary');

      if (!summaryElement) {
        summaryElement = document.createElement('div');
        summaryElement.className = 'reservation-summary';
        summaryElement.style.cssText = 'margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; text-align: center;';
        calendarView.appendChild(summaryElement);
      }

      summaryElement.innerHTML = `
        <strong>이번 달 예약 현황:</strong>
        예약 가능일 ${data.summary.availableDays}일 |
        예약 마감 ${data.summary.fullDays}일 |
        예약 종료 ${data.summary.closedDays}일
      `;

    } catch (error) {
      console.error('Failed to load reservation status:', error);
    }
  }

  // Initialize when DOM is ready
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadReservationStatus);
    } else {
      // Add a small delay to ensure calendar is rendered
      setTimeout(loadReservationStatus, 500);
    }

    // Also update when URL changes (navigation)
    const originalMovePage = window.movePage;
    if (originalMovePage) {
      window.movePage = function(select) {
        originalMovePage(select);
        // Reload reservation status after navigation
        setTimeout(loadReservationStatus, 1000);
      };
    }
  }

  // Start initialization
  init();

})();