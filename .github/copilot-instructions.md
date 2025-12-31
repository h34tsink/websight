# WebSight - Visual Analysis Tools

This workspace contains WebSight, a visual analysis tool for UI work.

## IMPORTANT: When user says "use websight" for ANY visual change

Follow this EXACT workflow:

1. **websight(action="look")** - Analyze page first to understand structure
2. **websight(action="baseline")** - Save the before state
3. **Make code changes** - Edit the HTML/CSS based on analysis
4. **websight(action="diff")** - Verify changes worked, check % visual difference
5. **Iterate if needed** - If diff shows issues, fix and diff again

## Example Prompts → Actions

| User Says | What To Do |
|-----------|------------|
| "use websight to add a panel" | look → baseline → add panel code → diff |
| "use websight to change colors" | look → baseline → edit CSS vars → diff |
| "use websight to fix the layout" | look → baseline → fix code → diff |

## Available MCP Tool

### `websight`
Single tool with action parameter:
- `action="look"` - Analyze page, returns CSS vars, theme, sections, actions
- `action="baseline"` - Save current state before changes
- `action="diff"` - Compare with baseline after changes

Optional: `url` parameter (default: http://localhost:5173/)

## Fallback: npm commands

If MCP isn't working, use terminal commands:
- `npm run look` - Analyze current page
- `npm run baseline` - Save baseline
- `npm run diff` - Compare after changes
