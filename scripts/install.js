#!/usr/bin/env node
/**
 * WebSight Installer
 * Automatically builds and configures WebSight as an MCP server
 * 
 * Usage: node scripts/install.js [--target claude|cursor|vscode|custom]
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { homedir, platform } from 'os';

const WEBSIGHT_DIR = resolve(import.meta.dirname, '..');
const MCP_SERVER_PATH = join(WEBSIGHT_DIR, 'dist', 'src', 'mcp-server.js');

// Config file locations by platform and target
const CONFIG_PATHS = {
  claude: {
    win32: join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
    darwin: join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    linux: join(homedir(), '.config', 'claude', 'claude_desktop_config.json')
  },
  cursor: {
    win32: join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'mcp.json'),
    darwin: join(homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'mcp.json'),
    linux: join(homedir(), '.config', 'Cursor', 'User', 'globalStorage', 'mcp.json')
  },
  vscode: {
    win32: join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'github.copilot', 'mcp.json'),
    darwin: join(homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'github.copilot', 'mcp.json'),
    linux: join(homedir(), '.config', 'Code', 'User', 'globalStorage', 'github.copilot', 'mcp.json')
  }
};

function log(msg) { console.log(`\x1b[36m[websight]\x1b[0m ${msg}`); }
function success(msg) { console.log(`\x1b[32m✓\x1b[0m ${msg}`); }
function error(msg) { console.error(`\x1b[31m✗\x1b[0m ${msg}`); }
function warn(msg) { console.log(`\x1b[33m!\x1b[0m ${msg}`); }

function build() {
  log('Building MCP server...');
  try {
    execSync('npm run build:mcp', { cwd: WEBSIGHT_DIR, stdio: 'inherit' });
    success('Build complete');
    return true;
  } catch (e) {
    error('Build failed');
    return false;
  }
}

function getConfigPath(target) {
  const os = platform();
  const paths = CONFIG_PATHS[target];
  if (!paths) return null;
  return paths[os] || paths.linux;
}

function readConfig(configPath) {
  if (!existsSync(configPath)) {
    return { mcpServers: {} };
  }
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return { mcpServers: {} };
  }
}

function writeConfig(configPath, config) {
  const dir = join(configPath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function addWebsight(configPath) {
  log(`Configuring ${configPath}...`);
  
  const config = readConfig(configPath);
  
  if (!config.mcpServers) {
    config.mcpServers = {};
  }
  
  // Add or update websight
  config.mcpServers.websight = {
    command: 'node',
    args: [MCP_SERVER_PATH]
  };
  
  writeConfig(configPath, config);
  success(`Added websight to ${configPath}`);
}

function printManualConfig() {
  console.log('\n\x1b[33mManual Configuration:\x1b[0m');
  console.log('Add this to your MCP config file:\n');
  console.log(`{
  "mcpServers": {
    "websight": {
      "command": "node",
      "args": ["${MCP_SERVER_PATH.replace(/\\/g, '\\\\')}"]
    }
  }
}`);
}

function detectTargets() {
  const os = platform();
  const found = [];
  
  for (const [target, paths] of Object.entries(CONFIG_PATHS)) {
    const configPath = paths[os] || paths.linux;
    const appDir = join(configPath, '..', '..');
    if (existsSync(appDir) || existsSync(configPath)) {
      found.push(target);
    }
  }
  
  return found;
}

async function main() {
  console.log('\n\x1b[1m🔍 WebSight MCP Server Installer\x1b[0m\n');
  
  // Parse args
  const args = process.argv.slice(2);
  const targetArg = args.find(a => a.startsWith('--target='))?.split('=')[1];
  const customPath = args.find(a => a.startsWith('--config='))?.split('=')[1];
  const skipBuild = args.includes('--skip-build');
  const showHelp = args.includes('--help') || args.includes('-h');
  
  if (showHelp) {
    console.log(`Usage: node install.js [options]

Options:
  --target=TARGET    Target app: claude, cursor, vscode, all
  --config=PATH      Custom config file path
  --skip-build       Skip building (use existing dist)
  --help, -h         Show this help

Examples:
  node install.js                    # Auto-detect and install
  node install.js --target=claude    # Install for Claude Desktop
  node install.js --target=all       # Install for all detected apps
  node install.js --config=./my.json # Use custom config path
`);
    return;
  }
  
  // Build
  if (!skipBuild) {
    if (!build()) {
      process.exit(1);
    }
  } else if (!existsSync(MCP_SERVER_PATH)) {
    error('dist/mcp-server.js not found. Run without --skip-build first.');
    process.exit(1);
  }
  
  console.log('');
  
  // Custom path
  if (customPath) {
    addWebsight(resolve(customPath));
    success('\nInstallation complete!');
    return;
  }
  
  // Detect or use target
  const os = platform();
  let targets = [];
  
  if (targetArg === 'all') {
    targets = detectTargets();
    if (targets.length === 0) {
      warn('No supported apps detected');
      printManualConfig();
      return;
    }
  } else if (targetArg) {
    if (!CONFIG_PATHS[targetArg]) {
      error(`Unknown target: ${targetArg}. Use: claude, cursor, vscode, or all`);
      process.exit(1);
    }
    targets = [targetArg];
  } else {
    // Auto-detect
    targets = detectTargets();
    if (targets.length === 0) {
      log('No supported apps detected.');
      printManualConfig();
      return;
    }
    log(`Detected: ${targets.join(', ')}`);
  }
  
  // Install for each target
  for (const target of targets) {
    const configPath = getConfigPath(target);
    if (configPath) {
      try {
        addWebsight(configPath);
      } catch (e) {
        error(`Failed to configure ${target}: ${e.message}`);
      }
    }
  }
  
  console.log('\n\x1b[32m✓ Installation complete!\x1b[0m');
  console.log('\nRestart your app to use WebSight.');
  console.log('Try: "use websight to analyze this page"\n');
}

main().catch(console.error);
