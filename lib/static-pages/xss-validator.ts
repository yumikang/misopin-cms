/**
 * Baseline-Aware XSS Validator
 *
 * Validates HTML against a baseline fingerprint database to differentiate
 * between original safe patterns and newly injected malicious code.
 */

import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import type {
  BaselineDatabase,
  ValidationResult,
  DetectedPattern,
  OverallRisk,
  ValidationMetrics,
} from './xss-types';
import { extractAllPatterns } from './pattern-extractors';

export class BaselineAwareValidator {
  private baseline: BaselineDatabase;
  private patternHashSet: Set<string>; // For O(1) lookup
  private patternCache: Map<string, ValidationResult>; // LRU cache
  private readonly CACHE_SIZE = 1000;
  private metrics: ValidationMetrics;

  constructor(baseline: BaselineDatabase) {
    this.baseline = baseline;
    this.patternHashSet = new Set(baseline.patterns.map(p => p.hash));
    this.patternCache = new Map();
    this.metrics = {
      totalValidations: 0,
      blocked: 0,
      allowed: 0,
      cacheHits: 0,
      averageValidationTimeMs: 0,
    };
  }

  /**
   * Validate HTML against baseline patterns
   *
   * @param updatedHtml - HTML to validate
   * @param originalFilePath - Original file path (for context)
   * @returns Validation result
   */
  async validate(
    updatedHtml: string,
    originalFilePath: string
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    this.metrics.totalValidations++;

    // 1. Generate cache key
    const cacheKey = this.generateCacheKey(updatedHtml, originalFilePath);

    // 2. Check cache
    const cached = this.patternCache.get(cacheKey);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }

    // 3. Perform validation
    const result = await this.performValidation(updatedHtml, originalFilePath);

    // 4. Update cache (LRU eviction)
    this.updateCache(cacheKey, result);

    // 5. Update metrics
    const elapsed = Date.now() - startTime;
    this.metrics.averageValidationTimeMs = (this.metrics.averageValidationTimeMs + elapsed) / 2;
    if (!result.valid) {
      this.metrics.blocked++;
    } else {
      this.metrics.allowed++;
    }

    return result;
  }

  /**
   * Perform actual validation logic
   */
  private async performValidation(
    updatedHtml: string,
    originalFilePath: string
  ): Promise<ValidationResult> {
    try {
      const $ = cheerio.load(updatedHtml);
      const detectedPatterns: DetectedPattern[] = [];

      // 1. Extract patterns from updated HTML
      const currentPatterns = extractAllPatterns($, originalFilePath);

      // 2. Classify each pattern
      for (const pattern of currentPatterns) {
        const isInBaseline = this.patternHashSet.has(pattern.hash);
        const riskScore = this.calculateRiskScore(pattern.pattern, isInBaseline);

        detectedPatterns.push({
          type: pattern.type,
          pattern: pattern.pattern.substring(0, 200), // Truncate for output
          isNew: !isInBaseline,
          inBaseline: isInBaseline,
          riskScore,
          location: pattern.elementSelector,
        });
      }

      // 3. Find high-risk new patterns
      const newHighRiskPatterns = detectedPatterns.filter(
        p => p.isNew && p.riskScore >= 7 // Threshold: 7/10 or higher
      );

      if (newHighRiskPatterns.length > 0) {
        const risk = this.assessOverallRisk(newHighRiskPatterns);
        return {
          valid: false,
          error: `NEW_XSS_PATTERN_DETECTED (${risk.toUpperCase()})`,
          detectedPatterns: newHighRiskPatterns,
          risk,
        };
      }

      // 4. Monitor medium-risk patterns (but allow)
      const newMediumRiskPatterns = detectedPatterns.filter(
        p => p.isNew && p.riskScore >= 4 && p.riskScore < 7
      );

      if (newMediumRiskPatterns.length > 0) {
        // Log for monitoring but allow
        await this.logSuspiciousActivity(originalFilePath, newMediumRiskPatterns);
      }

      return {
        valid: true,
        detectedPatterns,
        risk: 'none',
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        risk: 'critical',
      };
    }
  }

  /**
   * Calculate risk score for a pattern (0-10 scale)
   *
   * @param patternText - The pattern text to analyze
   * @param inBaseline - Whether this pattern exists in baseline
   * @returns Risk score from 0 (safe) to 10 (critical)
   */
  private calculateRiskScore(patternText: string, inBaseline: boolean): number {
    let score = 0;
    const text = patternText.toLowerCase();

    // NEW patterns are automatically higher risk
    if (!inBaseline) {
      score += 5;
    }

    // Critical XSS vectors
    if (text.includes('eval(')) score += 4;
    if (text.includes('document.cookie')) score += 4;
    if (text.includes('document.write')) score += 3;
    if (text.includes('.innerhtml')) score += 3;
    if (text.includes('settimeout') || text.includes('setinterval')) score += 2;

    // Data exfiltration
    if (text.includes('fetch(') || text.includes('xmlhttprequest')) score += 3;
    if (text.includes('websocket')) score += 3;
    if (text.includes('navigator.sendbeacon')) score += 3;

    // DOM manipulation
    if (text.includes('appendchild') || text.includes('insertbefore')) score += 2;
    if (text.includes('createelement') && text.includes('script')) score += 3;

    // Encoding/obfuscation attempts
    if (/\\x[0-9a-f]{2}|\\u[0-9a-f]{4}/i.test(text)) score += 3;
    if (text.includes('fromcharcode')) score += 3;
    if (text.includes('atob') || text.includes('btoa')) score += 2;

    // External resources
    if (text.includes('src=') && text.includes('http')) score += 2;
    if (/https?:\/\/(?!localhost|127\.0\.0\.1)/.test(text)) score += 2;

    // iframe/embed manipulation
    if (text.includes('contentwindow') || text.includes('contentdocument')) score += 2;

    // Location/navigation manipulation
    if (text.includes('window.location')) score += 2;
    if (text.includes('document.location')) score += 2;

    // Known safe patterns in baseline reduce score
    if (inBaseline) {
      // Baseline patterns with safe content
      const safePatterns = [
        'window.open(',
        'return false',
        'return true',
        'this.value',
        'document.getelementbyid(',
      ];

      if (safePatterns.some(safe => text.includes(safe))) {
        score -= 3;
      }
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Assess overall risk level from detected patterns
   */
  private assessOverallRisk(patterns: DetectedPattern[]): OverallRisk {
    if (patterns.length === 0) return 'none';

    const maxScore = Math.max(...patterns.map(p => p.riskScore));

    if (maxScore >= 9) return 'critical';
    if (maxScore >= 7) return 'high';
    if (maxScore >= 5) return 'medium';
    if (maxScore >= 3) return 'low';
    return 'none';
  }

  /**
   * Log suspicious activity for security monitoring
   */
  private async logSuspiciousActivity(
    filePath: string,
    patterns: DetectedPattern[]
  ): Promise<void> {
    console.warn('[XSS Monitor] Suspicious patterns detected:', {
      timestamp: new Date().toISOString(),
      file: filePath,
      patterns: patterns.map(p => ({
        type: p.type,
        risk: p.riskScore,
        location: p.location,
        preview: p.pattern.substring(0, 50),
      })),
    });

    // TODO: Integrate with logging/monitoring system (e.g., Sentry, CloudWatch)
  }

  /**
   * Generate cache key for validation result
   */
  private generateCacheKey(html: string, filePath: string): string {
    return createHash('sha256').update(html + filePath).digest('hex');
  }

  /**
   * Update cache with LRU eviction
   */
  private updateCache(key: string, result: ValidationResult): void {
    if (this.patternCache.size >= this.CACHE_SIZE) {
      // Remove oldest entry (first key in Map)
      const firstKey = this.patternCache.keys().next().value;
      if (firstKey) {
        this.patternCache.delete(firstKey);
      }
    }
    this.patternCache.set(key, result);
  }

  /**
   * Get validation metrics
   */
  getMetrics(): ValidationMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear cache (useful for testing or when baseline updates)
   */
  clearCache(): void {
    this.patternCache.clear();
  }

  /**
   * Update baseline (reload patterns)
   */
  updateBaseline(newBaseline: BaselineDatabase): void {
    this.baseline = newBaseline;
    this.patternHashSet = new Set(newBaseline.patterns.map(p => p.hash));
    this.clearCache(); // Invalidate cache
  }
}

/**
 * Validate a single element value (optimization for incremental validation)
 *
 * @param elementValue - Value to validate
 * @param validator - Validator instance
 * @returns Validation result
 */
export async function validateElementValue(
  elementValue: string,
  validator: BaselineAwareValidator
): Promise<ValidationResult> {
  // Create minimal HTML for validation
  const testHtml = `<div data-test="inline">${elementValue}</div>`;

  return validator.validate(testHtml, 'inline-validation');
}
