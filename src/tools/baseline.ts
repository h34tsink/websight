#!/usr/bin/env npx tsx
/**
 * Save current snapshot as baseline - run with: npm run baseline
 */
import { describe, saveBaseline, closeBrowser } from './api.js';

// Take snapshot first, then save as baseline
await describe({ url: 'http://localhost:5173/' });
saveBaseline();
console.log('✓ Baseline saved (snapshot-before.json + page-before.png)');
await closeBrowser();
