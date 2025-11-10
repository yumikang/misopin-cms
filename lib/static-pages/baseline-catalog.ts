/**
 * Baseline Catalog Generator
 *
 * Builds a fingerprint database of all legitimate JavaScript patterns
 * from original HTML files. This baseline is used to differentiate
 * between safe original patterns and newly injected malicious code.
 */

import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import type { BaselineDatabase, PatternFingerprint } from './xss-types';
import {
  extractAllPatterns,
  generateFileHash,
} from './pattern-extractors';

/**
 * Build baseline catalog from all HTML files in directory
 *
 * @param staticPagesDir - Directory containing HTML files (e.g., public/static-pages)
 * @returns Baseline database with all patterns and file hashes
 */
export async function buildBaselineCatalog(
  staticPagesDir: string
): Promise<BaselineDatabase> {
  console.log(`🔍 Scanning ${staticPagesDir} for HTML files...`);

  const patterns: PatternFingerprint[] = [];
  const fileHashes: Record<string, string> = {};

  // Find all HTML files
  const htmlFiles = await glob('**/*.html', {
    cwd: staticPagesDir,
    absolute: false,
  });

  console.log(`📄 Found ${htmlFiles.length} HTML files`);

  for (const file of htmlFiles) {
    const filePath = path.join(staticPagesDir, file);

    try {
      // Read file
      const html = await fs.readFile(filePath, 'utf-8');

      // Generate file hash
      const fileHash = generateFileHash(html);
      fileHashes[file] = fileHash;

      // Extract patterns
      const $ = cheerio.load(html);
      const filePatterns = extractAllPatterns($, file);

      patterns.push(...filePatterns);

      console.log(`  ✓ ${file}: ${filePatterns.length} patterns`);
    } catch (error) {
      console.error(`  ✗ Error processing ${file}:`, error);
    }
  }

  // Deduplicate patterns by hash (same pattern in multiple files)
  const uniquePatterns = Array.from(
    new Map(patterns.map(p => [p.hash, p])).values()
  );

  console.log(`\n📊 Summary:`);
  console.log(`  - Total patterns: ${patterns.length}`);
  console.log(`  - Unique patterns: ${uniquePatterns.length}`);
  console.log(`  - Files processed: ${htmlFiles.length}`);

  // Breakdown by type
  const byType = uniquePatterns.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`\n  Pattern breakdown:`);
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`    - ${type}: ${count}`);
  });

  return {
    version: '1.0.0',
    generatedAt: new Date(),
    patterns: uniquePatterns,
    fileHashes,
  };
}

/**
 * Save baseline to file
 *
 * @param baseline - Baseline database to save
 * @param outputPath - Path to save JSON file
 */
export async function saveBaseline(
  baseline: BaselineDatabase,
  outputPath: string
): Promise<void> {
  await fs.writeFile(outputPath, JSON.stringify(baseline, null, 2), 'utf-8');
  console.log(`\n💾 Baseline saved to: ${outputPath}`);
}

/**
 * Load baseline from file
 *
 * @param inputPath - Path to baseline JSON file
 * @returns Loaded baseline database
 */
export async function loadBaseline(inputPath: string): Promise<BaselineDatabase> {
  const json = await fs.readFile(inputPath, 'utf-8');
  const baseline = JSON.parse(json) as BaselineDatabase;

  // Convert date strings back to Date objects
  baseline.generatedAt = new Date(baseline.generatedAt);
  baseline.patterns.forEach(p => {
    p.catalogedAt = new Date(p.catalogedAt);
  });

  return baseline;
}

/**
 * Update baseline for a single file
 *
 * @param baseline - Current baseline
 * @param filePath - File to update (relative to static pages dir)
 * @param staticPagesDir - Root directory
 * @param reason - Reason for update (for logging)
 * @returns Updated baseline
 */
export async function updateBaselineFile(
  baseline: BaselineDatabase,
  filePath: string,
  staticPagesDir: string,
  reason: string
): Promise<BaselineDatabase> {
  console.log(`🔄 Updating baseline for ${filePath}`);
  console.log(`   Reason: ${reason}`);

  // Remove old patterns for this file
  const oldPatternCount = baseline.patterns.length;
  baseline.patterns = baseline.patterns.filter(p => p.filePath !== filePath);
  const removedCount = oldPatternCount - baseline.patterns.length;

  console.log(`   Removed ${removedCount} old patterns`);

  // Re-scan file
  const fullPath = path.join(staticPagesDir, filePath);
  const html = await fs.readFile(fullPath, 'utf-8');
  const $ = cheerio.load(html);
  const newPatterns = extractAllPatterns($, filePath);

  // Add new patterns
  baseline.patterns.push(...newPatterns);

  // Update file hash
  baseline.fileHashes[filePath] = generateFileHash(html);

  console.log(`   Added ${newPatterns.length} new patterns`);

  return baseline;
}

/**
 * Verify baseline integrity against current files
 *
 * @param baseline - Baseline to verify
 * @param staticPagesDir - Directory containing HTML files
 * @returns Array of files that have drifted from baseline
 */
export async function verifyBaseline(
  baseline: BaselineDatabase,
  staticPagesDir: string
): Promise<string[]> {
  const driftedFiles: string[] = [];

  for (const [file, storedHash] of Object.entries(baseline.fileHashes)) {
    const filePath = path.join(staticPagesDir, file);

    try {
      const html = await fs.readFile(filePath, 'utf-8');
      const currentHash = generateFileHash(html);

      if (currentHash !== storedHash) {
        driftedFiles.push(file);
      }
    } catch (error) {
      console.warn(`⚠️  File not found: ${file}`);
      driftedFiles.push(file);
    }
  }

  return driftedFiles;
}

/**
 * Generate baseline statistics
 *
 * @param baseline - Baseline to analyze
 * @returns Statistics object
 */
export function getBaselineStats(baseline: BaselineDatabase) {
  const byType = baseline.patterns.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byRisk = baseline.patterns.reduce((acc, p) => {
    acc[p.riskLevel] = (acc[p.riskLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    version: baseline.version,
    generatedAt: baseline.generatedAt,
    totalPatterns: baseline.patterns.length,
    totalFiles: Object.keys(baseline.fileHashes).length,
    patternsByType: byType,
    patternsByRisk: byRisk,
  };
}
