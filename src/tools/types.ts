/**
 * WebSight Types
 * Type definitions for page layout and theme analysis
 */

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ViewportInfo {
  width: number;
  height: number;
}

export interface FoldAwareness {
  inViewport: boolean;
  belowFold: boolean;
  aboveFold: boolean;
}

export interface Landmark extends FoldAwareness {
  type: 'header' | 'nav' | 'main' | 'aside' | 'footer';
  selector: string;
  bounds: Bounds;
  label?: string;
}

export interface Section extends FoldAwareness {
  name: string;
  tag: string;
  bounds: Bounds;
  headingLevel?: number;
  headingText?: string;
  testId?: string;
  ariaLabel?: string;
}

export interface Overlay {
  type: 'modal' | 'toast';
  visible: boolean;
  bounds: Bounds;
  label?: string;
  testId?: string;
  coversPage: boolean;
}

export interface Action extends FoldAwareness {
  role: string;
  name: string;
  tag: string;
  disabled: boolean;
  bounds: Bounds;
  locator: LocatorHint;
}

export interface LocatorHint {
  type: 'testId' | 'id' | 'role' | 'css';
  value: string;
  roleAndName?: { role: string; name: string };
}

export interface Theme {
  bodyBackground: string;
  bodyTextColor: string;
  bodyFontFamily: string;
  bodyFontSize: string;
  lineHeight: string;
  fonts: string[];
  fontSizes: string[];
  textColors: string[];
  backgroundColors: Array<{ color: string; weight: number }>;
  borderColors: string[];
  borderRadii: string[];
  cssVariables: Record<string, string>;
}

export interface PageSnapshot {
  url: string;
  title: string;
  viewport: ViewportInfo;
  theme: Theme;
  landmarks: Landmark[];
  sections: Section[];
  overlays: Overlay[];
  actions: Action[];
  classes?: ClassInfo;
  textSample: string;
  screenshotPath: string | null;
  timestamp: string;
}

export interface ClassInfo {
  tailwind: TailwindClasses;
  customClasses: string[];
  inlineStyles: InlineStyleElement[];
  framework: FrameworkHint;
}

export interface TailwindClasses {
  detected: boolean;
  layout: string[];
  spacing: string[];
  colors: string[];
  typography: string[];
  responsivePrefixes: string[];
  stateVariants: string[];
  darkMode: string[];
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

export interface DescribeOptions {
  url: string;
  screenshot: boolean;
  outputDir: string;
}
