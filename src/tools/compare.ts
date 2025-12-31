/**
 * WebSight Compare - diff two snapshots to see visual changes
 * Includes pixel-based image comparison for detecting visual differences
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { dirname, join } from 'path';
import type { PageSnapshot, Theme } from './types.js';

interface ThemeDiff {
  property: string;
  before: string;
  after: string;
}

interface ImageDiffResult {
  diffPercent: number;
  diffPixels: number;
  totalPixels: number;
  diffImagePath: string | null;
  hasSignificantChange: boolean;
}

export interface CompareResult {
  url: string;
  summary: string;
  themeChanges: ThemeDiff[];
  cssVariableChanges: ThemeDiff[];
  sectionsAdded: string[];
  sectionsRemoved: string[];
  actionsAdded: string[];
  actionsRemoved: string[];
  layoutChanges: string[];
  imageDiff: ImageDiffResult | null;
}

/**
 * Compare two PNG images and return diff statistics
 */
function compareImages(beforeImagePath: string, afterImagePath: string, outputDir: string): ImageDiffResult | null {
  if (!existsSync(beforeImagePath) || !existsSync(afterImagePath)) {
    return null;
  }

  try {
    const img1 = PNG.sync.read(readFileSync(beforeImagePath));
    const img2 = PNG.sync.read(readFileSync(afterImagePath));

    const { width, height } = img1;
    
    // Images must be same size for comparison
    if (img1.width !== img2.width || img1.height !== img2.height) {
      return {
        diffPercent: 100,
        diffPixels: -1,
        totalPixels: width * height,
        diffImagePath: null,
        hasSignificantChange: true
      };
    }

    const diff = new PNG({ width, height });

    const numDiffPixels = pixelmatch(
      img1.data,
      img2.data,
      diff.data,
      width,
      height,
      { threshold: 0.1, includeAA: false }
    );

    const totalPixels = width * height;
    const diffPercent = (numDiffPixels / totalPixels) * 100;

    // Write diff image
    const diffImagePath = join(outputDir, 'diff.png');
    writeFileSync(diffImagePath, PNG.sync.write(diff));

    return {
      diffPercent: Math.round(diffPercent * 100) / 100,
      diffPixels: numDiffPixels,
      totalPixels,
      diffImagePath,
      hasSignificantChange: diffPercent > 0.5
    };
  } catch (e) {
    console.error('Image comparison error:', e);
    return null;
  }
}

export function compareSnapshots(
  before: PageSnapshot, 
  after: PageSnapshot,
  beforeSnapshotPath?: string,
  afterSnapshotPath?: string
): CompareResult {
  const result: CompareResult = {
    url: after.url,
    summary: '',
    themeChanges: [],
    cssVariableChanges: [],
    sectionsAdded: [],
    sectionsRemoved: [],
    actionsAdded: [],
    actionsRemoved: [],
    layoutChanges: [],
    imageDiff: null
  };

  // Image comparison if paths provided
  if (beforeSnapshotPath && afterSnapshotPath) {
    const beforeDir = dirname(beforeSnapshotPath);
    const afterDir = dirname(afterSnapshotPath);
    const beforeImage = join(beforeDir, 'page-before.png');
    const afterImage = join(afterDir, after.screenshotPath || 'page.png');
    
    // Try page-before.png first, fall back to inferring from snapshot path
    const actualBeforeImage = existsSync(beforeImage) 
      ? beforeImage 
      : join(beforeDir, before.screenshotPath || 'page.png');
    
    result.imageDiff = compareImages(actualBeforeImage, afterImage, afterDir);
  }

  // Compare theme properties
  const themeProps: (keyof Theme)[] = [
    'bodyBackground', 'bodyTextColor', 'bodyFontFamily', 
    'bodyFontSize', 'lineHeight'
  ];
  
  for (const prop of themeProps) {
    const beforeVal = String(before.theme[prop]);
    const afterVal = String(after.theme[prop]);
    if (beforeVal !== afterVal) {
      result.themeChanges.push({
        property: prop,
        before: beforeVal,
        after: afterVal
      });
    }
  }

  // Compare CSS variables
  const beforeVars = before.theme.cssVariables || {};
  const afterVars = after.theme.cssVariables || {};
  const allVars = new Set([...Object.keys(beforeVars), ...Object.keys(afterVars)]);
  
  for (const varName of allVars) {
    const beforeVal = beforeVars[varName] || '(not set)';
    const afterVal = afterVars[varName] || '(removed)';
    if (beforeVal !== afterVal) {
      result.cssVariableChanges.push({
        property: varName,
        before: beforeVal,
        after: afterVal
      });
    }
  }

  // Compare border radii
  const beforeRadii = new Set(before.theme.borderRadii);
  const afterRadii = new Set(after.theme.borderRadii);
  const addedRadii = [...afterRadii].filter(r => !beforeRadii.has(r));
  const removedRadii = [...beforeRadii].filter(r => !afterRadii.has(r));
  if (addedRadii.length || removedRadii.length) {
    result.layoutChanges.push(
      `Border radii: ${removedRadii.length ? `removed ${removedRadii.join(', ')}` : ''} ${addedRadii.length ? `added ${addedRadii.join(', ')}` : ''}`.trim()
    );
  }

  // Compare sections
  const beforeSections = new Set(before.sections.map(s => s.testId || s.name));
  const afterSections = new Set(after.sections.map(s => s.testId || s.name));
  
  result.sectionsAdded = [...afterSections].filter(s => !beforeSections.has(s));
  result.sectionsRemoved = [...beforeSections].filter(s => !afterSections.has(s));

  // Compare actions
  const beforeActions = new Set(before.actions.map(a => a.name));
  const afterActions = new Set(after.actions.map(a => a.name));
  
  result.actionsAdded = [...afterActions].filter(a => !beforeActions.has(a));
  result.actionsRemoved = [...beforeActions].filter(a => !afterActions.has(a));

  // Generate summary
  const changes: string[] = [];
  
  // Image diff is primary indicator
  if (result.imageDiff?.hasSignificantChange) {
    changes.push(`${result.imageDiff.diffPercent}% visual difference`);
  }
  if (result.themeChanges.length) {
    changes.push(`${result.themeChanges.length} theme changes`);
  }
  if (result.cssVariableChanges.length) {
    changes.push(`${result.cssVariableChanges.length} CSS variable changes`);
  }
  if (result.sectionsAdded.length || result.sectionsRemoved.length) {
    changes.push(`sections: +${result.sectionsAdded.length} -${result.sectionsRemoved.length}`);
  }
  if (result.layoutChanges.length) {
    changes.push(`${result.layoutChanges.length} layout changes`);
  }
  
  // Even if no structural changes, report image diff
  if (changes.length === 0 && result.imageDiff && result.imageDiff.diffPercent > 0) {
    changes.push(`${result.imageDiff.diffPercent}% pixel difference`);
  }
  
  result.summary = changes.length > 0 
    ? `Changes: ${changes.join(', ')}`
    : 'No visual changes detected';

  return result;
}

export function formatCompareReport(result: CompareResult): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(70));
  lines.push('WEBSIGHT - VISUAL DIFF REPORT');
  lines.push('='.repeat(70));
  lines.push(`URL: ${result.url}`);
  lines.push('');
  lines.push(`SUMMARY: ${result.summary}`);
  lines.push('');

  // Image diff results first
  if (result.imageDiff) {
    lines.push('IMAGE COMPARISON');
    lines.push('-'.repeat(40));
    lines.push(`  Pixels changed: ${result.imageDiff.diffPixels.toLocaleString()} / ${result.imageDiff.totalPixels.toLocaleString()}`);
    lines.push(`  Difference: ${result.imageDiff.diffPercent}%`);
    if (result.imageDiff.hasSignificantChange) {
      lines.push(`  ⚠️  SIGNIFICANT VISUAL CHANGE`);
    } else if (result.imageDiff.diffPercent > 0) {
      lines.push(`  Minor visual change`);
    } else {
      lines.push(`  ✓ No visual difference`);
    }
    if (result.imageDiff.diffImagePath) {
      lines.push(`  Diff image: ${result.imageDiff.diffImagePath}`);
    }
    lines.push('');
  }

  if (result.cssVariableChanges.length > 0) {
    lines.push('CSS VARIABLE CHANGES');
    lines.push('-'.repeat(40));
    for (const change of result.cssVariableChanges) {
      lines.push(`  ${change.property}: ${change.before} → ${change.after}`);
    }
    lines.push('');
  }

  if (result.themeChanges.length > 0) {
    lines.push('THEME CHANGES');
    lines.push('-'.repeat(40));
    for (const change of result.themeChanges) {
      lines.push(`  ${change.property}: ${change.before} → ${change.after}`);
    }
    lines.push('');
  }

  if (result.layoutChanges.length > 0) {
    lines.push('LAYOUT CHANGES');
    lines.push('-'.repeat(40));
    for (const change of result.layoutChanges) {
      lines.push(`  • ${change}`);
    }
    lines.push('');
  }

  if (result.sectionsAdded.length > 0 || result.sectionsRemoved.length > 0) {
    lines.push('SECTION CHANGES');
    lines.push('-'.repeat(40));
    for (const s of result.sectionsAdded) lines.push(`  + ${s}`);
    for (const s of result.sectionsRemoved) lines.push(`  - ${s}`);
    lines.push('');
  }

  lines.push('='.repeat(70));
  return lines.join('\n');
}

// CLI entry point - only run when called directly
const isMainModule = import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;

if (isMainModule) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: npx tsx tools/compare.ts <before.json> <after.json>');
    console.log('');
    console.log('Example: npx tsx tools/compare.ts out/snapshot-before.json out/snapshot.json');
    process.exit(1);
  }

  const [beforePath, afterPath] = args;

  if (!existsSync(beforePath)) {
    console.error(`Error: File not found: ${beforePath}`);
    process.exit(1);
  }
  if (!existsSync(afterPath)) {
    console.error(`Error: File not found: ${afterPath}`);
    process.exit(1);
  }

  const before: PageSnapshot = JSON.parse(readFileSync(beforePath, 'utf-8'));
  const after: PageSnapshot = JSON.parse(readFileSync(afterPath, 'utf-8'));

  const result = compareSnapshots(before, after, beforePath, afterPath);
  console.log(formatCompareReport(result));
}
