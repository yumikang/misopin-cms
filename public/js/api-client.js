/**
 * Misopin API Client
 * Handles all API communication with the CMS backend
 */
(function(window) {
  'use strict';

  const CONFIG = {
    API_BASE_URL: 'https://cms.one-q.xyz',
    TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY: 1000 // 1 second
  };

  class MisopinAPI {
    constructor(baseURL = CONFIG.API_BASE_URL) {
      this.baseURL = baseURL;
    }

    /**
     * Submit a new reservation
     * @param {Object} data - Reservation data
     * @returns {Promise<Object>} API response
     */
    async submitReservation(data) {
      const url = `${this.baseURL}/api/public/reservations`;

      try {
        const response = await this._fetchWithRetry(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || result.error || 'Reservation submission failed');
        }

        return result;

      } catch (error) {
        console.error('Reservation submission error:', error);
        throw error;
      }
    }

    /**
     * Get available time slots for a service and date
     * @param {string} service - Service code
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<Object>} Time slots data
     */
    async getTimeSlots(service, date) {
      const url = `${this.baseURL}/api/public/reservations/time-slots?service=${encodeURIComponent(service)}&date=${encodeURIComponent(date)}`;

      try {
        const response = await this._fetchWithRetry(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Failed to load time slots');
        }

        return result;

      } catch (error) {
        console.error('Time slots fetch error:', error);
        throw error;
      }
    }

    /**
     * Submit a board post (for forums)
     * @param {Object} data - Post data
     * @returns {Promise<Object>} API response
     */
    async submitPost(data) {
      const url = `${this.baseURL}/api/public/posts`;

      try {
        const response = await this._fetchWithRetry(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Post submission failed');
        }

        return result;

      } catch (error) {
        console.error('Post submission error:', error);
        throw error;
      }
    }

    /**
     * Fetch with retry logic
     * @private
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @param {number} attempt - Current attempt number
     * @returns {Promise<Response>} Fetch response
     */
    async _fetchWithRetry(url, options, attempt = 1) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeout);
        return response;

      } catch (error) {
        if (attempt < CONFIG.RETRY_ATTEMPTS) {
          console.warn(`Fetch attempt ${attempt} failed, retrying...`, error);
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
          return this._fetchWithRetry(url, options, attempt + 1);
        }
        throw error;
      }
    }
  }

  // Expose to window
  window.MisopinAPI = MisopinAPI;

})(window);
