/**
 * Overlay extraction - modals and toasts
 */

import type { Page } from 'playwright';
import type { Overlay, ViewportInfo, Bounds } from '../types.js';

export async function extractOverlays(page: Page, viewport: ViewportInfo): Promise<Overlay[]> {
  return page.evaluate((vp) => {
    const overlays: Overlay[] = [];

    // Modal detection
    const modalSelectors = [
      '[role="dialog"][aria-modal="true"]',
      '[role="dialog"]',
      '[data-testid*="modal"]',
      '.modal:not([style*="display: none"])',
      '[class*="modal"][class*="open"]',
      '[class*="modal"][class*="visible"]',
      '[class*="modal"][class*="show"]'
    ];

    for (const selector of modalSelectors) {
      try {
        const modals = document.querySelectorAll(selector);
        for (const modal of modals) {
          const rect = modal.getBoundingClientRect();
          const style = getComputedStyle(modal);
          
          // Check if visible
          const isVisible = style.display !== 'none' && 
                           style.visibility !== 'hidden' &&
                           style.opacity !== '0' &&
                           rect.width > 0 && rect.height > 0;

          if (!isVisible) continue;

          // Check if it covers significant portion of viewport
          const coversPage = rect.width > vp.width * 0.5 || rect.height > vp.height * 0.5;

          overlays.push({
            type: 'modal',
            visible: true,
            bounds: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              w: Math.round(rect.width),
              h: Math.round(rect.height)
            },
            label: modal.getAttribute('aria-label') || 
                   modal.getAttribute('aria-labelledby') || 
                   undefined,
            testId: modal.getAttribute('data-testid') || undefined,
            coversPage
          });
        }
      } catch {
        // Invalid selector, skip
      }
    }

    // Toast detection
    const toastSelectors = [
      '[role="status"]',
      '[role="alert"]',
      '[data-testid*="toast"]',
      '[class*="toast"]:not([style*="display: none"])',
      '[class*="snackbar"]:not([style*="display: none"])',
      '[class*="notification"]:not([style*="display: none"])'
    ];

    for (const selector of toastSelectors) {
      try {
        const toasts = document.querySelectorAll(selector);
        for (const toast of toasts) {
          const rect = toast.getBoundingClientRect();
          const style = getComputedStyle(toast);
          
          const isVisible = style.display !== 'none' && 
                           style.visibility !== 'hidden' &&
                           style.opacity !== '0' &&
                           rect.width > 0 && rect.height > 0;

          if (!isVisible) continue;

          // Skip if already added as modal
          if (overlays.some(o => 
            o.bounds.x === Math.round(rect.x) && 
            o.bounds.y === Math.round(rect.y))) {
            continue;
          }

          overlays.push({
            type: 'toast',
            visible: true,
            bounds: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              w: Math.round(rect.width),
              h: Math.round(rect.height)
            },
            label: toast.getAttribute('aria-label') || 
                   toast.textContent?.trim().slice(0, 50) || 
                   undefined,
            testId: toast.getAttribute('data-testid') || undefined,
            coversPage: false
          });
        }
      } catch {
        // Invalid selector, skip
      }
    }

    return overlays;
  }, viewport);
}
