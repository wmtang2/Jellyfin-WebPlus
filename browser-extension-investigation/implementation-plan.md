# Firefox Extension Implementation Plan

## Development Environment Setup

### Prerequisites
- Firefox Developer Edition or Firefox with developer mode enabled
- Code editor (VS Code recommended)
- Node.js (optional, for build tools)
- Git for version control

### Directory Structure Setup

```bash
mkdir jellyfin-movie-attributes-extension
cd jellyfin-movie-attributes-extension

# Create directory structure
mkdir -p assets popup options utils
touch manifest.json background.js content.js content.css
touch popup/popup.html popup/popup.js popup/popup.css
touch options/options.html options/options.js options/options.css
touch utils/storage.js utils/common.js
```

## Step-by-Step Implementation

### Phase 1: Basic Extension Framework (Days 1-2)

#### Step 1.1: Create Manifest
Create `manifest.json` with basic permissions and structure:

```json
{
  "manifest_version": 2,
  "name": "Jellyfin Movie Attributes",
  "version": "1.0.0",
  "description": "Display additional movie attributes in Jellyfin web interface",
  
  "permissions": [
    "storage",
    "activeTab",
    "*://*/web/*"
  ],
  
  "content_scripts": [
    {
      "matches": ["*://*/web/*"],
      "js": ["utils/common.js", "content.js"],
      "css": ["content.css"],
      "run_at": "document_end"
    }
  ],
  
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  }
}
```

#### Step 1.2: Basic Content Script
Create `content.js` with Jellyfin detection:

```javascript
// Basic Jellyfin site detection
function isJellyfinSite() {
  return (
    document.querySelector('meta[name="application-name"][content*="Jellyfin"]') ||
    window.location.pathname.includes('/web/') ||
    document.querySelector('.mainDrawer')
  );
}

if (isJellyfinSite()) {
  console.log('Jellyfin site detected - extension ready');
  
  // Basic card detection test
  const movieCards = document.querySelectorAll('.card[data-type="Movie"]');
  console.log(`Found ${movieCards.length} movie cards`);
}
```

#### Step 1.3: Basic Styling
Create `content.css` for enhanced attributes:

```css
.movie-attributes {
  font-size: 0.85em !important;
  opacity: 0.8;
  margin-top: 2px;
  line-height: 1.2;
}

.movie-attribute {
  white-space: nowrap;
}
```

#### Step 1.4: Test Basic Framework
1. Open Firefox
2. Go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file
6. Navigate to a Jellyfin site to test detection

### Phase 2: Storage and Settings System (Days 3-4)

#### Step 2.1: Storage Utilities
Create `utils/storage.js`:

```javascript
class ExtensionStorage {
  static defaultSettings = {
    enabled: true,
    showFileSize: true,
    showFileName: true,
    showContainer: false,
    showResolution: false
  };
  
  static async getSettings() {
    try {
      const result = await browser.storage.sync.get('settings');
      return { ...this.defaultSettings, ...result.settings };
    } catch (error) {
      const result = await browser.storage.local.get('settings');
      return { ...this.defaultSettings, ...result.settings };
    }
  }
  
  static async saveSettings(settings) {
    const settingsToSave = { ...this.defaultSettings, ...settings };
    try {
      await browser.storage.sync.set({ settings: settingsToSave });
    } catch (error) {
      await browser.storage.local.set({ settings: settingsToSave });
    }
  }
}

window.ExtensionStorage = ExtensionStorage;
```

#### Step 2.2: Options Page
Create `options/options.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Jellyfin Movie Attributes - Settings</title>
    <link rel="stylesheet" href="options.css">
</head>
<body>
    <div class="container">
        <h1>Jellyfin Movie Attributes</h1>
        
        <div class="setting-item">
            <label>
                <input type="checkbox" id="enabled"> Enable Extension
            </label>
        </div>
        
        <div class="setting-item">
            <label>
                <input type="checkbox" id="showFileSize"> Show File Size
            </label>
        </div>
        
        <div class="setting-item">
            <label>
                <input type="checkbox" id="showFileName"> Show Filename
            </label>
        </div>
        
        <button id="save">Save Settings</button>
        <div id="status"></div>
    </div>
    
    <script src="../utils/storage.js"></script>
    <script src="options.js"></script>
</body>
</html>
```

Create `options/options.js`:

```javascript
class OptionsPage {
  async initialize() {
    await this.loadSettings();
    this.bindEvents();
  }
  
  async loadSettings() {
    const settings = await ExtensionStorage.getSettings();
    
    document.getElementById('enabled').checked = settings.enabled;
    document.getElementById('showFileSize').checked = settings.showFileSize;
    document.getElementById('showFileName').checked = settings.showFileName;
  }
  
  bindEvents() {
    document.getElementById('save').addEventListener('click', async () => {
      const settings = {
        enabled: document.getElementById('enabled').checked,
        showFileSize: document.getElementById('showFileSize').checked,
        showFileName: document.getElementById('showFileName').checked
      };
      
      await ExtensionStorage.saveSettings(settings);
      
      document.getElementById('status').textContent = 'Settings saved!';
      setTimeout(() => {
        document.getElementById('status').textContent = '';
      }, 2000);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage().initialize();
});
```

#### Step 2.3: Update Manifest for Options
Add to `manifest.json`:

```json
{
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  }
}
```

### Phase 3: API Access Implementation (Days 5-7)

#### Step 3.1: Create API Access Module
Create `utils/api-access.js`:

```javascript
class JellyfinApiAccess {
  constructor() {
    this.apiClient = null;
    this.isAuthenticated = false;
  }
  
  async initialize() {
    await this.waitForApiClient();
    this.isAuthenticated = !!this.apiClient;
    return this.isAuthenticated;
  }
  
  async waitForApiClient(timeout = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkApiClient = () => {
        if (window.ApiClient) {
          this.apiClient = window.ApiClient;
          resolve(true);
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          resolve(false);
          return;
        }
        
        setTimeout(checkApiClient, 100);
      };
      
      checkApiClient();
    });
  }
  
  async fetchMovieData(itemId) {
    if (!this.isAuthenticated) {
      throw new Error('API not authenticated');
    }
    
    const userId = this.apiClient.getCurrentUserId();
    return await this.apiClient.getItem(userId, itemId);
  }
}
```

#### Step 3.2: Background Script for Cross-Origin Requests
Create `background.js`:

```javascript
class BackgroundService {
  constructor() {
    this.cache = new Map();
  }
  
  initialize() {
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
  }
  
  async handleMessage(request, sender, sendResponse) {
    if (request.action === 'fetchMovieData') {
      try {
        const data = await this.fetchMovieData(request.itemId, request.authInfo);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  }
  
  async fetchMovieData(itemId, authInfo) {
    const url = `${authInfo.serverAddress}/Items/${itemId}?userId=${authInfo.userId}&fields=MediaSources,Path`;
    
    const headers = { 'Accept': 'application/json' };
    if (authInfo.accessToken) {
      headers['Authorization'] = `Bearer ${authInfo.accessToken}`;
    }
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return response.json();
  }
}

const backgroundService = new BackgroundService();
backgroundService.initialize();
```

#### Step 3.3: Update Manifest for Background Script
Add to `manifest.json`:

```json
{
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  }
}
```

### Phase 4: Card Enhancement Implementation (Days 8-10)

#### Step 4.1: Card Detection and Enhancement
Update `content.js` with full card enhancement:

```javascript
class JellyfinCardEnhancer {
  constructor(options = {}) {
    this.options = options;
    this.enhanced = new WeakSet();
    this.observer = null;
  }
  
  async init() {
    if (!this.isJellyfinSite()) return;
    
    console.log('Initializing Jellyfin Card Enhancer');
    
    this.startObserving();
    await this.enhanceExistingCards();
  }
  
  isJellyfinSite() {
    return (
      document.querySelector('meta[name="application-name"][content*="Jellyfin"]') ||
      window.location.pathname.includes('/web/') ||
      document.querySelector('.mainDrawer')
    );
  }
  
  startObserving() {
    this.observer = new MutationObserver(this.handleMutations.bind(this));
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  handleMutations(mutations) {
    const cardsToEnhance = [];
    
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        
        if (node.matches && node.matches('.card[data-type="Movie"]')) {
          cardsToEnhance.push(node);
        }
        
        if (node.querySelectorAll) {
          const cards = node.querySelectorAll('.card[data-type="Movie"]');
          cardsToEnhance.push(...cards);
        }
      });
    });
    
    if (cardsToEnhance.length > 0) {
      this.enhanceCards(cardsToEnhance);
    }
  }
  
  async enhanceExistingCards() {
    const existingCards = document.querySelectorAll('.card[data-type="Movie"]');
    await this.enhanceCards(Array.from(existingCards));
  }
  
  async enhanceCards(cards) {
    for (const card of cards) {
      await this.enhanceCard(card);
    }
  }
  
  async enhanceCard(card) {
    if (this.enhanced.has(card)) return;
    
    const itemId = card.getAttribute('data-id');
    if (!itemId) return;
    
    try {
      const movieData = await this.getMovieData(itemId);
      this.addAttributesToCard(card, movieData);
      this.enhanced.add(card);
    } catch (error) {
      console.warn(`Failed to enhance card ${itemId}:`, error);
    }
  }
  
  async getMovieData(itemId) {
    // Try direct API access first
    if (window.ApiClient) {
      try {
        const userId = window.ApiClient.getCurrentUserId();
        return await window.ApiClient.getItem(userId, itemId);
      } catch (error) {
        console.warn('Direct API access failed:', error);
      }
    }
    
    // Fallback to background script
    return new Promise((resolve, reject) => {
      browser.runtime.sendMessage({
        action: 'fetchMovieData',
        itemId: itemId,
        authInfo: this.extractAuthInfo()
      }, (response) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }
  
  extractAuthInfo() {
    return {
      serverAddress: window.location.origin,
      userId: window.ApiClient?.getCurrentUserId() || null,
      accessToken: window.ApiClient?.accessToken() || null
    };
  }
  
  addAttributesToCard(card, movieData) {
    const cardText = card.querySelector('.cardText');
    if (!cardText || cardText.querySelector('.movie-attributes')) return;
    
    const attributes = this.buildAttributesList(movieData);
    if (attributes.length === 0) return;
    
    const attributesDiv = document.createElement('div');
    attributesDiv.className = 'cardText-secondary movie-attributes';
    attributesDiv.textContent = attributes.join(' • ');
    
    cardText.appendChild(attributesDiv);
  }
  
  buildAttributesList(movieData) {
    const attributes = [];
    
    if (this.options.showFileSize && movieData.MediaSources?.[0]?.Size) {
      const size = this.formatFileSize(movieData.MediaSources[0].Size);
      attributes.push(size);
    }
    
    if (this.options.showFileName && movieData.Path) {
      const filename = movieData.Path.split(/[\\/]/).pop();
      if (filename) {
        attributes.push(filename);
      }
    }
    
    return attributes;
  }
  
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Initialize with settings
(async function() {
  const settings = await ExtensionStorage.getSettings();
  
  if (settings.enabled) {
    const enhancer = new JellyfinCardEnhancer(settings);
    await enhancer.init();
  }
})();
```

### Phase 5: Testing and Debugging (Days 11-12)

#### Step 5.1: Create Test Cases
Create `test-cases.md`:

```markdown
# Test Cases

## Basic Functionality
- [ ] Extension loads without errors
- [ ] Jellyfin site detection works
- [ ] Settings page opens and saves
- [ ] Movie cards are detected

## Movie Card Enhancement
- [ ] File size displays correctly
- [ ] Filename displays correctly  
- [ ] Multiple attributes display properly
- [ ] Enhancement works on page navigation
- [ ] Enhancement works with infinite scroll

## Settings Integration
- [ ] Enabling/disabling works
- [ ] Attribute selection works
- [ ] Settings persist across browser sessions

## Edge Cases
- [ ] Works with different Jellyfin themes
- [ ] Handles API failures gracefully
- [ ] Works with slow network connections
- [ ] Handles missing movie data
```

#### Step 5.2: Debug Tools
Add debug logging to content script:

```javascript
class DebugLogger {
  static enabled = false; // Set to true for development
  
  static log(message, ...args) {
    if (this.enabled) {
      console.log(`[Jellyfin Ext] ${message}`, ...args);
    }
  }
  
  static error(message, ...args) {
    console.error(`[Jellyfin Ext] ${message}`, ...args);
  }
}
```

### Phase 6: Polish and Optimization (Days 13-14)

#### Step 6.1: Performance Optimization
- Implement request batching
- Add intelligent caching
- Optimize DOM queries
- Minimize API calls

#### Step 6.2: Error Handling
- Add comprehensive error handling
- Implement retry logic
- Add user-friendly error messages
- Handle offline scenarios

#### Step 6.3: UI Polish
- Improve styling consistency
- Add loading indicators
- Enhance settings page design
- Add tooltips and help text

## Testing Strategy

### Development Testing
1. **Local Testing**: Use `about:debugging` to load the temporary extension
2. **Console Monitoring**: Watch browser console for errors and debug logs
3. **Network Monitoring**: Check network tab for API requests
4. **Storage Inspection**: Verify settings storage in developer tools

### User Testing
1. **Different Jellyfin Versions**: Test with various Jellyfin server versions
2. **Different Browsers**: Test Firefox variations and versions
3. **Network Conditions**: Test with slow/unstable connections
4. **Edge Cases**: Test with missing data, large libraries, etc.

## Build and Package Commands

### Development
```bash
# No build step needed - direct loading for development
# Use web-ext for advanced development features (optional)
npm install -g web-ext
web-ext run --firefox-binary=/path/to/firefox
```

### Production Package
```bash
# Create zip file for distribution
zip -r jellyfin-movie-attributes-v1.0.0.zip . -x "*.git*" "test-cases.md" "README.md"

# Or use web-ext for automated packaging
web-ext build --artifacts-dir ./dist
```

## Deployment Preparation

### File Checklist
- [ ] `manifest.json` with correct version and permissions
- [ ] All JavaScript files minified (optional)
- [ ] All assets (icons) included
- [ ] README.md for users
- [ ] LICENSE file
- [ ] Test on clean Firefox install

### Pre-submission Testing
1. Install from zip file on clean browser
2. Test all functionality
3. Verify no console errors
4. Check permissions are minimal
5. Ensure good performance

This implementation plan provides a structured approach to building a robust Firefox extension for enhancing Jellyfin movie cards with additional attributes.