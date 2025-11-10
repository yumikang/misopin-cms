/**
 * Pattern Extraction Utilities
 *
 * Extract JavaScript patterns from HTML for baseline cataloging
 * and validation purposes.
 */

import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import type { PatternFingerprint, RiskLevel } from './xss-types';

/**
 * Event attributes that can contain JavaScript
 */
const EVENT_ATTRIBUTES = [
  'onclick', 'ondblclick',
  'onmousedown', 'onmouseup', 'onmouseover', 'onmouseout', 'onmousemove',
  'onfocus', 'onblur',
  'onkeydown', 'onkeyup', 'onkeypress',
  'onsubmit', 'onreset', 'onchange', 'onselect',
  'onload', 'onunload', 'onabort', 'onerror',
  'onresize', 'onscroll',
  'oninput', 'oninvalid',
  'ondrag', 'ondrop', 'ondragover',
] as const;

/**
 * Known safe function patterns (from actual usage in website)
 */
const SAFE_FUNCTION_PATTERNS = [
  'openKakaoChat()',
  'window.open(',
  'korean_ck(',
  'fmain_submit(',
  'document.getElementById(',
  'this.value',
  'return false',
  'return true',
] as const;

/**
 * Extract all event handler patterns from HTML
 */
export function extractEventHandlers(
  $: cheerio.CheerioAPI,
  filePath: string
): PatternFingerprint[] {
  const patterns: PatternFingerprint[] = [];

  EVENT_ATTRIBUTES.forEach(attr => {
    $(`[${attr}]`).each((_, elem) => {
      const $elem = $(elem);
      const pattern = $elem.attr(attr);

      if (!pattern) return;

      patterns.push({
        type: 'event_handler',
        pattern,
        hash: createHash('sha256').update(pattern).digest('hex'),
        elementSelector: generateSelector($elem),
        attributeName: attr,
        lineNumber: 0,
        filePath,
        catalogedAt: new Date(),
        riskLevel: classifyPattern(pattern),
      });
    });
  });

  return patterns;
}

/**
 * Extract javascript: URL patterns
 */
export function extractJavaScriptUrls(
  $: cheerio.CheerioAPI,
  filePath: string
): PatternFingerprint[] {
  const patterns: PatternFingerprint[] = [];

  // Check href attributes
  $('a[href^="javascript:"], area[href^="javascript:"]').each((_, elem) => {
    const $elem = $(elem);
    const pattern = $elem.attr('href');

    if (!pattern) return;

    patterns.push({
      type: 'javascript_url',
      pattern,
      hash: createHash('sha256').update(pattern).digest('hex'),
      elementSelector: generateSelector($elem),
      attributeName: 'href',
      lineNumber: 0,
      filePath,
      catalogedAt: new Date(),
      riskLevel: classifyPattern(pattern),
    });
  });

  // Check action attributes
  $('form[action^="javascript:"]').each((_, elem) => {
    const $elem = $(elem);
    const pattern = $elem.attr('action');

    if (!pattern) return;

    patterns.push({
      type: 'javascript_url',
      pattern,
      hash: createHash('sha256').update(pattern).digest('hex'),
      elementSelector: generateSelector($elem),
      attributeName: 'action',
      lineNumber: 0,
      filePath,
      catalogedAt: new Date(),
      riskLevel: 'monitored',
    });
  });

  return patterns;
}

/**
 * Normalize script content for consistent hashing
 * Removes leading/trailing whitespace and normalizes internal whitespace
 */
function normalizeScriptContent(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace to single spaces
    .replace(/\s*([{}();,])\s*/g, '$1'); // Remove spaces around punctuation
}

/**
 * Extract inline script tags
 */
export function extractInlineScripts(
  $: cheerio.CheerioAPI,
  filePath: string
): PatternFingerprint[] {
  const patterns: PatternFingerprint[] = [];

  $('script:not([src])').each((_, elem) => {
    const $elem = $(elem);
    const pattern = $elem.html() || '';

    if (!pattern || pattern.trim().length === 0) return;

    // Normalize content for hashing (to handle whitespace differences)
    const normalizedPattern = normalizeScriptContent(pattern);

    // Truncate very long scripts for storage
    const truncatedPattern = pattern.length > 500
      ? pattern.substring(0, 500) + '...[truncated]'
      : pattern;

    patterns.push({
      type: 'inline_script',
      pattern: truncatedPattern,
      hash: createHash('sha256').update(normalizedPattern).digest('hex'), // Hash normalized content
      elementSelector: generateSelector($elem),
      lineNumber: 0,
      filePath,
      catalogedAt: new Date(),
      riskLevel: 'monitored', // Inline scripts are always monitored
    });
  });

  return patterns;
}

/**
 * Extract dangerous attributes (data: URLs, srcdoc, etc.)
 */
export function extractDangerousAttributes(
  $: cheerio.CheerioAPI,
  filePath: string
): PatternFingerprint[] {
  const patterns: PatternFingerprint[] = [];

  // data: URLs in images/iframes
  $('img[src^="data:"], iframe[src^="data:"], object[data^="data:"]').each((_, elem) => {
    const $elem = $(elem);
    const attrName = $elem.is('object') ? 'data' : 'src';
    const pattern = $elem.attr(attrName);

    if (!pattern) return;

    // data:text/html is especially dangerous
    const isDangerous = pattern.startsWith('data:text/html');

    // Truncate long data URLs
    const truncatedPattern = pattern.length > 200
      ? pattern.substring(0, 200) + '...[truncated]'
      : pattern;

    patterns.push({
      type: 'dangerous_attribute',
      pattern: truncatedPattern,
      hash: createHash('sha256').update(pattern).digest('hex'),
      elementSelector: generateSelector($elem),
      attributeName: attrName,
      lineNumber: 0,
      filePath,
      catalogedAt: new Date(),
      riskLevel: isDangerous ? 'monitored' : 'safe',
    });
  });

  // srcdoc in iframes
  $('iframe[srcdoc]').each((_, elem) => {
    const $elem = $(elem);
    const pattern = $elem.attr('srcdoc');

    if (!pattern) return;

    patterns.push({
      type: 'dangerous_attribute',
      pattern: pattern.substring(0, 200), // Truncate
      hash: createHash('sha256').update(pattern).digest('hex'),
      elementSelector: generateSelector($elem),
      attributeName: 'srcdoc',
      lineNumber: 0,
      filePath,
      catalogedAt: new Date(),
      riskLevel: 'monitored',
    });
  });

  return patterns;
}

/**
 * Extract all patterns from HTML
 */
export function extractAllPatterns(
  $: cheerio.CheerioAPI,
  filePath: string
): PatternFingerprint[] {
  return [
    ...extractEventHandlers($, filePath),
    ...extractJavaScriptUrls($, filePath),
    ...extractInlineScripts($, filePath),
    ...extractDangerousAttributes($, filePath),
  ];
}

/**
 * Generate CSS selector for an element
 */
function generateSelector($elem: cheerio.Cheerio<any>): string {
  const tag = $elem.prop('tagName')?.toLowerCase() || '';
  const id = $elem.attr('id');
  const classes = $elem.attr('class')?.split(' ').filter(Boolean);

  // Prefer ID
  if (id) {
    return `${tag}#${id}`;
  }

  // Then data-editable (our CMS-specific attribute)
  const dataEditable = $elem.attr('data-editable');
  if (dataEditable) {
    return `${tag}[data-editable="${dataEditable}"]`;
  }

  // Then classes
  if (classes && classes.length > 0) {
    return `${tag}.${classes.slice(0, 3).join('.')}`;
  }

  // Fallback: tag name with nth-of-type
  const parent = $elem.parent();
  if (parent.length > 0) {
    const index = parent.children(tag).index($elem) + 1;
    return `${tag}:nth-of-type(${index})`;
  }

  return tag;
}

/**
 * Classify pattern risk level based on content
 */
function classifyPattern(pattern: string): RiskLevel {
  const lowerPattern = pattern.toLowerCase();

  // Known safe patterns
  for (const safePattern of SAFE_FUNCTION_PATTERNS) {
    if (lowerPattern.includes(safePattern.toLowerCase())) {
      return 'safe';
    }
  }

  // Simple value assignments are usually safe
  if (/^(this\.value|return (true|false))$/i.test(pattern.trim())) {
    return 'safe';
  }

  // Everything else in baseline is monitored but allowed
  return 'monitored';
}

/**
 * Generate hash for content
 */
export function generateHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Generate file hash for tracking changes
 */
export function generateFileHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
