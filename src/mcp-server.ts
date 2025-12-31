/**
 * WebSight MCP Server
 * Provides visual analysis tools via Model Context Protocol
 * 
 * @author Sean Treppa
 * 
 * Tools:
 *   - websight: Analyze, baseline, and diff pages
 *   - Auto-detects active page from browser or dev server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { describe, saveBaseline, closeBrowser } from './tools/api.js';
import { compareSnapshots, formatCompareReport } from './tools/compare.js';
import { detectActivePage, detectRunningServers } from './tools/detect.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { PageSnapshot } from './tools/types.js';

const server = new Server(
  { name: 'websight', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Output directory
const OUTPUT_DIR = 'out';

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'websight',
      description: `Visual analysis tool for UI work. Auto-detects the active page.

URL AUTO-DETECTION (when url not provided):
1. Checks for browser with remote debugging (Chrome/Edge CDP)
2. Scans for running dev servers (ports 5173, 3000, 8080, etc.)
3. Falls back to localhost:5173

WORKFLOW:
1. websight(action="look") - Analyze page, get CSS vars, theme, layout
2. websight(action="baseline") - Save before state
3. Make your code changes
4. websight(action="diff") - Verify changes, see % pixel difference

Example: "use websight to change the button colors"
- look → see current theme, CSS variables
- baseline → save before
- edit code
- diff → verify changes`,
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['look', 'baseline', 'diff'],
            description: 'look = analyze page, baseline = save before state, diff = compare after changes'
          },
          url: {
            type: 'string',
            description: 'URL to analyze. If not provided, auto-detects from running dev server or browser.'
          }
        },
        required: ['action']
      }
    }
  ]
}));

// Resolve URL - use provided or auto-detect
async function resolveUrl(providedUrl?: string): Promise<{ url: string; detected: boolean; source?: string }> {
  if (providedUrl) {
    return { url: providedUrl, detected: false };
  }
  const detected = await detectActivePage();
  return { 
    url: detected.url, 
    detected: true, 
    source: detected.source === 'cdp' ? 'browser tab' : 
            detected.source === 'devserver' ? `dev server (port ${detected.port})` : 
            'default'
  };
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const action = args?.action as string;

  try {
    if (name === 'websight') {
      const { url, detected, source } = await resolveUrl(args?.url as string);
      const urlInfo = detected ? `\n📍 Auto-detected: ${url} (${source})` : '';
      
      switch (action) {
        case 'look': {
          const { report } = await describe({ url, outputDir: OUTPUT_DIR });
          return { content: [{ type: 'text', text: urlInfo + '\n' + report }] };
        }

        case 'baseline': {
          await describe({ url, outputDir: OUTPUT_DIR });
          saveBaseline(OUTPUT_DIR);
          return { 
            content: [{ 
              type: 'text', 
              text: `✓ Baseline saved for ${url}${urlInfo}\n\nNow make your code changes, then call websight(action="diff") to verify.`
            }] 
          };
        }

        case 'diff': {
          const beforePath = join(OUTPUT_DIR, 'snapshot-before.json');
          
          if (!existsSync(beforePath)) {
            return {
              content: [{
                type: 'text',
                text: '❌ No baseline found. Call websight(action="baseline") first.'
              }]
            };
          }

          const before: PageSnapshot = JSON.parse(readFileSync(beforePath, 'utf-8'));
          const { snapshot: after } = await describe({ url, outputDir: OUTPUT_DIR });
          
          const result = compareSnapshots(before, after, beforePath, join(OUTPUT_DIR, 'snapshot.json'));
          const report = formatCompareReport(result);
          
          return { content: [{ type: 'text', text: urlInfo + '\n' + report }] };
        }

        default:
          return { content: [{ type: 'text', text: `Unknown action: ${action}. Use look, baseline, or diff.` }] };
      }
    }
    
    // Legacy tool names for backwards compatibility
    const { url } = await resolveUrl(args?.url as string);
    
    switch (name) {
      case 'websight_look': {
        const { report } = await describe({ url, outputDir: OUTPUT_DIR });
        return { content: [{ type: 'text', text: report }] };
      }

      case 'websight_baseline': {
        await describe({ url, outputDir: OUTPUT_DIR });
        saveBaseline(OUTPUT_DIR);
        return { 
          content: [{ 
            type: 'text', 
            text: `✓ Baseline saved for ${url}\n\nFiles:\n  • out/snapshot-before.json\n  • out/page-before.png\n\nNow make your visual changes, then run websight_diff to compare.`
          }] 
        };
      }

      case 'websight_diff': {
        const beforePath = join(OUTPUT_DIR, 'snapshot-before.json');
        
        if (!existsSync(beforePath)) {
          return {
            content: [{
              type: 'text',
              text: '❌ No baseline found. Run websight_baseline first to save the "before" state.'
            }]
          };
        }

        const before: PageSnapshot = JSON.parse(readFileSync(beforePath, 'utf-8'));
        const { snapshot: after } = await describe({ url, outputDir: OUTPUT_DIR });
        
        const result = compareSnapshots(before, after, beforePath, join(OUTPUT_DIR, 'snapshot.json'));
        const report = formatCompareReport(result);
        
        return { content: [{ type: 'text', text: report }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `Error: ${message}` }] };
  }
});

// Cleanup on exit
process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('WebSight MCP Server running');
}

main().catch(console.error);
