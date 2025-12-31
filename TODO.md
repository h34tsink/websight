# WebSight TODO

## Interaction System Status

### Test Results: 54/57 passing ✅ (95%)

Last run: 2024-12-31
- Average interaction time: ~30ms
- Total test time: ~17s for 57 interactions

### Fixed ✅

- [x] **Double-wrapped selectors bug** - `findSelector()` was wrapping `[data-testid="..."]` again
  - Fixed in `src/tools/session.ts` - now uses `locator.value` directly
- [x] **testId fallback** - Now tries `[data-testid="${target}"]` for simple alphanumeric targets before text fallback

### Remaining Test Failures (test script issues, not bugs)

1. **`select topic`** - Test used "Feature Request" but options are: Bug, Feature, Question
2. **`select timezone`** - Test used wrong option text format
3. **`btn-toast`** - Modal backdrop blocking (test ordering - modal wasn't closed first)

### Known Limitations

- Action extraction capped at 60 elements (may miss some)
- Overlays block interactions (expected Playwright behavior)
- Select requires exact option text match

## Feature Backlog

### High Priority

- [ ] `waitFor` action - wait for element to appear/disappear
- [ ] `getValue` action - read current value from input/select
- [ ] `isVisible` action - check if element is visible/enabled

### Medium Priority

- [ ] `screenshot` action - capture current state without full analysis
- [ ] `getAttribute` action - read element attributes
- [ ] Batch multiple interactions without re-analyzing

### Low Priority

- [ ] Drag-and-drop support
- [ ] File upload interactions
- [ ] Interaction history/replay

## Test Page Improvements

- [ ] Add more edge cases (disabled inputs, hidden elements)
- [ ] Add drag-and-drop test elements
- [ ] Add file upload test area
