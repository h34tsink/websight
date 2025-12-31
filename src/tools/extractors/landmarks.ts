/**
 * Landmark extraction - header, nav, main, aside, footer
 */

import type { Page } from 'playwright';
import type { Landmark, ViewportInfo, Bounds } from '../types.js';

interface RawLandmark {
  type: 'header' | 'nav' | 'main' | 'aside' | 'footer';
  selector: string;
  bounds: Bounds;
  label?: string;
}

export async function extractLandmarks(page: Page, viewport: ViewportInfo): Promise<Landmark[]> {
  const rawLandmarks = await page.evaluate(() => {
    const landmarks: RawLandmark[] = [];
    
    const landmarkSelectors: Array<{
      type: 'header' | 'nav' | 'main' | 'aside' | 'footer';
      selectors: string[];
    }> = [
      { type: 'header', selectors: ['header', '[role="banner"]'] },
      { type: 'nav', selectors: ['nav', '[role="navigation"]'] },
      { type: 'main', selectors: ['main', '[role="main"]'] },
      { type: 'aside', selectors: ['aside', '[role="complementary"]'] },
      { type: 'footer', selectors: ['footer', '[role="contentinfo"]'] }
    ];

    const seen = new Set<Element>();

    for (const { type, selectors } of landmarkSelectors) {
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          if (seen.has(el)) continue;
          seen.add(el);

          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          
          // Skip hidden elements
          if (style.display === 'none' || style.visibility === 'hidden' || 
              rect.width === 0 || rect.height === 0) {
            continue;
          }

          const label = el.getAttribute('aria-label') || 
                       el.getAttribute('aria-labelledby') ||
                       (el as HTMLElement).id || 
                       undefined;

          landmarks.push({
            type,
            selector: selector,
            bounds: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              w: Math.round(rect.width),
              h: Math.round(rect.height)
            },
            label
          });
        }
      }
    }

    return landmarks;
  });

  // Add fold awareness
  return rawLandmarks.map(lm => ({
    ...lm,
    ...computeFoldAwareness(lm.bounds, viewport)
  }));
}

function computeFoldAwareness(bounds: Bounds, viewport: ViewportInfo) {
  const belowFold = bounds.y >= viewport.height;
  const aboveFold = bounds.y + bounds.h <= 0;
  const inViewport = !belowFold && !aboveFold;
  
  return { inViewport, belowFold, aboveFold };
}
