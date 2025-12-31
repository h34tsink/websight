/**
 * CSS Class extraction - Tailwind detection, class usage, source hints
 */

import type { Page } from 'playwright';

export interface ClassInfo {
  /** Tailwind classes detected on the page */
  tailwind: TailwindClasses;
  /** Custom classes (non-Tailwind) */
  customClasses: string[];
  /** Elements with inline styles (potential refactor targets) */
  inlineStyles: InlineStyleElement[];
  /** Framework detection */
  framework: FrameworkHint;
}

export interface TailwindClasses {
  /** Whether Tailwind is likely in use */
  detected: boolean;
  /** Layout utilities (flex, grid, etc.) */
  layout: string[];
  /** Spacing utilities (p-, m-, gap-, etc.) */
  spacing: string[];
  /** Color utilities (bg-, text-, border-, etc.) */
  colors: string[];
  /** Typography utilities (font-, text-, etc.) */
  typography: string[];
  /** Responsive prefixes found (sm:, md:, lg:, etc.) */
  responsivePrefixes: string[];
  /** State variants found (hover:, focus:, etc.) */
  stateVariants: string[];
  /** Dark mode classes */
  darkMode: string[];
  /** All Tailwind classes found */
  all: string[];
}

export interface InlineStyleElement {
  tag: string;
  selector: string;
  styles: string[];
}

export interface FrameworkHint {
  name: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  indicators: string[];
}

// Tailwind class patterns
const TAILWIND_PATTERNS = {
  // Layout
  layout: /^(flex|grid|block|inline|hidden|container|columns-|aspect-|object-|overflow-|z-|order-|col-|row-|justify-|items-|content-|place-|self-|float-|clear-|isolate|isolation-)/,
  
  // Spacing
  spacing: /^(p[xytblr]?-|m[xytblr]?-|space-[xy]-|gap-|inset-|top-|right-|bottom-|left-)/,
  
  // Sizing
  sizing: /^(w-|h-|min-w-|max-w-|min-h-|max-h-|size-)/,
  
  // Colors
  colors: /^(bg-|text-|border-|ring-|outline-|accent-|caret-|fill-|stroke-|shadow-|from-|via-|to-|decoration-)/,
  
  // Typography
  typography: /^(font-|text-|leading-|tracking-|antialiased|subpixel-|break-|hyphens-|whitespace-|indent-|align-|uppercase|lowercase|capitalize|normal-case|truncate|line-clamp-)/,
  
  // Borders
  borders: /^(border|rounded|divide-|ring-|outline-)/,
  
  // Effects
  effects: /^(shadow|opacity-|mix-blend-|bg-blend-|filter|blur-|brightness-|contrast-|drop-shadow-|grayscale|hue-rotate-|invert|saturate-|sepia|backdrop-)/,
  
  // Transforms
  transforms: /^(scale-|rotate-|translate-|skew-|origin-|transform)/,
  
  // Transitions
  transitions: /^(transition|duration-|ease-|delay-|animate-)/,
  
  // Interactivity
  interactivity: /^(cursor-|pointer-events-|resize|scroll-|snap-|touch-|select-|will-change-)/,
  
  // Responsive prefixes
  responsive: /^(sm:|md:|lg:|xl:|2xl:)/,
  
  // State variants
  states: /^(hover:|focus:|active:|visited:|disabled:|checked:|first:|last:|odd:|even:|group-|peer-)/,
  
  // Dark mode
  darkMode: /^dark:/,
};

// Framework detection patterns
const FRAMEWORK_INDICATORS = {
  tailwind: ['tailwind', 'tw-'],
  bootstrap: ['btn-', 'col-sm-', 'col-md-', 'row', 'container-fluid', 'navbar-', 'd-flex', 'd-grid'],
  bulma: ['is-', 'has-', 'button is-', 'columns', 'column'],
  materialUI: ['MuiButton', 'MuiPaper', 'MuiTypography', 'makeStyles'],
  chakra: ['chakra-', 'css-'],
  antDesign: ['ant-', 'antd-'],
};

export async function extractClasses(page: Page): Promise<ClassInfo> {
  return page.evaluate((patterns) => {
    const allClasses = new Set<string>();
    const tailwindClasses = new Set<string>();
    const customClasses = new Set<string>();
    const inlineStyles: InlineStyleElement[] = [];
    
    const categorized = {
      layout: new Set<string>(),
      spacing: new Set<string>(),
      colors: new Set<string>(),
      typography: new Set<string>(),
      responsivePrefixes: new Set<string>(),
      stateVariants: new Set<string>(),
      darkMode: new Set<string>(),
    };

    const elements = document.querySelectorAll('*');
    const sampleSize = Math.min(elements.length, 1000);
    
    for (let i = 0; i < sampleSize; i++) {
      const el = elements[i] as HTMLElement;
      
      // Extract classes
      if (el.classList && el.classList.length > 0) {
        el.classList.forEach(cls => {
          allClasses.add(cls);
          
          // Check for Tailwind patterns
          let isTailwind = false;
          
          // Check responsive/state prefixes first
          if (/^(sm:|md:|lg:|xl:|2xl:)/.test(cls)) {
            categorized.responsivePrefixes.add(cls.split(':')[0] + ':');
            isTailwind = true;
          }
          if (/^(hover:|focus:|active:|group-|peer-)/.test(cls)) {
            categorized.stateVariants.add(cls.split(':')[0] + ':');
            isTailwind = true;
          }
          if (/^dark:/.test(cls)) {
            categorized.darkMode.add(cls);
            isTailwind = true;
          }
          
          // Strip prefix for pattern matching
          const baseClass = cls.replace(/^(sm:|md:|lg:|xl:|2xl:|hover:|focus:|active:|dark:|group-|peer-)+/, '');
          
          // Check against Tailwind patterns
          if (/^(flex|grid|block|inline|hidden|container)/.test(baseClass) ||
              /^(justify-|items-|content-|self-|gap-)/.test(baseClass)) {
            categorized.layout.add(cls);
            isTailwind = true;
          }
          if (/^[pm][xytblr]?-\d|^(space-[xy]-|gap-)/.test(baseClass)) {
            categorized.spacing.add(cls);
            isTailwind = true;
          }
          if (/^(bg-|text-|border-|ring-)/.test(baseClass)) {
            categorized.colors.add(cls);
            isTailwind = true;
          }
          if (/^(font-|text-[xsmlg]|leading-|tracking-)/.test(baseClass)) {
            categorized.typography.add(cls);
            isTailwind = true;
          }
          if (/^(w-|h-|min-|max-)/.test(baseClass)) {
            isTailwind = true;
          }
          if (/^(rounded|shadow|opacity-|transition|duration-)/.test(baseClass)) {
            isTailwind = true;
          }
          
          if (isTailwind) {
            tailwindClasses.add(cls);
          } else if (!cls.startsWith('_') && cls.length > 1) {
            customClasses.add(cls);
          }
        });
      }
      
      // Check for inline styles
      if (el.style && el.style.length > 0) {
        const styles: string[] = [];
        for (let j = 0; j < el.style.length; j++) {
          styles.push(el.style[j]);
        }
        if (styles.length > 0) {
          // Build a simple selector
          let selector = el.tagName.toLowerCase();
          if (el.id) selector += `#${el.id}`;
          else if (el.classList.length > 0) selector += `.${el.classList[0]}`;
          
          // Only include first 20 elements with inline styles
          if (inlineStyles.length < 20) {
            inlineStyles.push({
              tag: el.tagName.toLowerCase(),
              selector,
              styles
            });
          }
        }
      }
    }
    
    // Detect framework
    const allClassesArray = [...allClasses];
    let framework: { name: string | null; confidence: 'high' | 'medium' | 'low' | 'none'; indicators: string[] } = {
      name: null,
      confidence: 'none',
      indicators: []
    };
    
    // Check for Tailwind
    if (tailwindClasses.size > 10) {
      framework = {
        name: 'Tailwind CSS',
        confidence: tailwindClasses.size > 50 ? 'high' : 'medium',
        indicators: [...tailwindClasses].slice(0, 10)
      };
    }
    // Check for Bootstrap
    else if (allClassesArray.some(c => /^(btn-|col-(sm|md|lg)-|navbar-|d-flex)/.test(c))) {
      const bootstrapClasses = allClassesArray.filter(c => /^(btn|col|row|container|navbar|d-|justify-content|align-items)/.test(c));
      framework = {
        name: 'Bootstrap',
        confidence: bootstrapClasses.length > 10 ? 'high' : 'medium',
        indicators: bootstrapClasses.slice(0, 10)
      };
    }
    // Check for MUI
    else if (allClassesArray.some(c => c.startsWith('Mui') || c.startsWith('css-'))) {
      framework = {
        name: 'Material UI',
        confidence: 'medium',
        indicators: allClassesArray.filter(c => c.startsWith('Mui')).slice(0, 10)
      };
    }
    
    return {
      tailwind: {
        detected: tailwindClasses.size > 5,
        layout: [...categorized.layout].slice(0, 30),
        spacing: [...categorized.spacing].slice(0, 30),
        colors: [...categorized.colors].slice(0, 30),
        typography: [...categorized.typography].slice(0, 20),
        responsivePrefixes: [...categorized.responsivePrefixes],
        stateVariants: [...categorized.stateVariants],
        darkMode: [...categorized.darkMode].slice(0, 20),
        all: [...tailwindClasses].slice(0, 100),
      },
      customClasses: [...customClasses].slice(0, 50),
      inlineStyles,
      framework
    };
  }, {});
}
