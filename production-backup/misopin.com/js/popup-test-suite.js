/**
 * Popup System Test Suite
 * Comprehensive testing and monitoring for popup functionality
 */

(function() {
  'use strict';

  window.PopupTestSuite = {
    version: '1.0.0',
    tests: [],
    results: {},

    log: function(message, data) {
      console.log(`[Popup Test Suite] ${message}`, data || '');
    },

    error: function(message, error) {
      console.error(`[Popup Test Suite ERROR] ${message}`, error || '');
    },

    // Test 1: API Connectivity
    async testAPIConnectivity() {
      this.log('Testing API connectivity...');
      try {
        const popups = await misopinAPI.getPopups();
        const success = Array.isArray(popups);
        this.results.apiConnectivity = {
          passed: success,
          data: popups,
          error: null
        };
        this.log('API connectivity test:', success ? 'PASSED' : 'FAILED');
        return success;
      } catch (error) {
        this.results.apiConnectivity = {
          passed: false,
          data: null,
          error: error.message
        };
        this.error('API connectivity test FAILED:', error);
        return false;
      }
    },

    // Test 2: Dependency Check
    testDependencies() {
      this.log('Testing dependencies...');
      const dependencies = {
        misopinAPI: typeof misopinAPI !== 'undefined',
        MisopinHelpers: typeof MisopinHelpers !== 'undefined',
        popupSystem: typeof MisopinPopupSystem !== 'undefined'
      };

      const allPresent = Object.values(dependencies).every(dep => dep === true);
      this.results.dependencies = {
        passed: allPresent,
        data: dependencies,
        error: allPresent ? null : 'Missing dependencies'
      };

      this.log('Dependencies test:', allPresent ? 'PASSED' : 'FAILED', dependencies);
      return allPresent;
    },

    // Test 3: Popup Creation
    testPopupCreation() {
      this.log('Testing popup creation...');
      const testPopup = {
        id: 'test-popup-' + Date.now(),
        title: 'Test Popup',
        content: 'This is a test popup for validation',
        display_type: 'MODAL',
        position: 'CENTER'
      };

      try {
        MisopinHelpers.showPopup(testPopup);
        const popupElement = document.getElementById(`popup-${testPopup.id}`);
        const success = popupElement !== null;

        // Clean up test popup
        if (popupElement) {
          setTimeout(() => {
            MisopinHelpers.closePopup(testPopup.id);
          }, 1000);
        }

        this.results.popupCreation = {
          passed: success,
          data: { popupExists: success, popupId: testPopup.id },
          error: success ? null : 'Popup element not created'
        };

        this.log('Popup creation test:', success ? 'PASSED' : 'FAILED');
        return success;
      } catch (error) {
        this.results.popupCreation = {
          passed: false,
          data: null,
          error: error.message
        };
        this.error('Popup creation test FAILED:', error);
        return false;
      }
    },

    // Test 4: System Initialization
    testInitialization() {
      this.log('Testing system initialization...');
      const initialized = window.MisopinPopupSystem && window.MisopinPopupSystem.initialized;

      this.results.initialization = {
        passed: initialized,
        data: {
          systemExists: typeof MisopinPopupSystem !== 'undefined',
          initialized: initialized,
          version: MisopinPopupSystem?.version,
          loadTime: MisopinPopupSystem?.loadTime
        },
        error: initialized ? null : 'System not properly initialized'
      };

      this.log('Initialization test:', initialized ? 'PASSED' : 'FAILED');
      return initialized;
    },

    // Run all tests
    async runAllTests() {
      this.log('Starting comprehensive popup system test...');
      const startTime = Date.now();

      try {
        // Run tests in sequence
        await this.testAPIConnectivity();
        this.testDependencies();
        this.testInitialization();
        this.testPopupCreation();

        const endTime = Date.now();
        const totalTests = Object.keys(this.results).length;
        const passedTests = Object.values(this.results).filter(result => result.passed).length;

        const summary = {
          totalTests,
          passedTests,
          failedTests: totalTests - passedTests,
          duration: endTime - startTime,
          timestamp: new Date().toISOString(),
          overallStatus: passedTests === totalTests ? 'ALL PASSED' : 'SOME FAILED'
        };

        this.results.summary = summary;
        this.log('Test suite completed:', summary.overallStatus, summary);

        // Display results in console table
        console.table(
          Object.entries(this.results)
            .filter(([key]) => key !== 'summary')
            .map(([test, result]) => ({
              Test: test,
              Status: result.passed ? '✅ PASSED' : '❌ FAILED',
              Error: result.error || 'None'
            }))
        );

        return summary;
      } catch (error) {
        this.error('Test suite failed to complete:', error);
        return { overallStatus: 'ERROR', error: error.message };
      }
    },

    // Generate detailed report
    generateReport() {
      const report = {
        timestamp: new Date().toISOString(),
        systemInfo: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          popupSystemVersion: window.MisopinPopupSystem?.version,
          testSuiteVersion: this.version
        },
        testResults: this.results
      };

      console.log('=== POPUP SYSTEM DIAGNOSTIC REPORT ===');
      console.log(JSON.stringify(report, null, 2));

      return report;
    }
  };

  // Auto-run tests after page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.PopupTestSuite.runAllTests();
      }, 3000); // Wait 3 seconds for system to initialize
    });
  } else {
    setTimeout(() => {
      window.PopupTestSuite.runAllTests();
    }, 3000);
  }

  // Expose testing functions globally
  window.testPopups = () => window.PopupTestSuite.runAllTests();
  window.popupReport = () => window.PopupTestSuite.generateReport();

})();