# WebSight TODO List

## High Priority

- [ ] Core screenshot functionality
- [ ] Basic element selection
- [ ] Simple interaction recording
- [ ] Export to common formats (PNG, PDF)

## Medium Priority

- [ ] Browser extension for easier access
- [ ] Multi-browser support (Chrome, Firefox, Safari)
- [ ] Annotation tools (arrows, text, highlights)
- [ ] Cloud storage integration
- [ ] Collaboration features (share screenshots with team)

## Low Priority

- [ ] Advanced editing tools (blur, crop, resize)
- [ ] Video recording capabilities
- [ ] Integration with bug tracking systems
- [ ] Mobile app version
- [ ] Automated screenshot scheduling
- [ ] OCR (Optical Character Recognition) for text extraction
- [ ] GIF creation from multiple screenshots

## Testing & Validation Features

- [ ] Visual Regression Testing Suite - Automatically detect unintended visual changes across multiple pages/routes
- [ ] Accessibility Analysis - Check color contrast ratios, ARIA labels, and WCAG compliance
- [ ] Responsive Design Verification - Test and compare layouts across different viewport sizes (mobile, tablet, desktop)

## Advanced Interactions

- [ ] Form Workflows - Record and replay complex form interactions with validation checks
- [ ] Drag & Drop Support - Handle drag-and-drop UI elements (duplicated from Low Priority)
- [ ] File Upload Simulation - Test file upload interfaces (duplicated from Low Priority)
- [ ] Multi-page Flows - Track visual changes across navigation sequences (e.g., checkout flows)

## Enhanced Visual Analysis

- [ ] Component Detection - Identify and catalog reusable UI components (buttons, cards, modals)
- [ ] Animation Capture - Record and analyze CSS/JS animations and transitions
- [ ] Performance Metrics - Track layout shift (CLS), paint times, and rendering performance
- [ ] Shadow DOM Support - Analyze components within shadow DOM boundaries
- [ ] Design Mockup Comparison - Compare live sites against design mockups (Figma, Sketch, etc.)

## Developer Experience

- [ ] Visual Test Generator - Auto-generate Playwright/Cypress tests from recorded interactions
- [ ] Design System Auditor - Verify consistency with design tokens and style guides
- [ ] Change Changelog - Generate visual diffs with before/after comparisons for PRs
- [ ] Watch Mode - Continuously monitor and report visual changes during development

## AI-Specific Enhancements

- [ ] Natural Language Selectors - "Click the blue button in the top right" → auto-resolve to correct selector
- [ ] Smart Wait Detection - Automatically detect loading states and wait for page stability
- [ ] Error Recovery - Suggest alternative actions when elements aren't found
- [ ] Multi-site Comparison - Compare similar pages across staging/production environments