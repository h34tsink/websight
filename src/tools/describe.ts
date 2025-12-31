/**
 * WebSight - Page Layout & Theme Analyzer
 * CLI tool to analyze web pages for layout structure, theming, and accessibility
 */

import { chromium, type Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { extractLandmarks } from './extractors/landmarks.js';
import { extractSections } from './extractors/sections.js';
import { extractOverlays } from './extractors/overlays.js';
import { extractActions } from './extractors/actions.js';
import { extractTheme } from './extractors/theme.js';
import { generateReport } from './report.js';
import type { PageSnapshot, DescribeOptions, ViewportInfo } from './types.js';

// === Configuration ===
const BLOCKED_TYPES = new Set(['font', 'media']);
const BLOCKED_URL_PARTS = [
  'googletagmanager', 'google-analytics', 'doubleclick',
  'facebook.net', 'hotjar', 'gtm.js', 'ga.js'
];

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// === Helpers ===
function isBlocked(url: string, resourceType: string): boolean {
  if (BLOCKED_TYPES.has(resourceType)) return true;
  const lower = url.toLowerCase();
  return BLOCKED_URL_PARTS.some(p => lower.includes(p));
}

function clip(s: string, n = 500): string {
  if (!s) return '';
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

async function extractTextSample(page: Page): Promise<string> {
  return page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    return (main?.innerText || '').slice(0, 3000);
  });
}

// === Main ===
async function describe(options: DescribeOptions): Promise<void> {
  const { url, screenshot, outputDir } = options;

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    userAgent: USER_AGENT
  });

  // Block analytics and heavy resources
  await context.route('**/*', (route) => {
    const req = route.request();
    if (isBlocked(req.url(), req.resourceType())) {
      return route.abort();
    }
    return route.continue();
  });

  const page = await context.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const title = await page.title();
    const finalUrl = page.url();
    const viewport: ViewportInfo = page.viewportSize() || { width: 1280, height: 720 };

    // Extract all page data
    const [landmarks, sections, overlays, actions, theme, textSample] = await Promise.all([
      extractLandmarks(page, viewport),
      extractSections(page, viewport),
      extractOverlays(page, viewport),
      extractActions(page, viewport),
      extractTheme(page),
      extractTextSample(page)
    ]);

    // Optional screenshot
    let screenshotPath: string | null = null;
    if (screenshot) {
      screenshotPath = 'page.png';
      await page.screenshot({ 
        path: path.join(outputDir, screenshotPath), 
        fullPage: false 
      });
    }

    // Build snapshot
    const snapshot: PageSnapshot = {
      url: finalUrl,
      title,
      viewport,
      theme,
      landmarks,
      sections,
      overlays,
      actions,
      textSample: clip(textSample, 1200),
      screenshotPath,
      timestamp: new Date().toISOString()
    };

    // Write JSON snapshot
    const snapshotPath = path.join(outputDir, 'snapshot.json');
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

    // Generate and write report
    const report = generateReport(snapshot);
    const reportPath = path.join(outputDir, 'report.txt');
    fs.writeFileSync(reportPath, report);

    // Print to stdout
    console.log(report);
    console.log(`\nFiles written to ${outputDir}/`);
    console.log(`  • snapshot.json`);
    console.log(`  • report.txt`);
    if (screenshotPath) {
      console.log(`  • ${screenshotPath}`);
    }

  } finally {
    await browser.close();
  }
}

// === CLI Entry ===
const args = process.argv.slice(2);
const url = args[0] || 'http://localhost:5173/';
const noScreenshot = args.includes('--no-screenshot');

describe({
  url,
  screenshot: !noScreenshot,
  outputDir: 'out'
}).catch((err) => {
  console.error('WebSight failed:', err);
  process.exit(1);
});
