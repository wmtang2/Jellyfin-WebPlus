
# Jellyfin Movie Attributes Browser Extension

Enhance your Jellyfin web experience by displaying additional, user-selectable movie attributes directly in the movie listings. This extension is designed for Firefox and compatible browsers, providing a customizable and informative interface for movie browsing.

## Features
- **Display Extra Movie Attributes:** Shows file size, filename, resolution, SDR/HDR status, audio language, and more.
- **User-Selectable Fields:** Choose which attributes to display via the extension's options page.
- **Multi-Line Layout:** Attributes are organized for clarity—filename on its own line, other details grouped, and resolution/SDR/HDR on a third line.
- **Automatic Detection:** Works with Jellyfin's default movie card layout, enhancing cards as they appear.
- **Debug Logging:** Console logs help diagnose issues with card detection and attribute injection.
- The extension is tested in Firefox but should work in Edge and Chrome as well.

## Installation
1. **Download the ZIP:**
  - The ZIP archive is in `browser-extension-investigation/dist/jellyfin-movie-attributes.zip`.
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
