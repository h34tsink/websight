# WebSight - Visual Analysis & Interaction Tools

This workspace contains WebSight, a visual analysis and page interaction tool for AI-assisted UI work.

## Quick Reference

| Action | Purpose | When to Use |
|--------|---------|-------------|
| `look` | Analyze page structure, theme, CSS vars, interactive elements | First step - understand the page |
| `baseline` | Save current visual state | Before making any code changes |
| `diff` | Compare current vs baseline, get % pixel difference | After code changes to verify |
| `click` | Click buttons, links, toggles | Testing interactions |
| `type` | Enter text into inputs/textareas | Form testing |
| `select` | Choose dropdown options | Form testing |
| `hover` | Hover over elements | Test hover states |
| `scroll` | Scroll page (up/down/top/bottom) | Navigate page |
| `press` | Press keyboard keys (Enter, Escape, Tab) | Keyboard navigation |

## WORKFLOW: Visual Changes

When user says "use websight" for ANY visual change:

```
1. look    → Understand current state (CSS vars, sections, theme)
2. baseline → Save before state
3. [edit]  → Make code changes
4. diff    → Verify changes (check % difference)
5. [iterate if needed]
```

## WORKFLOW: Interaction Testing

When user wants to test page interactions:

```
1. look    → Get list of interactive elements with testIds
2. click/type/select/hover → Interact using testId or element text
3. look    → Verify state changed
```

## Targeting Elements

WebSight finds elements in this priority order:
1. **data-testid** - `click("btn-save")` finds `[data-testid="btn-save"]`
2. **Accessible name** - `click("Submit")` finds button with text "Submit"
3. **CSS selector** - `click("#my-button")` or `click(".submit-btn")`

**Pro tip**: Use short testIds without prefixes. `field-name` not `[data-testid="field-name"]`

## Available MCP Tools

### `websight_look` / `websight(action="look")`
Returns: CSS variables, theme colors, sections, landmarks, interactive elements with testIds

### `websight_baseline` / `websight(action="baseline")`
Saves: Screenshot + snapshot.json for comparison

### `websight_diff` / `websight(action="diff")`
Returns: Pixel difference %, CSS variable changes, visual change summary

### Interaction Actions (via session.ts)
- `click(target, url?)` - Click element
- `type(target, text, url?)` - Type into input
- `select(target, value, url?)` - Select dropdown option
- `hover(target, url?)` - Hover over element
- `scroll(direction, url?)` - Scroll page
- `press(key, url?)` - Press keyboard key

## Example Prompts → Actions

| User Says | What To Do |
|-----------|------------|
| "use websight to add a panel" | look → baseline → add panel code → diff |
| "use websight to change colors" | look → baseline → edit CSS vars → diff |
| "use websight to fix the layout" | look → baseline → fix code → diff |
| "test the form interactions" | look → type fields → click submit → look |
| "click all the buttons" | look → click each button testId |

## Fallback: Terminal Commands

If MCP tools aren't available:
```bash
npm run look      # Analyze current page
npm run baseline  # Save baseline
npm run diff      # Compare after changes
```

## Known Limitations (see TODO.md)

- Checkbox testIds may be missing on some elements
- Action extraction limited to 60 elements
- Hover requires valid testId (text fallback may fail)

