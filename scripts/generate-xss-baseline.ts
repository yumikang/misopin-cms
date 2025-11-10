#!/usr/bin/env tsx
/**
 * Generate XSS Baseline
 *
 * Scans all HTML files in public/static-pages and generates
 * a baseline fingerprint database of legitimate JavaScript patterns.
 *
 * Usage:
 *   npm run xss:generate-baseline
 *   or
 *   tsx scripts/generate-xss-baseline.ts
 */

import * as path from 'path';
import {
  buildBaselineCatalog,
  saveBaseline,
  getBaselineStats,
} from '../lib/static-pages/baseline-catalog';

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   XSS Baseline Generator                          ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const staticPagesDir = path.join(process.cwd(), 'public/static-pages');
  const outputPath = path.join(
    process.cwd(),
    'lib/static-pages/baseline-patterns.json'
  );

  console.log(`📂 Source directory: ${staticPagesDir}`);
  console.log(`💾 Output file: ${outputPath}\n`);

  try {
    // Generate baseline
    const baseline = await buildBaselineCatalog(staticPagesDir);

    // Save to file
    await saveBaseline(baseline, outputPath);

    // Display statistics
    const stats = getBaselineStats(baseline);
    console.log('\n📊 Baseline Statistics:');
    console.log(`   Version: ${stats.version}`);
    console.log(`   Generated: ${stats.generatedAt.toISOString()}`);
    console.log(`   Total patterns: ${stats.totalPatterns}`);
    console.log(`   Total files: ${stats.totalFiles}`);

    console.log('\n   By Type:');
    Object.entries(stats.patternsByType).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count}`);
    });

    console.log('\n   By Risk Level:');
    Object.entries(stats.patternsByRisk).forEach(([risk, count]) => {
      console.log(`     - ${risk}: ${count}`);
    });

    console.log('\n✨ Success! Baseline generated successfully.');
    console.log('\n📝 Next steps:');
    console.log('   1. Review the generated baseline file');
    console.log('   2. Add it to version control (NOT .gitignore)');
    console.log('   3. Run validation tests');
    console.log('   4. Deploy to production\n');
  } catch (error) {
    console.error('\n❌ Error generating baseline:');
    console.error(error);
    process.exit(1);
  }
}

main();
