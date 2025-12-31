#!/usr/bin/env npx tsx
/**
 * Quick look at the page - run with: npm run look
 */
import { look, closeBrowser } from './api.js';

await look();
await closeBrowser();
