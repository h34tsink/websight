/**
 * WebSight API - Programmatic interface for page analysis
 * Import and call directly without CLI
 */

import { chromium, type Browser, type Page } from 'playwright';
import { writeFileSync, mkdirSync, existsSync, readFileSync, copyFileSync } from 'fs';
import { join } from 'path';

import { extractLandmarks } from './extractors/landmarks.js';
import { extractSections } from './extractors/sections.js';
import { extractOverlays } from './extractors/overlays.js';
import { extractActions } from './extractors/actions.js';
import { extractTheme } from './extractors/theme.js';
import { generateReport } from './report.js';
import type { PageSnapshot } from './types.js';

// Re-export types
export * from './types.js';

const BLOCKED_RESOURCES = [
  'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
  'facebook.net', 'hotjar.com', 'segment.com', 'mixpanel.com'
];

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export interface DescribeOptions {
  url: string;
  screenshot?: boolean;
  outputDir?: string;
  viewport?: { width: number; height: number };
}

export interface DescribeResult {
  snapshot: PageSnapshot;
  report: string;
  screenshotPath: string | null;
}

/**
 * Analyze a page and return structured data + human report
 */
export async function describe(options: DescribeOptions): Promise<DescribeResult> {
  const { 
    url, 
    screenshot = true, 
    outputDir = 'out',
    viewport = { width: 1280, height: 720 }
  } = options;

  const browser = await getBrowser();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  // Block heavy resources
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (BLOCKED_RESOURCES.some(blocked => url.includes(blocked))) {
      return route.abort();
    }
    const type = route.request().resourceType();
    if (type === 'font' || type === 'media') {
      return route.abort();
    }
    return route.continue();
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(500);

  // Extract all data
  const [landmarks, sections, overlays, actions, theme] = await Promise.all([
    extractLandmarks(page, viewport),
    extractSections(page, viewport),
    extractOverlays(page, viewport),
    extractActions(page, viewport),
    extractTheme(page)
  ]);

  const title = await page.title();
  const textSample = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    return main.textContent?.slice(0, 500)?.replace(/\s+/g, ' ').trim() || '';
  });

  // Ensure output dir exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Screenshot
  let screenshotPath: string | null = null;
  if (screenshot) {
    screenshotPath = 'page.png';
    await page.screenshot({ path: join(outputDir, screenshotPath) });
  }

  const snapshot: PageSnapshot = {
    url,
    title,
    viewport,
    theme,
    landmarks,
    sections,
    overlays,
    actions,
    textSample,
    screenshotPath,
    timestamp: new Date().toISOString()
  };

  // Generate report
  const report = generateReport(snapshot);

  // Write files
  writeFileSync(join(outputDir, 'snapshot.json'), JSON.stringify(snapshot, null, 2));
  writeFileSync(join(outputDir, 'report.txt'), report);

  await context.close();

  return { snapshot, report, screenshotPath };
}

/**
 * Save current snapshot as baseline for comparison
 */
export function saveBaseline(outputDir = 'out'): void {
  const snapshotPath = join(outputDir, 'snapshot.json');
  const screenshotPath = join(outputDir, 'page.png');
  
  if (existsSync(snapshotPath)) {
    copyFileSync(snapshotPath, join(outputDir, 'snapshot-before.json'));
  }
  if (existsSync(screenshotPath)) {
    copyFileSync(screenshotPath, join(outputDir, 'page-before.png'));
  }
}

/**
 * Quick analyze and print report to console
 */
export async function look(url = 'http://localhost:5173/'): Promise<PageSnapshot> {
  const { snapshot, report } = await describe({ url });
  console.log(report);
  return snapshot;
}

/**
 * Analyze, compare with baseline, print diff
 */
export async function compareWithBaseline(url = 'http://localhost:5173/', outputDir = 'out'): Promise<void> {
  // Dynamic import to avoid circular deps
  const { compareSnapshots, formatCompareReport } = await import('./compare.js');
  
  const beforePath = join(outputDir, 'snapshot-before.json');
  if (!existsSync(beforePath)) {
    console.log('No baseline found. Run saveBaseline() first or use look() to analyze.');
    return;
  }

  const before: PageSnapshot = JSON.parse(readFileSync(beforePath, 'utf-8'));
  const { snapshot: after } = await describe({ url, outputDir });
  
  const result = compareSnapshots(before, after, beforePath, join(outputDir, 'snapshot.json'));
  console.log(formatCompareReport(result));
}

// For quick REPL usage
export const websight = {
  describe,
  look,
  saveBaseline,
  compareWithBaseline,
  closeBrowser
};

export default websight;
