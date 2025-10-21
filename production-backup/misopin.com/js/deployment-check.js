/**
 * Production Deployment Verification Script
 * Quick check for popup system functionality in production
 */

(function() {
  'use strict';

  console.log('🚀 [Deployment Check] Starting popup system verification...');

  // Quick verification function
  function quickCheck() {
    const checks = {
      timestamp: new Date().toISOString(),
      environment: {
        hostname: window.location.hostname,
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 50) + '...'
      },
      dependencies: {
        misopinAPI: typeof misopinAPI !== 'undefined',
        misopinHelpers: typeof MisopinHelpers !== 'undefined',
        popupSystem: typeof MisopinPopupSystem !== 'undefined'
      },
      system: {
        initialized: window.MisopinPopupSystem?.initialized || false,
        version: window.MisopinPopupSystem?.version || 'unknown',
        loadTime: window.MisopinPopupSystem?.loadTime || 'unknown'
      }
    };

    const allDepsOk = Object.values(checks.dependencies).every(dep => dep === true);
    const systemOk = checks.system.initialized;

    console.log('✅ [Deployment Check] Quick verification results:');
    console.table({
      'Dependencies': allDepsOk ? '✅ OK' : '❌ FAILED',
      'System Init': systemOk ? '✅ OK' : '❌ FAILED',
      'Overall': (allDepsOk && systemOk) ? '✅ READY' : '❌ ISSUES'
    });

    if (!allDepsOk || !systemOk) {
      console.warn('⚠️ [Deployment Check] Issues detected:', checks);
    }

    return { allDepsOk, systemOk, checks };
  }

  // Run check after a short delay
  setTimeout(quickCheck, 2000);

  // Expose global function for manual verification
  window.verifyPopupDeployment = quickCheck;

})();