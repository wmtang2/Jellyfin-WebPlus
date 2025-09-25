# Implementation Methodology

## 1. Development Principles
- Test-Driven Development (TDD): Red-Green-Refactor applied to every function and feature.
- Small Increments: Each commit introduces one passing unit of behavior.
- Separation of Concerns: DOM manipulation, data acquisition, formatting, and configuration are isolated into distinct modules.
- Deterministic Tests: No reliance on network or real Jellyfin instances for unit tests—use fixtures/mocks.
- Idempotence: Enhancement operations (e.g., DOM injection) must be safe to run multiple times.

## 2. Module Layering
| Layer | Responsibility | Example Modules |
|-------|----------------|-----------------|
| Utility | Pure formatting & helpers | `formatFileSize`, path parsing |
| Data Access | Fetch/caching API calls | (Later) `apiClientAdapter` |
| Enhancement Core | Build attribute lists, map raw item -> display tokens | `buildAttributesList` |
| DOM Adapter | Find cards, inject attribute nodes safely | `addAttributesToCard`, `findMovieCards` |
| Orchestration | Observe mutations, batch enhance, settings mediation | `JellyfinCardEnhancer` (future) |

## 3. Testing Strategy
- Unit Tests: Pure functions (formatting, list building) + DOM injection using JSDOM.
- Behavioral Tests: Ensure enhancement skips already enhanced cards, handles missing fields, preserves existing text nodes.
- Integration-Like Tests (Later): Simulate multiple cards + mutation events.
- No network calls in tests—API layer will be mocked.

## 4. Naming & Conventions
- Functions: verb-noun (`findMovieCards`, `buildAttributesList`).
- Test names: "should <expected behavior> when <context>".
- Boolean flags: `showFileSize`, `showFileName`.
- CSS class for injected container: `.movie-attributes` (single point of detection).

## 5. Edge Cases to Cover
- Missing `MediaSources` or `Path`.
- Zero byte size.
- Large sizes (TB range) rounding.
- Filename extraction with Windows + POSIX separators.
- Re-invocation of `addAttributesToCard` (should not duplicate).
- Cards without `.cardText` container.

## 6. Definition of Done (for current enhancement phase)
- All attribute builder & DOM injection tests pass.
- 95%+ coverage for enhancement core & DOM adapter.
- No duplication on multiple passes.
- Graceful degradation (no throws) on malformed input.

## 7. Upcoming Iterative Steps
1. Attribute building/injection (in progress).
2. API abstraction with caching & fallback.
3. Mutation observer orchestration logic.
4. Settings integration & storage abstraction.
5. Background script messaging.
6. Packaging & E2E smoke tests (optional Playwright later).

## 8. Refactoring Policy
- Refactor only with green tests.
- Prefer pure functions over stateful methods.
- Extract complexity >15 LOC or >2 responsibilities.

## 9. Performance Considerations

### Data Acquisition Layer (Added)
The newly implemented `fetchItemDetails(itemId, options)` function provides a thin, test-covered abstraction over Jellyfin's `/Items/{id}` endpoint with:
- In-memory promise/result cache keyed by `itemId` + sorted `fields` parameter.
- `forceRefresh` flag to bypass cache.
- Dependency-injected `fetchImpl` for testability (Jest mocks) with graceful failure cleanup (failed entries removed from cache).
- Normalization ensuring `MediaSources` is always an array to simplify downstream attribute derivation.

Contract summary:
- Inputs: `itemId: string`, `options: { baseUrl: string; token?: string; fields?: string[]; forceRefresh?: boolean; fetchImpl?: Function }`.
- Output: Promise resolving to raw item JSON with normalized `MediaSources`.
- Errors: Throws on missing required params, non-OK HTTP status, or JSON parse failure.

Next integration step will layer an orchestrator that:
1. Detects unprocessed movie cards.
2. Extracts `data-id`.
3. Calls `fetchItemDetails` (with desired fields set like `['Path','MediaSources']`).
4. Builds attributes via `buildAttributesList` and injects them.
5. Records processed IDs to avoid duplicate work.

Planned enhancements:
- LRU cap for cache size & stale eviction.
- Batch prefetch for visible viewport cards.
- Retry with exponential backoff for transient failures.

### Observer Layer (Added)
Purpose: Continuously react to DOM changes adding new movie cards.

Implementation (`startEnhancerLoop`):
- Immediately runs one enhancement pass.
- Registers a `MutationObserver` on `document.body` (childList + subtree).
- Debounces subsequent enhancement calls (default 100ms) to collapse bursts.
- Provides a testing/diagnostic hook: `triggerEnhance()` to force scheduling without relying on actual mutations (improves determinism under Jest fake timers).
- Offers `disconnect()` to stop observation, clear pending debounce, and detach fallback listeners.

Fallback Strategy:
- Added legacy `DOMNodeInserted` listener as a resilience mechanism (may be removed later if not needed in production, kept while test environment timing refined).

Future Improvements:
- Replace legacy event with explicit instrumentation hooks once stability confirmed.
- Adaptive debounce: lengthen interval under sustained rapid mutations.
- Visibility filtering: only enhance cards entering viewport (IntersectionObserver) before scheduling fetches.

### Settings Layer (Added)
In-memory store (`settings.js`) providing:
- `getSettings()`: returns current flags.
- `updateSettings(patch)`: shallow merges and notifies listeners on change.
- `onChange(cb)`: registers callback; returns unsubscribe.
Defaults (all enabled): file size, filename, container, resolution.
Rationale: Keep initial implementation storage-agnostic; later adapt to WebExtension storage API with the same interface.

### Re-Enhancement Strategy (Added)
Module: `reEnhancer.js` exposing `reEnhanceCards({ baseUrl, token })`:
- Targets only previously enhanced cards (`data-enhanced="1"`).
- Forces fresh fetch (`forceRefresh: true`) to reflect any backend changes.
- Rebuilds attribute list using current settings.
- Replaces existing `.movie-attributes` node to avoid duplicate stacking.

Potential Extensions:
- Diff-based update (only modify changed segments to reduce layout thrash).
- Batch & throttle large-scale re-enhancements after bulk setting toggles.
- Add visual transition (fade/slide) for updated attributes.
 
### Orchestrator Layer (Added)
Purpose: Coordinate DOM discovery, metadata fetching, attribute derivation, and injection.

Function: `enhanceMovieCards({ baseUrl, token, options, fields })`
Behavior:
- Selects `.card[data-type="Movie"]` elements.
- Skips cards marked with `data-enhanced="1"` or `data-enhanced-error="1"`.
- Skips cards lacking `data-id`.
- Fetches item details (default fields: `Path,MediaSources`).
- Builds attributes via existing `buildAttributesList` and injects them with `addAttributesToCard`.
- Marks success with `data-enhanced="1"`; on fetch failure marks `data-enhanced-error="1"`.
- Returns number of cards where attributes were actually injected (not merely processed), matching test expectations.

Error Handling Semantics:
- Network/parse errors do not throw upward; they annotate card with `data-enhanced-error` to avoid repeated failing attempts in future passes.
- Future enhancement: add retry counter attribute (e.g., `data-enhanced-retries`).

Testing Strategies Implemented:
- Module isolation using `jest.resetModules()` so spies attach before dynamic `require` inside orchestrator.
- Validation of skip logic (already enhanced, missing id, error path).

Upcoming Enhancements:
- Introduce viewport-based lazy enhancement (IntersectionObserver fallback).
- Concurrency control (cap simultaneous fetches).
- Telemetry hook (optional debug log toggle) for diagnosing skipped/error states.

- Add snapshot-like structural assertions only where stable.

---
This methodology governs the implementation moving forward and will be updated if architectural changes arise.
