/**
 * WebSight Session - Persistent browser session for fast operations
 * 
 * Keeps browser + page warm between calls for ~10x faster performance.
 * Supports interactions (click, type, select) in addition to analysis.
 */

import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import { writeFileSync, mkdirSync, existsSync, copyFileSync, readFileSync } from 'fs';
import { join } from 'path';

import { extractLandmarks } from './extractors/landmarks.js';
import { extractSections } from './extractors/sections.js';
import { extractOverlays } from './extractors/overlays.js';
import { extractActions } from './extractors/actions.js';
import { extractTheme } from './extractors/theme.js';
import { extractClasses } from './extractors/classes.js';
import { generateReport } from './report.js';
import type { PageSnapshot, Action } from './types.js';

const BLOCKED_RESOURCES = [
  'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
  'facebook.net', 'hotjar.com', 'segment.com', 'mixpanel.com'
];

interface SessionState {
  browser: Browser | null;
  context: BrowserContext | null;
  page: Page | null;
  currentUrl: string | null;
  lastSnapshot: PageSnapshot | null;
  isRemote: boolean;  // True if connected to existing browser
}

const state: SessionState = {
  browser: null,
  context: null,
  page: null,
  currentUrl: null,
  lastSnapshot: null,
  isRemote: false
};

const viewport = { width: 1280, height: 720 };
const CDP_PORTS = [9222, 9229];

/**
 * Try to connect to an existing browser via CDP
 * @param targetUrl - Optionally prefer a page with this URL
 */
async function tryConnectCDP(targetUrl?: string): Promise<{ browser: Browser; page: Page } | null> {
  for (const port of CDP_PORTS) {
    try {
      const browser = await chromium.connectOverCDP(`http://localhost:${port}`, {
        timeout: 2000
      });
      const contexts = browser.contexts();
      
      // Collect all usable pages
      const allPages: Page[] = [];
      for (const context of contexts) {
        const pages = context.pages();
        for (const page of pages) {
          const url = page.url();
          // Skip internal pages
          if (url && 
              !url.startsWith('about:') && 
              !url.startsWith('chrome://') &&
              !url.startsWith('edge://') &&
              !url.startsWith('devtools://')) {
            allPages.push(page);
          }
        }
      }
      
      if (allPages.length === 0) {
        await browser.close();
        continue;
      }
      
      // If we have a target URL, try to find a matching page
      if (targetUrl) {
        // Try exact match first
        let matchedPage = allPages.find(p => p.url() === targetUrl);
        
        // Try partial match (same host)
        if (!matchedPage) {
          try {
            const targetHost = new URL(targetUrl).host;
            matchedPage = allPages.find(p => {
              try { return new URL(p.url()).host === targetHost; } 
              catch { return false; }
            });
          } catch {}
        }
        
        if (matchedPage) {
          console.log(`🔗 Connected to browser on port ${port} (found target page)`);
          return { browser, page: matchedPage };
        }
        
        // Target not found - navigate the first page to it
        console.log(`🔗 Connected to browser on port ${port} (navigating to target)`);
        const page = allPages[0];
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
        return { browser, page };
      }
      
      // No target URL - return first usable page
      console.log(`🔗 Connected to browser on port ${port}`);
      return { browser, page: allPages[0] };
    } catch {
      // CDP not available on this port
    }
  }
  return null;
}

/**
 * Get or create the persistent page
 */
async function getPage(url?: string): Promise<Page> {
  // Try to connect to existing browser first (if USE_CDP=1)
  if (!state.browser && process.env.USE_CDP === '1') {
    const cdp = await tryConnectCDP(url);  // Pass target URL so it can find/navigate to it
    if (cdp) {
      state.browser = cdp.browser;
      state.page = cdp.page;
      state.context = cdp.page.context();
      state.currentUrl = cdp.page.url();
      state.isRemote = true;
      return state.page;
    }
    console.log('⚠️  No browser with remote debugging found, launching new one');
  }

  // Launch browser if needed
  if (!state.browser) {
    // Use HEADED=1 env var to show browser window
    const headless = process.env.HEADED !== '1';
    state.browser = await chromium.launch({ 
      headless,
      slowMo: headless ? 0 : 50  // Add slight delay in headed mode so you can see actions
    });
    state.isRemote = false;
  }

  // Create context if needed
  if (!state.context) {
    state.context = await state.browser.newContext({ viewport });
  }

  // Create page if needed
  if (!state.page) {
    state.page = await state.context.newPage();

    // Set up request blocking once
    await state.page.route('**/*', (route) => {
      const reqUrl = route.request().url();
      if (BLOCKED_RESOURCES.some(blocked => reqUrl.includes(blocked))) {
        return route.abort();
      }
      const type = route.request().resourceType();
      if (type === 'font' || type === 'media') {
        return route.abort();
      }
      return route.continue();
    });
  }

  // Navigate only if URL changed (and not using remote browser's current page)
  if (url && url !== state.currentUrl && !state.isRemote) {
    await state.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Smart wait - only wait if page has pending network
    await state.page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    state.currentUrl = url;
  } else if (state.isRemote) {
    // For remote browser, just update our tracked URL
    state.currentUrl = state.page.url();
  }

  return state.page;
}

/**
 * Close the session and release resources
 */
export async function closeSession(): Promise<void> {
  // Don't close pages/contexts on remote browser - just disconnect
  if (state.isRemote) {
    if (state.browser) {
      await state.browser.close(); // This just disconnects, doesn't close the browser
      state.browser = null;
    }
    state.context = null;
    state.page = null;
    state.currentUrl = null;
    state.lastSnapshot = null;
    state.isRemote = false;
    return;
  }

  if (state.context) {
    await state.context.close();
    state.context = null;
    state.page = null;
  }
  if (state.browser) {
    await state.browser.close();
    state.browser = null;
  }
  state.currentUrl = null;
  state.lastSnapshot = null;
}

/**
 * Analyze the current page state (fast - reuses page)
 */
export async function analyze(url: string, outputDir = 'out'): Promise<{ snapshot: PageSnapshot; report: string }> {
  const page = await getPage(url);

  // Extract all data in parallel
  const [landmarks, sections, overlays, actions, theme, classes, title] = await Promise.all([
    extractLandmarks(page, viewport),
    extractSections(page, viewport),
    extractOverlays(page, viewport),
    extractActions(page, viewport),
    extractTheme(page),
    extractClasses(page),
    page.title()
  ]);

  const textSample = await page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    return main.textContent?.slice(0, 500)?.replace(/\s+/g, ' ').trim() || '';
  });

  // Ensure output dir exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Screenshot - with timeout and fallback for CDP connections
  const screenshotPath = 'page.png';
  try {
    await page.screenshot({ 
      path: join(outputDir, screenshotPath),
      timeout: 10000,
      animations: 'disabled'
    });
  } catch {
    // CDP connections can have screenshot issues - continue without it
    console.log('⚠️  Screenshot skipped (CDP connection)');
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
    classes,
    textSample,
    screenshotPath,
    timestamp: new Date().toISOString()
  };

  state.lastSnapshot = snapshot;

  // Generate report
  const report = generateReport(snapshot);

  // Write files
  writeFileSync(join(outputDir, 'snapshot.json'), JSON.stringify(snapshot, null, 2));
  writeFileSync(join(outputDir, 'report.txt'), report);

  return { snapshot, report };
}

/**
 * Save current state as baseline
 */
export function saveBaseline(outputDir = 'out'): string {
  const snapshotPath = join(outputDir, 'snapshot.json');
  const screenshotPath = join(outputDir, 'page.png');

  if (existsSync(snapshotPath)) {
    copyFileSync(snapshotPath, join(outputDir, 'snapshot-before.json'));
  }
  if (existsSync(screenshotPath)) {
    copyFileSync(screenshotPath, join(outputDir, 'page-before.png'));
  }

  return 'Baseline saved';
}

// ============================================
// INTERACTIONS - Click, Type, Select, etc.
// ============================================

export interface InteractionResult {
  success: boolean;
  action: string;
  target: string;
  message: string;
  durationMs: number;
}

/**
 * Find the best selector for an element
 */
function findSelector(target: string, snapshot?: PageSnapshot | null): string {
  // If it looks like a selector already, use it
  if (target.startsWith('[') || target.startsWith('#') || target.startsWith('.') || target.includes('=')) {
    return target;
  }

  // Try to find by name or locator in last snapshot
  if (snapshot?.actions) {
    const match = snapshot.actions.find(a => 
      a.name.toLowerCase().includes(target.toLowerCase()) ||
      // Match testId within the locator value (e.g., value contains "field-name")
      (a.locator.type === 'testId' && a.locator.value.toLowerCase().includes(target.toLowerCase()))
    );
    if (match) {
      // The locator.value is already a complete selector, use it directly
      return match.locator.value;
    }
  }

  // Try data-testid directly (common pattern)
  // This handles cases where the element wasn't in the snapshot but has a testId
  if (/^[\w-]+$/.test(target)) {
    return `[data-testid="${target}"]`;
  }

  // Fallback: treat as text selector
  return `text=${target}`;
}

/**
 * Click an element
 */
export async function click(target: string, url?: string): Promise<InteractionResult> {
  const start = Date.now();
  const page = await getPage(url);
  const selector = findSelector(target, state.lastSnapshot);

  try {
    await page.click(selector, { timeout: 5000 });
    // Wait for any navigation or updates
    await page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {});
    
    return {
      success: true,
      action: 'click',
      target: selector,
      message: `Clicked "${target}"`,
      durationMs: Date.now() - start
    };
  } catch (error) {
    return {
      success: false,
      action: 'click',
      target: selector,
      message: `Failed to click "${target}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      durationMs: Date.now() - start
    };
  }
}

/**
 * Type text into an input
 */
export async function type(target: string, text: string, url?: string): Promise<InteractionResult> {
  const start = Date.now();
  const page = await getPage(url);
  const selector = findSelector(target, state.lastSnapshot);

  try {
    await page.fill(selector, text, { timeout: 5000 });
    
    return {
      success: true,
      action: 'type',
      target: selector,
      message: `Typed "${text}" into "${target}"`,
      durationMs: Date.now() - start
    };
  } catch (error) {
    return {
      success: false,
      action: 'type',
      target: selector,
      message: `Failed to type into "${target}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      durationMs: Date.now() - start
    };
  }
}

/**
 * Select an option from a dropdown
 */
export async function select(target: string, value: string, url?: string): Promise<InteractionResult> {
  const start = Date.now();
  const page = await getPage(url);
  const selector = findSelector(target, state.lastSnapshot);

  try {
    await page.selectOption(selector, value, { timeout: 5000 });
    
    return {
      success: true,
      action: 'select',
      target: selector,
      message: `Selected "${value}" in "${target}"`,
      durationMs: Date.now() - start
    };
  } catch (error) {
    return {
      success: false,
      action: 'select',
      target: selector,
      message: `Failed to select in "${target}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      durationMs: Date.now() - start
    };
  }
}

/**
 * Hover over an element
 */
export async function hover(target: string, url?: string): Promise<InteractionResult> {
  const start = Date.now();
  const page = await getPage(url);
  const selector = findSelector(target, state.lastSnapshot);

  try {
    await page.hover(selector, { timeout: 5000 });
    
    return {
      success: true,
      action: 'hover',
      target: selector,
      message: `Hovered over "${target}"`,
      durationMs: Date.now() - start
    };
  } catch (error) {
    return {
      success: false,
      action: 'hover',
      target: selector,
      message: `Failed to hover "${target}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      durationMs: Date.now() - start
    };
  }
}

/**
 * Press a keyboard key
 */
export async function press(key: string, url?: string): Promise<InteractionResult> {
  const start = Date.now();
  const page = await getPage(url);

  try {
    await page.keyboard.press(key);
    
    return {
      success: true,
      action: 'press',
      target: key,
      message: `Pressed "${key}"`,
      durationMs: Date.now() - start
    };
  } catch (error) {
    return {
      success: false,
      action: 'press',
      target: key,
      message: `Failed to press "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      durationMs: Date.now() - start
    };
  }
}

/**
 * Wait for an element to appear
 */
export async function waitFor(target: string, url?: string, timeoutMs = 5000): Promise<InteractionResult> {
  const start = Date.now();
  const page = await getPage(url);
  const selector = findSelector(target, state.lastSnapshot);

  try {
    await page.waitForSelector(selector, { timeout: timeoutMs });
    
    return {
      success: true,
      action: 'waitFor',
      target: selector,
      message: `Element "${target}" appeared`,
      durationMs: Date.now() - start
    };
  } catch (error) {
    return {
      success: false,
      action: 'waitFor',
      target: selector,
      message: `Element "${target}" did not appear within ${timeoutMs}ms`,
      durationMs: Date.now() - start
    };
  }
}

/**
 * Scroll the page
 */
export async function scroll(direction: 'up' | 'down' | 'top' | 'bottom', url?: string): Promise<InteractionResult> {
  const start = Date.now();
  const page = await getPage(url);

  try {
    switch (direction) {
      case 'up':
        await page.keyboard.press('PageUp');
        break;
      case 'down':
        await page.keyboard.press('PageDown');
        break;
      case 'top':
        await page.evaluate(() => window.scrollTo(0, 0));
        break;
      case 'bottom':
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        break;
    }
    
    return {
      success: true,
      action: 'scroll',
      target: direction,
      message: `Scrolled ${direction}`,
      durationMs: Date.now() - start
    };
  } catch (error) {
    return {
      success: false,
      action: 'scroll',
      target: direction,
      message: `Failed to scroll ${direction}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      durationMs: Date.now() - start
    };
  }
}

/**
 * Get current page info without full analysis
 */
export async function getPageInfo(url?: string): Promise<{ url: string; title: string; hasPage: boolean }> {
  if (!state.page) {
    return { url: '', title: '', hasPage: false };
  }
  const page = await getPage(url);
  return {
    url: page.url(),
    title: await page.title(),
    hasPage: true
  };
}

/**
 * Get the current value of an input, select, or textarea
 */
export async function getValue(target: string, url?: string): Promise<InteractionResult & { value?: string }> {
  const start = Date.now();
  const page = await getPage(url);
  const selector = findSelector(target, state.lastSnapshot);

  try {
    const value = await page.inputValue(selector, { timeout: 5000 });
    
    return {
      success: true,
      action: 'getValue',
      target: selector,
      message: `Got value "${value}" from "${target}"`,
      value,
      durationMs: Date.now() - start
    };
  } catch {
    // Try getting text content for non-input elements
    try {
      const text = await page.locator(selector).textContent({ timeout: 2000 });
      return {
        success: true,
        action: 'getValue',
        target: selector,
        message: `Got text "${text}" from "${target}"`,
        value: text || '',
        durationMs: Date.now() - start
      };
    } catch (error) {
      return {
        success: false,
        action: 'getValue',
        target: selector,
        message: `Failed to get value from "${target}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        durationMs: Date.now() - start
      };
    }
  }
}

/**
 * Check if an element is visible and optionally enabled
 */
export async function isVisible(target: string, url?: string): Promise<InteractionResult & { visible?: boolean; enabled?: boolean }> {
  const start = Date.now();
  const page = await getPage(url);
  const selector = findSelector(target, state.lastSnapshot);

  try {
    const locator = page.locator(selector);
    const visible = await locator.isVisible({ timeout: 2000 });
    let enabled = true;
    
    if (visible) {
      enabled = await locator.isEnabled({ timeout: 1000 }).catch(() => true);
    }
    
    return {
      success: true,
      action: 'isVisible',
      target: selector,
      message: visible 
        ? `"${target}" is visible${enabled ? '' : ' (disabled)'}`
        : `"${target}" is not visible`,
      visible,
      enabled,
      durationMs: Date.now() - start
    };
  } catch (error) {
    return {
      success: false,
      action: 'isVisible',
      target: selector,
      message: `Failed to check visibility of "${target}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      visible: false,
      enabled: false,
      durationMs: Date.now() - start
    };
  }
}

/**
 * Take a screenshot without full analysis
 * @param outputPath - Path to save the screenshot
 * @param url - Optional URL to navigate to first
 * @param options - { fast: true } skips font/animation waiting (only works on launched browsers)
 */
export async function screenshot(
  outputPath: string, 
  url?: string,
  options?: { fast?: boolean }
): Promise<InteractionResult> {
  const start = Date.now();
  const page = await getPage(url);

  try {
    // Fast mode only works on launched browsers (not CDP connections)
    if (options?.fast && !state.isRemote) {
      const client = await page.context().newCDPSession(page);
      const { data } = await client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false
      });
      writeFileSync(outputPath, Buffer.from(data, 'base64'));
      await client.detach();
    } else {
      // Standard mode or CDP connection
      await page.screenshot({ 
        path: outputPath, 
        timeout: 5000,
        animations: 'disabled'
      });
    }
    
    return {
      success: true,
      action: 'screenshot',
      target: outputPath,
      message: `Screenshot saved to "${outputPath}"`,
      durationMs: Date.now() - start
    };
  } catch (error) {
    return {
      success: false,
      action: 'screenshot',
      target: outputPath,
      message: `Failed to take screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
      durationMs: Date.now() - start
    };
  }
}

/**
 * Get an attribute value from an element
 */
export async function getAttribute(target: string, attribute: string, url?: string): Promise<InteractionResult & { value?: string | null }> {
  const start = Date.now();
  const page = await getPage(url);
  const selector = findSelector(target, state.lastSnapshot);

  try {
    const value = await page.locator(selector).getAttribute(attribute, { timeout: 5000 });
    
    return {
      success: true,
      action: 'getAttribute',
      target: selector,
      message: value !== null 
        ? `Got ${attribute}="${value}" from "${target}"`
        : `"${target}" has no "${attribute}" attribute`,
      value,
      durationMs: Date.now() - start
    };
  } catch (error) {
    return {
      success: false,
      action: 'getAttribute',
      target: selector,
      message: `Failed to get attribute from "${target}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      durationMs: Date.now() - start
    };
  }
}

// Export session API
export const session = {
  analyze,
  saveBaseline,
  closeSession,
  click,
  type,
  select,
  hover,
  press,
  waitFor,
  scroll,
  getPageInfo,
  getValue,
  isVisible,
  screenshot,
  getAttribute
};

export default session;
