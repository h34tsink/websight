/**
 * Action extraction - interactive elements
 */

import type { Page } from 'playwright';
import type { Action, ViewportInfo, Bounds, LocatorHint } from '../types.js';

interface RawAction {
  role: string;
  name: string;
  tag: string;
  disabled: boolean;
  bounds: Bounds;
  testId?: string;
  id?: string;
}

export async function extractActions(page: Page, viewport: ViewportInfo): Promise<Action[]> {
  const rawActions = await page.evaluate(() => {
    const actions: RawAction[] = [];
    const seen = new Set<Element>();

    // Interactive element selectors
    const interactiveSelectors = [
      'button',
      'a[href]',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="switch"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="option"]',
      '[tabindex="0"]',
      '[onclick]'
    ];

    const elements = document.querySelectorAll(interactiveSelectors.join(', '));

    for (const el of elements) {
      if (seen.has(el)) continue;
      if (actions.length >= 60) break;

      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);

      // Skip hidden elements
      if (style.display === 'none' || style.visibility === 'hidden' ||
          style.opacity === '0' || rect.width === 0 || rect.height === 0) {
        continue;
      }

      // Skip very small elements (likely icons without meaning)
      if (rect.width < 10 && rect.height < 10) continue;

      seen.add(el);

      // Determine role
      let role = el.getAttribute('role') || el.tagName.toLowerCase();
      if (el.tagName === 'A') role = 'link';
      if (el.tagName === 'INPUT') {
        const type = (el as HTMLInputElement).type || 'text';
        role = type === 'submit' || type === 'button' ? 'button' : `input:${type}`;
      }

      // Determine accessible name
      let name = '';
      
      // 1. aria-label
      name = el.getAttribute('aria-label') || '';
      
      // 2. aria-labelledby
      if (!name) {
        const labelledBy = el.getAttribute('aria-labelledby');
        if (labelledBy) {
          const labelEl = document.getElementById(labelledBy);
          name = labelEl?.textContent?.trim() || '';
        }
      }

      // 3. Associated label (for inputs)
      if (!name && el.id) {
        const label = document.querySelector(`label[for="${el.id}"]`);
        name = label?.textContent?.trim() || '';
      }

      // 4. Placeholder
      if (!name && 'placeholder' in el) {
        name = (el as HTMLInputElement).placeholder || '';
      }

      // 5. Visible text content
      if (!name) {
        name = el.textContent?.trim().slice(0, 50) || '';
      }

      // 6. Title attribute
      if (!name) {
        name = el.getAttribute('title') || '';
      }

      // 7. Value for buttons
      if (!name && el.tagName === 'INPUT') {
        name = (el as HTMLInputElement).value || '';
      }

      // Skip elements without accessible names
      if (!name) continue;

      const disabled = (el as HTMLButtonElement).disabled === true ||
                      el.getAttribute('aria-disabled') === 'true' ||
                      el.hasAttribute('disabled');

      actions.push({
        role,
        name: name.slice(0, 80),
        tag: el.tagName.toLowerCase(),
        disabled,
        bounds: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height)
        },
        testId: el.getAttribute('data-testid') || undefined,
        id: el.id || undefined
      });
    }

    // Sort by position (top-to-bottom, left-to-right)
    actions.sort((a, b) => {
      if (Math.abs(a.bounds.y - b.bounds.y) > 20) {
        return a.bounds.y - b.bounds.y;
      }
      return a.bounds.x - b.bounds.x;
    });

    return actions;
  });

  return rawActions.map(a => ({
    ...a,
    ...computeFoldAwareness(a.bounds, viewport),
    locator: computeLocator(a)
  }));
}

function computeFoldAwareness(bounds: Bounds, viewport: ViewportInfo) {
  const belowFold = bounds.y >= viewport.height;
  const aboveFold = bounds.y + bounds.h <= 0;
  const inViewport = !belowFold && !aboveFold;
  
  return { inViewport, belowFold, aboveFold };
}

function computeLocator(action: RawAction): LocatorHint {
  // Prefer data-testid
  if (action.testId) {
    return { type: 'testId', value: `[data-testid="${action.testId}"]` };
  }
  
  // Then id
  if (action.id) {
    return { type: 'id', value: `#${action.id}` };
  }
  
  // Fall back to role+name
  return {
    type: 'role',
    value: `role=${action.role}[name="${action.name}"]`,
    roleAndName: { role: action.role, name: action.name }
  };
}
