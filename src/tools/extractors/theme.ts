/**
 * Theme extraction - colors, fonts, spacing, CSS variables
 */

import type { Page } from 'playwright';
import type { Theme } from '../types.js';

export async function extractTheme(page: Page): Promise<Theme> {
  return page.evaluate(() => {
    const body = document.body;
    const bodyStyle = getComputedStyle(body);
    const rootStyle = getComputedStyle(document.documentElement);
    
    const fonts = new Set<string>();
    const fontSizes = new Map<string, number>();
    const textColors = new Map<string, number>();
    const bgColors = new Map<string, number>();
    const borderColors = new Set<string>();
    const borderRadii = new Set<string>();
    
    // Extract CSS custom properties from :root
    const cssVariables: Record<string, string> = {};
    const rootRules = document.styleSheets;
    try {
      for (const sheet of rootRules) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
              const style = rule.style;
              for (let i = 0; i < style.length; i++) {
                const prop = style[i];
                if (prop.startsWith('--')) {
                  cssVariables[prop] = style.getPropertyValue(prop).trim();
                }
              }
            }
          }
        } catch (e) {
          // Cross-origin stylesheet, skip
        }
      }
    } catch (e) {
      // Stylesheet access error
    }
    
    const elements = document.querySelectorAll('*');
    const sampleSize = Math.min(elements.length, 500);
    
    for (let i = 0; i < sampleSize; i++) {
      const el = elements[i];
      const cs = getComputedStyle(el);
      
      // Fonts
      const fontFamily = cs.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
      if (fontFamily && fontFamily !== 'inherit') {
        fonts.add(fontFamily);
      }
      
      // Font sizes
      const fontSize = cs.fontSize;
      if (fontSize && fontSize !== '0px') {
        fontSizes.set(fontSize, (fontSizes.get(fontSize) || 0) + 1);
      }
      
      // Text colors
      const color = cs.color;
      if (color && color !== 'rgba(0, 0, 0, 0)') {
        textColors.set(color, (textColors.get(color) || 0) + 1);
      }
      
      // Background colors
      const bg = cs.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        const normalized = bg.replace(/\s+/g, '');
        bgColors.set(normalized, (bgColors.get(normalized) || 0) + 1);
      }
      
      // Border colors
      const borderColor = cs.borderTopColor;
      if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && 
          cs.borderTopWidth !== '0px') {
        borderColors.add(borderColor);
      }
      
      // Border radius
      const radius = cs.borderRadius;
      if (radius && radius !== '0px') {
        borderRadii.add(radius);
      }
    }

    // Sort by frequency
    const topFontSizes = [...fontSizes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([size]) => size);
    
    const topTextColors = [...textColors.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([color]) => color);

    const topBgColors = [...bgColors.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([color, weight]) => ({ color, weight }));

    return {
      bodyBackground: bodyStyle.backgroundColor,
      bodyTextColor: bodyStyle.color,
      bodyFontFamily: bodyStyle.fontFamily.split(',')[0].trim().replace(/['"]/g, ''),
      bodyFontSize: bodyStyle.fontSize,
      lineHeight: bodyStyle.lineHeight,
      fonts: [...fonts].slice(0, 6),
      fontSizes: topFontSizes,
      textColors: topTextColors,
      backgroundColors: topBgColors,
      borderColors: [...borderColors].slice(0, 6),
      borderRadii: [...borderRadii].slice(0, 8),
      cssVariables
    };
  });
}
