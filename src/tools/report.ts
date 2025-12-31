/**
 * Report generator - human-readable page description
 */

import type { PageSnapshot, Landmark, Section, Overlay, Action } from './types.js';

export function generateReport(snapshot: PageSnapshot): string {
  const lines: string[] = [];
  const { url, title, viewport, theme, landmarks, sections, overlays, actions } = snapshot;

  // Header
  lines.push('='.repeat(70));
  lines.push('WEBSIGHT - PAGE LAYOUT & THEME REPORT');
  lines.push('='.repeat(70));
  lines.push(`URL:      ${url}`);
  lines.push(`Title:    ${title}`);
  lines.push(`Viewport: ${viewport.width}×${viewport.height}`);
  lines.push(`Generated: ${snapshot.timestamp}`);
  lines.push('');

  // Check for overlays first
  const visibleOverlays = overlays.filter(o => o.visible);
  if (visibleOverlays.length > 0) {
    lines.push('⚠️  OVERLAYS DETECTED');
    lines.push('-'.repeat(40));
    for (const overlay of visibleOverlays) {
      const label = overlay.label || overlay.testId || 'Unnamed';
      if (overlay.type === 'modal' && overlay.coversPage) {
        lines.push(`• MODAL: "${label}" is covering the page - focus interaction inside it`);
      } else if (overlay.type === 'modal') {
        lines.push(`• Modal: "${label}" visible`);
      } else {
        lines.push(`• Toast: "${label}"`);
      }
    }
    lines.push('');
  }

  // What it looks like - natural language description
  lines.push('WHAT IT LOOKS LIKE');
  lines.push('-'.repeat(40));
  lines.push(generateNaturalDescription(snapshot));
  lines.push('');

  // Landmarks
  lines.push('LANDMARKS');
  lines.push('-'.repeat(40));
  if (landmarks.length === 0) {
    lines.push('• No semantic landmarks detected');
  } else {
    const inView = landmarks.filter(l => l.inViewport);
    const belowFold = landmarks.filter(l => l.belowFold);
    
    if (inView.length > 0) {
      lines.push('Above the fold:');
      for (const lm of inView) {
        const label = lm.label ? ` (${lm.label})` : '';
        lines.push(`  • ${lm.type.toUpperCase()}${label} at y=${lm.bounds.y}, ${lm.bounds.w}×${lm.bounds.h}px`);
      }
    }
    if (belowFold.length > 0) {
      lines.push('Below the fold:');
      for (const lm of belowFold) {
        const label = lm.label ? ` (${lm.label})` : '';
        lines.push(`  • ${lm.type.toUpperCase()}${label} at y=${lm.bounds.y}`);
      }
    }
  }
  lines.push('');

  // Sections
  lines.push('SECTIONS');
  lines.push('-'.repeat(40));
  const sectionsInView = sections.filter(s => s.inViewport);
  const sectionsBelowFold = sections.filter(s => s.belowFold);

  if (sectionsInView.length > 0) {
    lines.push('Above the fold:');
    for (const s of sectionsInView) {
      const heading = s.headingText ? ` - "${s.headingText}"` : '';
      const testId = s.testId ? ` [${s.testId}]` : '';
      lines.push(`  • ${s.name}${heading}${testId}`);
    }
  }
  if (sectionsBelowFold.length > 0) {
    lines.push('Scroll down to see:');
    for (const s of sectionsBelowFold) {
      const testId = s.testId ? ` [${s.testId}]` : '';
      lines.push(`  • ${s.name}${testId} (y=${s.bounds.y})`);
    }
  }
  if (sections.length === 0) {
    lines.push('• No distinct sections detected');
  }
  lines.push('');

  // Theme
  lines.push('THEME');
  lines.push('-'.repeat(40));
  lines.push(`Background: ${theme.bodyBackground}`);
  lines.push(`Text Color: ${theme.bodyTextColor}`);
  lines.push(`Font: ${theme.bodyFontFamily} (${theme.bodyFontSize})`);
  lines.push(`Line Height: ${theme.lineHeight}`);
  lines.push('');
  lines.push(`Fonts: ${theme.fonts.join(', ')}`);
  lines.push(`Font Sizes: ${theme.fontSizes.join(', ')}`);
  lines.push(`Border Radii: ${theme.borderRadii.join(', ') || 'none'}`);
  
  // CSS Variables (if found)
  if (theme.cssVariables && Object.keys(theme.cssVariables).length > 0) {
    lines.push('');
    lines.push('CSS VARIABLES (:root)');
    lines.push('-'.repeat(40));
    for (const [prop, value] of Object.entries(theme.cssVariables)) {
      lines.push(`  ${prop}: ${value}`);
    }
  }
  lines.push('');

  // Actions
  lines.push('TOP ACTIONS');
  lines.push('-'.repeat(40));
  const priorityActions = prioritizeActions(actions);
  for (const action of priorityActions.slice(0, 15)) {
    const loc = action.locator.type === 'testId' 
      ? `[${action.locator.value.replace(/\[data-testid="(.+)"\]/, '$1')}]`
      : action.locator.type === 'id' 
        ? action.locator.value
        : '';
    const disabled = action.disabled ? ' (disabled)' : '';
    const fold = action.belowFold ? ' ⬇️' : '';
    lines.push(`  • ${action.role}: "${action.name}"${loc}${disabled}${fold}`);
  }
  lines.push('');

  // Footer
  lines.push('='.repeat(70));
  if (snapshot.screenshotPath) {
    lines.push(`Screenshot: ${snapshot.screenshotPath}`);
  }
  lines.push('JSON: snapshot.json');
  lines.push('='.repeat(70));

  return lines.join('\n');
}

function generateNaturalDescription(snapshot: PageSnapshot): string {
  const { landmarks, sections, overlays, theme, actions } = snapshot;
  const parts: string[] = [];

  // Check for modal overlay first
  const modal = overlays.find(o => o.type === 'modal' && o.visible && o.coversPage);
  if (modal) {
    parts.push(`A modal dialog is currently displayed over the page.`);
  }

  // Describe layout based on landmarks
  const header = landmarks.find(l => l.type === 'header' && l.inViewport);
  const nav = landmarks.find(l => l.type === 'nav' && l.inViewport);
  const main = landmarks.find(l => l.type === 'main');
  const aside = landmarks.find(l => l.type === 'aside' && l.inViewport);
  const footer = landmarks.find(l => l.type === 'footer');

  if (header) {
    const navPart = nav ? ' with navigation' : '';
    parts.push(`The page has a sticky header${navPart} at the top.`);
  }

  // Main content structure
  if (main && aside) {
    parts.push(`The layout is two-column with main content and a sidebar.`);
  } else if (main) {
    parts.push(`The main content area spans the page width.`);
  }

  // Sections above fold
  const aboveFoldSections = sections.filter(s => s.inViewport);
  if (aboveFoldSections.length > 0) {
    const sectionNames = aboveFoldSections.slice(0, 3).map(s => s.name).join(', ');
    parts.push(`Above the fold: ${sectionNames}.`);
  }

  // Sections below fold
  const belowFoldSections = sections.filter(s => s.belowFold);
  if (belowFoldSections.length > 0) {
    const sectionNames = belowFoldSections.slice(0, 3).map(s => s.name).join(', ');
    parts.push(`Scroll down for: ${sectionNames}.`);
  }

  // Footer
  if (footer && footer.belowFold) {
    parts.push(`Footer is at the bottom of the page.`);
  }

  // Theme summary
  const isDark = isDarkTheme(theme.bodyBackground);
  parts.push(`Theme: ${isDark ? 'dark' : 'light'} background with ${theme.bodyFontFamily} font.`);

  // Action summary
  const buttons = actions.filter(a => a.role === 'button' && a.inViewport);
  const links = actions.filter(a => a.role === 'link' && a.inViewport);
  const inputs = actions.filter(a => a.role.startsWith('input') && a.inViewport);

  const actionParts: string[] = [];
  if (buttons.length > 0) actionParts.push(`${buttons.length} buttons`);
  if (links.length > 0) actionParts.push(`${links.length} links`);
  if (inputs.length > 0) actionParts.push(`${inputs.length} inputs`);
  
  if (actionParts.length > 0) {
    parts.push(`Interactive elements visible: ${actionParts.join(', ')}.`);
  }

  return parts.join(' ');
}

function isDarkTheme(bgColor: string): boolean {
  // Parse rgb/rgba
  const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return false;
  
  const [, r, g, b] = match.map(Number);
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

function prioritizeActions(actions: Action[]): Action[] {
  // Prioritize: data-testid > visible > enabled > top of page
  return [...actions].sort((a, b) => {
    // data-testid first
    const aHasTestId = a.locator.type === 'testId' ? 1 : 0;
    const bHasTestId = b.locator.type === 'testId' ? 1 : 0;
    if (aHasTestId !== bHasTestId) return bHasTestId - aHasTestId;

    // In viewport first
    if (a.inViewport !== b.inViewport) return a.inViewport ? -1 : 1;

    // Enabled first
    if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;

    // Top to bottom
    return a.bounds.y - b.bounds.y;
  });
}
