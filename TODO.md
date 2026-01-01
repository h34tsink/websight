# WebSight TODO

## Interaction System Status

### Test Results: 57/57 passing ✅ (100%)

Last run: 2024-12-31
- Average interaction time: ~32ms
- Total test time: ~1.8s for 57 interactions

### Fixed ✅

- [x] **Double-wrapped selectors bug** - `findSelector()` was wrapping `[data-testid="..."]` again
- [x] **testId fallback** - Now tries `[data-testid="${target}"]` for simple alphanumeric targets
- [x] **Select values** - Tests now use actual `value` attributes not display text
- [x] **Modal close** - Tests click close button instead of Escape key
- [x] **CDP smart targeting** - `tryConnectCDP(targetUrl)` finds correct tab or navigates

### Available Actions

| Action | Description | Example |
|--------|-------------|---------|
| `click` | Click element | `click('btn-save')` |
| `type` | Type into input | `type('field-name', 'John')` |
| `select` | Select dropdown option | `select('field-country', 'ca')` |
| `hover` | Hover over element | `hover('hover-card')` |
| `press` | Press keyboard key | `press('Enter')` |
| `scroll` | Scroll page | `scroll('down')` |
| `waitFor` | Wait for element | `waitFor('modal-backdrop')` |
| `getValue` | Get input/text value | `getValue('field-name')` |
| `isVisible` | Check visibility | `isVisible('btn-save')` |
| `getAttribute` | Get element attribute | `getAttribute('btn', 'type')` |
| `screenshot` | Capture screenshot | `screenshot('out.png')` |

### Known Limitations

- Screenshot times out on CDP connections (Playwright limitation)
- Action extraction capped at 60 elements
- Overlays block interactions (expected behavior)
- Select requires exact option value match

## Feature Backlog

### High Priority - DONE ✅

- [x] `waitFor` action - wait for element to appear/disappear
- [x] `getValue` action - read current value from input/select
- [x] `isVisible` action - check if element is visible/enabled
- [x] `screenshot` action - capture current state without full analysis
- [x] `getAttribute` action - read element attributes

### Medium Priority

- [ ] Batch multiple interactions without re-analyzing
- [ ] Element count/exists check
- [ ] Form fill helper (fill multiple fields at once)

### Low Priority

- [ ] Drag-and-drop support
- [ ] File upload interactions
- [ ] Interaction history/replay

## CSS Framework Detection

- [x] Tailwind CSS detection (classes, responsive, dark mode)
- [x] Bootstrap detection
- [x] Material UI detection
- [x] Custom class extraction
- [x] Inline style warnings

## Test Page Improvements

- [ ] Add more edge cases (disabled inputs, hidden elements)
- [ ] Add drag-and-drop test elements
- [ ] Add file upload test area
