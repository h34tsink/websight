/**
 * Section extraction - meaningful content sections within main
 */

import type { Page } from 'playwright';
import type { Section, ViewportInfo, Bounds } from '../types.js';

interface RawSection {
  name: string;
  tag: string;
  bounds: Bounds;
  headingLevel?: number;
  headingText?: string;
  testId?: string;
  ariaLabel?: string;
}

export async function extractSections(page: Page, viewport: ViewportInfo): Promise<Section[]> {
  const rawSections = await page.evaluate(() => {
    const sections: RawSection[] = [];
    const seen = new Set<Element>();

    // Look for sections/articles with headings, aria-labels, or data-testid
    const candidates = document.querySelectorAll(
      'section, article, [data-testid*="section"], [data-testid*="hero"], ' +
      '[data-testid*="form"], [data-testid*="table"], [data-testid*="card"], ' +
      '[role="region"]'
    );

    for (const el of candidates) {
      if (seen.has(el)) continue;

      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);

      // Skip hidden or tiny elements
      if (style.display === 'none' || style.visibility === 'hidden' ||
          rect.width < 100 || rect.height < 50) {
        continue;
      }

      const testId = el.getAttribute('data-testid') || undefined;
      const ariaLabel = el.getAttribute('aria-label') || undefined;
      
      // Find heading inside
      const heading = el.querySelector('h1, h2, h3, h4, h5, h6');
      let headingLevel: number | undefined;
      let headingText: string | undefined;
      
      if (heading) {
        headingLevel = parseInt(heading.tagName[1]);
        headingText = heading.textContent?.trim().slice(0, 100);
      }

      // Skip sections without meaningful identifiers
      if (!testId && !ariaLabel && !headingText) {
        continue;
      }

      // Determine section name
      let name = ariaLabel || headingText || testId || 'Unnamed Section';
      if (testId && !ariaLabel && !headingText) {
        // Convert testId to readable name: "hero-section" -> "Hero Section"
        name = testId.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }

      seen.add(el);
      sections.push({
        name,
        tag: el.tagName.toLowerCase(),
        bounds: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height)
        },
        headingLevel,
        headingText,
        testId,
        ariaLabel
      });
    }

    // Sort by vertical position
    sections.sort((a, b) => a.bounds.y - b.bounds.y);
    
    return sections.slice(0, 20); // Limit to prevent noise
  });

  return rawSections.map(s => ({
    ...s,
    ...computeFoldAwareness(s.bounds, viewport)
  }));
}

function computeFoldAwareness(bounds: Bounds, viewport: ViewportInfo) {
  const belowFold = bounds.y >= viewport.height;
  const aboveFold = bounds.y + bounds.h <= 0;
  const inViewport = !belowFold && !aboveFold;
  
  return { inViewport, belowFold, aboveFold };
}
