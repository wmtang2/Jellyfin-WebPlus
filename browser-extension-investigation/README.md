# Jellyfin Movie Attributes Extension

Displays additional movie attributes (file size, filename, container, resolution) directly on Jellyfin movie cards in the web interface.

## Features
- Auto-detects movie cards and augments them dynamically
- Watches DOM for newly added cards
- Re-enhances cards when settings change (in-memory settings for now)
- Modular architecture (attribute builder, API layer, orchestrator, observer)

## Structure
```
contentScript.js        # Entry point injected by the browser
manifest.json           # WebExtension manifest (v2)
styles.css              # Attribute line styling
src/
  apiClient.js          # Fetch + cache item details
  cardEnhancer.js       # Attribute extraction & DOM injection
  orchestrator.js       # Coordinates per-card enhancement
  observer.js           # MutationObserver + debounce loop
  settings.js           # In-memory settings store
  reEnhancer.js         # Re-apply attributes when settings change
scripts/
  build-zip.js          # Packaging script
tests/                  # Jest unit tests
```

## Development
Run tests:
```powershell
npm test
```

## Packaging
Creates a distributable ZIP under `dist/`:
```powershell
npm run build
```

Result: `dist/jellyfin-movie-attributes.zip`

## Temporary Settings
Currently settings are in-memory only; future work will persist to extension storage and expose an options UI.

## Installation (Firefox Temporary Add-on)
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file inside the project (e.g., `manifest.json`)
4. Navigate to your Jellyfin web UI; attributes should appear on movie cards.

## Roadmap
- Persist settings via `browser.storage.local`
- Options UI for attribute toggles
- Concurrency limiting & LRU cache
- Enhanced styling / theming alignment
- Authentication token discovery (localStorage scraping or network intercept)

## License
Same license as parent repository (add LICENSE file if distributing independently).
