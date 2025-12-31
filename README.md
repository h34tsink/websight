<div align="center">

# 👁️ WebSight

### *Give Your AI Agent Eyes*

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Protocol-blueviolet?style=for-the-badge)](https://modelcontextprotocol.io/)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**WebSight is an MCP server that enables AI agents to see, analyze, and verify visual changes on web pages with pixel-perfect accuracy.**

[Getting Started](#-quick-start) •
[Features](#-features) •
[How It Works](#-how-it-works) •
[API Reference](#-api-reference) •
[Contributing](#-contributing)

</div>

---

## 🎯 The Problem

AI coding assistants are incredibly powerful at writing and modifying code—but they're **blind**. When you ask an AI to *"make the button bigger"* or *"change the theme to dark mode"*, it edits the code and hopes for the best. There's no way for the AI to actually **see** what changed.

## 💡 The Solution

**WebSight gives AI agents vision.** It's a set of visual analysis tools exposed via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), allowing AI agents to:

- 🔍 **Analyze** — Understand page structure, CSS variables, themes, and interactive elements
- 📸 **Snapshot** — Capture visual baselines before making changes  
- 🎯 **Compare** — Verify changes with pixel-level diffing and percentage metrics

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎨 **Theme Extraction** | Automatically detects light/dark mode, color schemes, CSS custom properties |
| 🏗️ **Layout Analysis** | Identifies landmarks (header, nav, main, footer) and content sections |
| 🖱️ **Action Detection** | Finds all interactive elements with their selectors and test IDs |
| 📊 **Visual Diffing** | Pixel-by-pixel comparison with configurable threshold |
| 🖱️ **Page Interactions** | Click, type, select, hover, scroll — all from AI commands |
| ⚡ **10x Faster** | Persistent browser session eliminates cold-start overhead |
| 🤖 **MCP Integration** | Works seamlessly with Claude Desktop, Cursor, and VS Code Copilot |
| 🔍 **Auto-Detection** | Automatically finds running dev servers (Vite, Next.js, etc.) |

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/h34tsink/websight.git
cd websight

# Install dependencies
npm install

# Build the project
npm run build

# Auto-install to your AI tools
npm run install:mcp
```

> 💡 **Tip:** The installer automatically detects and configures Claude Desktop, Cursor, and VS Code!

### Target Specific Tools

```bash
npm run install:claude   # Claude Desktop only
npm run install:cursor   # Cursor only
npm run install:vscode   # VS Code Copilot only
npm run install:all      # All detected tools
```

---

## 🔄 How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI AGENT WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. LOOK          2. BASELINE         3. DIFF                  │
│   ┌─────────────┐  ┌─────────────┐     ┌─────────────┐          │
│   │ Analyze the │  │ Save visual │     │ Compare and │          │
│   │ current page│──│ snapshot    │────►│ verify      │          │
│   │ structure   │  │ before edit │     │ the changes │          │
│   └─────────────┘  └─────────────┘     └─────────────┘          │
│                                                                 │
│   "I see CSS vars,   "Baseline          "2.3% pixel             │
│    theme is dark,     saved!"            difference,            │
│    3 buttons..."                         change OK!"            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Example Conversation

> **You:** "Use WebSight to change the primary color to red"

> **AI:** *Looking at page... I see `--primary: #3b82f6` in the CSS variables. Let me save a baseline first.*
> 
> *[Makes code changes]*
> 
> *Comparing with baseline... Visual difference: 12.4%. The primary color has been updated across 3 buttons and the header accent.*

---

## 📖 Usage

### With AI Agents (Recommended)

Just tell your AI assistant:

```
"use websight to analyze this page"
"use websight to change the theme to dark mode"  
"use websight to verify my CSS changes worked"
```

The AI will automatically use the appropriate tools in sequence.

### CLI Commands

```bash
npm run dev         # Start test page at localhost:5173
npm run look        # Analyze the current page
npm run baseline    # Save snapshot before changes
npm run diff        # Compare current state with baseline
```

---

## 📚 API Reference

### MCP Tool Actions

| Action | Parameters | Description |
|--------|------------|-------------|
| `look` | `url?` | Analyze page structure, CSS variables, theme, and interactive elements |
| `baseline` | `url?` | Capture and save visual snapshot for later comparison |
| `diff` | `url?` | Compare current state against saved baseline, returns % difference |
| `click` | `target`, `url?` | Click an element by text, test ID, or selector |
| `type` | `target`, `text`, `url?` | Type text into an input field |
| `select` | `target`, `value`, `url?` | Choose an option from a dropdown |
| `hover` | `target`, `url?` | Hover over an element |
| `scroll` | `direction`, `url?` | Scroll the page (up/down/top/bottom) |
| `press` | `key`, `url?` | Press a keyboard key (Enter, Escape, Tab, etc.) |

### Example Usage

```
websight(action="look")
websight(action="click", target="Submit")
websight(action="type", target="email", text="test@example.com")
websight(action="select", target="country", value="USA")
```

### Programmatic API

```typescript
import { analyze, saveBaseline, closeSession, click, type } from 'websight/session';

// Analyze any page
const { snapshot, report } = await analyze('http://localhost:3000');

// Interact
await click('Open Modal');
await type('email', 'test@example.com');
await click('Submit');

console.log(analysis.snapshot.theme);        // { mode: 'dark', scheme: 'monochrome' }
console.log(analysis.snapshot.cssVars);      // { '--primary': '#3b82f6', ... }
console.log(analysis.snapshot.actions);      // [{ type: 'button', text: 'Submit', ... }]

// Save baseline before changes
await saveBaseline('http://localhost:3000', './out');

// Clean up
await closeBrowser();
```

---

## 🗂️ Project Structure

```
websight/
├── 📁 src/
│   ├── mcp-server.ts           # MCP server entry point
│   └── 📁 tools/
│       ├── api.ts              # Programmatic API
│       ├── types.ts            # TypeScript definitions
│       ├── detect.ts           # Dev server auto-detection
│       ├── compare.ts          # Pixel diffing logic
│       ├── report.ts           # Report generation
│       └── 📁 extractors/      # Page analysis modules
│           ├── theme.ts        # Theme & CSS variable extraction
│           ├── landmarks.ts    # Layout landmark detection
│           ├── sections.ts     # Content section analysis
│           ├── actions.ts      # Interactive element finder
│           └── overlays.ts     # Modal/overlay detection
├── 📁 scripts/
│   └── install.js              # Automated MCP installer
├── 📁 test-page/
│   └── index.html              # Development test page
├── 📁 dist/                    # Compiled output
└── 📁 out/                     # Generated analysis & snapshots
```

---

## ⚙️ Configuration

### Automatic Setup (Recommended)

```bash
npm run install:mcp
```

This automatically detects and configures your AI tools.

### Manual Configuration

<details>
<summary><b>Claude Desktop</b></summary>

Edit `%APPDATA%/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "websight": {
      "command": "node",
      "args": ["C:/path/to/websight/dist/src/mcp-server.js"]
    }
  }
}
```
</details>

<details>
<summary><b>VS Code Copilot</b></summary>

Edit `.vscode/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "websight": {
      "command": "node", 
      "args": ["C:/path/to/websight/dist/src/mcp-server.js"]
    }
  }
}
```
</details>

<details>
<summary><b>Cursor</b></summary>

Edit `%APPDATA%/Cursor/User/globalStorage/cursor.mcp/mcp.json`:

```json
{
  "mcpServers": {
    "websight": {
      "command": "node",
      "args": ["C:/path/to/websight/dist/src/mcp-server.js"]
    }
  }
}
```
</details>

---

## 🛠️ Development

```bash
npm run dev         # Start test page with hot reload
npm run mcp         # Run MCP server in dev mode
npm run build       # Build for production
npm run clean       # Remove generated files
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

- 🐛 Report bugs
- 💡 Suggest features  
- 🔧 Submit pull requests

---

## 👤 Author

<table>
<tr>
<td align="center">
<b>Sean Treppa</b><br/>
<sub>Creator & Maintainer</sub>
</td>
</tr>
</table>

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for the AI-assisted development community**

*Because AI agents shouldn't have to code blind.*

</div>
