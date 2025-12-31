/**
 * Browser Detection - Find active browser tab or running dev servers
 */

import { chromium } from 'playwright';
import { createConnection } from 'net';

// Common dev server ports to check
const DEV_PORTS = [5173, 3000, 3001, 8080, 8000, 4200, 4000, 5000, 5500];

// Chrome/Edge CDP ports to try
const CDP_PORTS = [9222, 9229];

/**
 * Check if a port is open (has a server running)
 */
async function isPortOpen(port: number, host = 'localhost'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    socket.setTimeout(300);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Try to connect to an existing browser via CDP and get active tab URL
 */
async function getActiveTabFromCDP(port: number): Promise<string | null> {
  try {
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
    const contexts = browser.contexts();
    
    for (const context of contexts) {
      const pages = context.pages();
      // Find a non-empty page (not about:blank, not devtools)
      for (const page of pages) {
        const url = page.url();
        if (url && 
            !url.startsWith('about:') && 
            !url.startsWith('chrome://') &&
            !url.startsWith('edge://') &&
            !url.startsWith('devtools://')) {
          await browser.close();
          return url;
        }
      }
    }
    await browser.close();
  } catch {
    // CDP not available on this port
  }
  return null;
}

/**
 * Check if URL returns a valid HTML page
 */
async function isValidPage(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(1000)
    });
    const contentType = response.headers.get('content-type') || '';
    return response.ok && contentType.includes('text/html');
  } catch {
    return false;
  }
}

export interface DetectedPage {
  url: string;
  source: 'cdp' | 'devserver' | 'default';
  port?: number;
}

/**
 * Detect the active page to analyze
 * Priority:
 * 1. Try CDP to get active browser tab
 * 2. Scan for running dev servers
 * 3. Fall back to default localhost:5173
 */
export async function detectActivePage(): Promise<DetectedPage> {
  // 1. Try CDP ports first (if browser is running with remote debugging)
  for (const port of CDP_PORTS) {
    const url = await getActiveTabFromCDP(port);
    if (url) {
      return { url, source: 'cdp', port };
    }
  }

  // 2. Check common dev server ports
  const portChecks = await Promise.all(
    DEV_PORTS.map(async (port) => {
      const open = await isPortOpen(port);
      return { port, open };
    })
  );

  for (const { port, open } of portChecks) {
    if (open) {
      const url = `http://localhost:${port}/`;
      if (await isValidPage(url)) {
        return { url, source: 'devserver', port };
      }
    }
  }

  // 3. Default fallback
  return { 
    url: 'http://localhost:5173/', 
    source: 'default' 
  };
}

/**
 * Get a summary of what's running
 */
export async function detectRunningServers(): Promise<{ port: number; url: string }[]> {
  const servers: { port: number; url: string }[] = [];
  
  const checks = await Promise.all(
    DEV_PORTS.map(async (port) => {
      const open = await isPortOpen(port);
      if (open) {
        const url = `http://localhost:${port}/`;
        const valid = await isValidPage(url);
        return valid ? { port, url } : null;
      }
      return null;
    })
  );

  return checks.filter((s): s is { port: number; url: string } => s !== null);
}
