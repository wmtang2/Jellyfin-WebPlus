
# Jellyfin Movie Attributes Browser Extension

Enhance your Jellyfin web experience by displaying additional, user-selectable movie attributes directly in the movie listings. This extension is designed for Firefox and compatible browsers, providing a customizable and informative interface for movie browsing.

## Features
- **Display Extra Movie Attributes:** Shows file size, filename, resolution, SDR/HDR status, audio language, and more.
- **User-Selectable Fields:** Choose which attributes to display via the extension's options page.
- **Multi-Line Layout:** Attributes are organized for clarity—filename on its own line, other details grouped, and resolution/SDR/HDR on a third line.
- **Automatic Detection:** Works with Jellyfin's default movie card layout, enhancing cards as they appear.
- **Debug Logging:** Console logs help diagnose issues with card detection and attribute injection.

## Installation
1. **Download the ZIP:**
  - Build the extension using `npm run build` (requires Node.js and npm).
  - The ZIP archive will be created in `browser-extension-investigation/dist/jellyfin-movie-attributes.zip`.
2. **Load in Firefox:**
  - Go to `about:debugging` > "This Firefox" > "Load Temporary Add-on".
  - Select the `manifest.json` file from the extracted extension folder.
3. **Permanent Installation:**
  - Submit the ZIP to [Mozilla Add-ons](https://addons.mozilla.org/) for signing and distribution.

## Usage
- Open Jellyfin in your browser.
- Movie cards will display extra attributes according to your settings.
- To customize which attributes are shown, open the extension's options page and select your preferences.

## Development
### Prerequisites
- Node.js (v16+ recommended)
- npm

### Build Steps
1. Install dependencies:
  ```powershell
  npm install
  ```
2. Build the extension ZIP:
  ```powershell
  npm run build
  ```
3. The ZIP will be output to `browser-extension-investigation/dist/`.

### File Structure
- `src/` — Extension source code (card enhancer, API client, orchestrator, etc.)
- `scripts/build-zip.js` — Node.js build script for packaging
- `manifest.json` — Extension manifest
- `options.html`, `options.js` — Options page for user settings
- `styles.css` — Extension styles
- `LICENSE` — Project license

## Troubleshooting
- **Attributes not showing?**
  - Check the browser console for debug logs.
  - Ensure you are logged into Jellyfin and have a valid AccessToken.
- **ZIP validation errors?**
  - The build script uses forward slashes for all archive entry names to comply with Mozilla requirements.

## Contributing
Pull requests and suggestions are welcome! See the LICENSE file for details.

## License
This project is licensed under the MIT License.

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
