#!/usr/bin/env npx tsx
/**
 * Compare current page with baseline - run with: npm run diff
 */
import { compareWithBaseline, closeBrowser } from './api.js';

await compareWithBaseline();
await closeBrowser();
