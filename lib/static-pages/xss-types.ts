/**
 * XSS Validation System - Type Definitions
 *
 * Baseline-aware validation types for differentiating between
 * original HTML patterns and newly injected malicious code.
 */

export type PatternType = 'event_handler' | 'javascript_url' | 'inline_script' | 'style_expression' | 'dangerous_attribute';
export type RiskLevel = 'safe' | 'monitored';
export type OverallRisk = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Fingerprint of a single JavaScript pattern found in HTML
 */
export interface PatternFingerprint {
  // Pattern identification
  type: PatternType;
  pattern: string;                // Original pattern text
  hash: string;                   // SHA-256 hash for fast lookup

  // Context
  elementSelector: string;        // CSS selector for element
  attributeName?: string;         // For event handlers/attributes
  lineNumber: number;             // For tracking (0 if unknown)

  // Metadata
  filePath: string;               // Source file
  catalogedAt: Date;

  // Security classification
  riskLevel: RiskLevel;           // All baseline patterns are known
}

/**
 * Baseline database of all legitimate patterns
 */
export interface BaselineDatabase {
  version: string;                // Schema version
  generatedAt: Date;
  patterns: PatternFingerprint[];
  fileHashes: Record<string, string>; // Track file changes
}

/**
 * Result of pattern detection
 */
export interface DetectedPattern {
  type: PatternType;
  pattern: string;
  isNew: boolean;                 // Key differentiator: not in baseline
  inBaseline: boolean;
  riskScore: number;              // 0-10 scale
  location: string;               // Element selector
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedPatterns?: DetectedPattern[];
  risk?: OverallRisk;
}

/**
 * Security audit log entry
 */
export interface SecurityAuditLog {
  timestamp: Date;
  filePath: string;
  elementId?: string;
  action: 'blocked' | 'allowed' | 'monitored';
  risk: string;
  patterns: DetectedPattern[];
  userId?: string;
}

/**
 * Validation metrics for monitoring
 */
export interface ValidationMetrics {
  totalValidations: number;
  blocked: number;
  allowed: number;
  cacheHits: number;
  averageValidationTimeMs: number;
}
