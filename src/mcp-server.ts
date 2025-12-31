/**
 * WebSight MCP Server
 * Provides visual analysis tools via Model Context Protocol
 * 
 * @author Sean Treppa
 * 
 * Tools:
 *   - websight: Analyze, baseline, diff, and interact with pages
 *   - Auto-detects active page from browser or dev server
 *   - Persistent session for fast operations (~10x faster than cold start)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { 
  analyze, 
  saveBaseline, 
  closeSession,
  click,
  type as typeText,
  select,
  hover,
  press,
  scroll,
  waitFor
} from './tools/session.js';
import { compareSnapshots, formatCompareReport } from './tools/compare.js';
import { detectActivePage } from './tools/detect.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { PageSnapshot } from './tools/types.js';

const server = new Server(
  { name: 'websight', version: '2.0.0' },
  { capabilities: { tools: {} } }
);

// Output directory
const OUTPUT_DIR = 'out';

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'websight',
      description: `Visual analysis and interaction tool for UI work. Uses persistent browser session for ~10x faster operations.

URL AUTO-DETECTION (when url not provided):
1. Checks for browser with remote debugging (Chrome/Edge CDP)
2. Scans for running dev servers (ports 5173, 3000, 8080, etc.)
3. Falls back to localhost:5173

ACTIONS:
• look - Analyze page (CSS vars, theme, layout, interactive elements)
• baseline - Save current state for comparison
• diff - Compare current state with baseline, see % pixel difference
• click - Click an element by text, testid, or selector
• type - Type text into an input field
• select - Choose option from a dropdown
• hover - Hover over an element
• scroll - Scroll the page (up/down/top/bottom)
• press - Press a keyboard key (Enter, Escape, Tab, etc.)

WORKFLOW EXAMPLE:
1. websight(action="look") - See current theme
2. websight(action="baseline") - Save before state
3. Make code changes
4. websight(action="diff") - Verify with pixel diff

INTERACTION EXAMPLE:
1. websight(action="click", target="Open Modal")
2. websight(action="type", target="email", text="test@example.com")
3. websight(action="click", target="Submit")`,
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['look', 'baseline', 'diff', 'click', 'type', 'select', 'hover', 'scroll', 'press'],
            description: 'The action to perform'
          },
          url: {
            type: 'string',
            description: 'URL to analyze. Auto-detects if not provided.'
          },
          target: {
            type: 'string',
            description: 'For interactions: element text, data-testid, or CSS selector'
          },
          text: {
            type: 'string',
            description: 'For type action: the text to type'
          },
          value: {
            type: 'string',
            description: 'For select action: the option value to select'
          },
          direction: {
            type: 'string',
            enum: ['up', 'down', 'top', 'bottom'],
            description: 'For scroll action: which direction to scroll'
          },
          key: {
            type: 'string',
            description: 'For press action: the key to press (Enter, Escape, Tab, etc.)'
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
      const urlInfo = detected ? `📍 Auto-detected: ${url} (${source})\n\n` : '';
      
      switch (action) {
        // === ANALYSIS ACTIONS ===
        case 'look': {
          const { report } = await analyze(url, OUTPUT_DIR);
          return { content: [{ type: 'text', text: urlInfo + report }] };
        }

        case 'baseline': {
          await analyze(url, OUTPUT_DIR);
          saveBaseline(OUTPUT_DIR);
          return { 
            content: [{ 
              type: 'text', 
              text: `${urlInfo}✅ Baseline saved for ${url}\n\nNow make your code changes, then call websight(action="diff") to verify.`
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
          const { snapshot: after } = await analyze(url, OUTPUT_DIR);
          
          const result = compareSnapshots(before, after, beforePath, join(OUTPUT_DIR, 'snapshot.json'));
          const report = formatCompareReport(result);
          
          return { content: [{ type: 'text', text: urlInfo + report }] };
        }

        // === INTERACTION ACTIONS ===
        case 'click': {
          const target = args?.target as string;
          if (!target) {
            return { content: [{ type: 'text', text: '❌ Missing target. Usage: websight(action="click", target="button text or selector")' }] };
          }
          const result = await click(target, url);
          return { 
            content: [{ 
              type: 'text', 
              text: result.success 
                ? `✅ ${result.message} (${result.durationMs}ms)` 
                : `❌ ${result.message}`
            }] 
          };
        }

        case 'type': {
          const target = args?.target as string;
          const text = args?.text as string;
          if (!target || !text) {
            return { content: [{ type: 'text', text: '❌ Missing target or text. Usage: websight(action="type", target="input", text="hello")' }] };
          }
          const result = await typeText(target, text, url);
          return { 
            content: [{ 
              type: 'text', 
              text: result.success 
                ? `✅ ${result.message} (${result.durationMs}ms)` 
                : `❌ ${result.message}`
            }] 
          };
        }

        case 'select': {
          const target = args?.target as string;
          const value = args?.value as string;
          if (!target || !value) {
            return { content: [{ type: 'text', text: '❌ Missing target or value. Usage: websight(action="select", target="dropdown", value="option1")' }] };
          }
          const result = await select(target, value, url);
          return { 
            content: [{ 
              type: 'text', 
              text: result.success 
                ? `✅ ${result.message} (${result.durationMs}ms)` 
                : `❌ ${result.message}`
            }] 
          };
        }

        case 'hover': {
          const target = args?.target as string;
          if (!target) {
            return { content: [{ type: 'text', text: '❌ Missing target. Usage: websight(action="hover", target="element")' }] };
          }
          const result = await hover(target, url);
          return { 
            content: [{ 
              type: 'text', 
              text: result.success 
                ? `✅ ${result.message} (${result.durationMs}ms)` 
                : `❌ ${result.message}`
            }] 
          };
        }

        case 'scroll': {
          const direction = (args?.direction as 'up' | 'down' | 'top' | 'bottom') || 'down';
          const result = await scroll(direction, url);
          return { 
            content: [{ 
              type: 'text', 
              text: result.success 
                ? `✅ ${result.message} (${result.durationMs}ms)` 
                : `❌ ${result.message}`
            }] 
          };
        }

        case 'press': {
          const key = args?.key as string;
          if (!key) {
            return { content: [{ type: 'text', text: '❌ Missing key. Usage: websight(action="press", key="Enter")' }] };
          }
          const result = await press(key, url);
          return { 
            content: [{ 
              type: 'text', 
              text: result.success 
                ? `✅ ${result.message} (${result.durationMs}ms)` 
                : `❌ ${result.message}`
            }] 
          };
        }

        default:
          return { content: [{ type: 'text', text: `❌ Unknown action: ${action}. Use: look, baseline, diff, click, type, select, hover, scroll, press` }] };
      }
    }
    
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `❌ Error: ${message}` }] };
  }
});

// Cleanup on exit
process.on('SIGINT', async () => {
  await closeSession();
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('WebSight MCP Server v2.0 running');
}

main().catch(console.error);
