# Firefox Extension Architecture for Jellyfin Enhancement

## Overview

The Jellyfin Movie Attributes Extension will be structured as a Firefox WebExtension with the following components:

```
jellyfin-movie-attributes-extension/
├── manifest.json              # Extension manifest and permissions
├── background.js             # Background script for API requests
├── content.js               # Content script for DOM manipulation
├── options/
│   ├── options.html         # Settings page HTML
│   ├── options.js           # Settings page logic
│   └── options.css          # Settings page styling
├── popup/
│   ├── popup.html           # Extension popup HTML
│   ├── popup.js             # Extension popup logic
│   └── popup.css            # Extension popup styling
├── assets/
│   ├── icon-16.png          # Extension icons
│   ├── icon-48.png
│   └── icon-128.png
└── utils/
    ├── storage.js           # Storage utilities
    └── common.js            # Shared utilities
```

## Component Architecture

### 1. Manifest.json Configuration

```json
{
  "manifest_version": 2,
  "name": "Jellyfin Movie Attributes",
  "version": "1.0.0",
  "description": "Display additional movie attributes (file size, filename) in Jellyfin web interface",
  
  "permissions": [
    "storage",
    "activeTab",
    "webNavigation",
    "*://*/web/*",
    "*://localhost:*/web/*",
    "*://127.0.0.1:*/web/*",
    "*://192.168.*:*/web/*",
    "*://10.*:*/web/*",
    "*://172.16.*:*/web/*"
  ],
  
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  },
  
  "content_scripts": [
    {
      "matches": [
        "*://*/web/*",
        "*://localhost:*/web/*",
        "*://127.0.0.1:*/web/*", 
        "*://192.168.*:*/web/*",
        "*://10.*:*/web/*",
        "*://172.16.*:*/web/*"
      ],
      "js": ["utils/common.js", "utils/storage.js", "content.js"],
      "css": ["content.css"],
      "run_at": "document_end",
      "all_frames": true
    }
  ],
  
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  },
  
  "browser_action": {
    "default_popup": "popup/popup.html",
    "default_title": "Jellyfin Movie Attributes",
    "default_icon": {
      "16": "assets/icon-16.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    }
  },
  
  "web_accessible_resources": [
    "content.css"
  ],
  
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png", 
    "128": "assets/icon-128.png"
  }
}
```

### 2. Content Script Architecture

```javascript
// content.js - Main content script
class JellyfinExtensionController {
  constructor() {
    this.cardEnhancer = null;
    this.apiAccess = null;
    this.settings = null;
    this.isInitialized = false;
  }
  
  async initialize() {
    if (this.isInitialized) return;
    
    // Load user settings
    this.settings = await ExtensionStorage.getSettings();
    
    // Check if extension is enabled
    if (!this.settings.enabled) {
      console.log('Jellyfin extension is disabled');
      return;
    }
    
    // Verify this is a Jellyfin site
    if (!this.isJellyfinSite()) {
      return;
    }
    
    console.log('Initializing Jellyfin Movie Attributes Extension');
    
    // Initialize API access
    this.apiAccess = new JellyfinApiAccess();
    await this.apiAccess.initialize();
    
    // Initialize card enhancer
    this.cardEnhancer = new JellyfinCardEnhancer({
      showFileSize: this.settings.showFileSize,
      showFileName: this.settings.showFileName,
      showContainer: this.settings.showContainer,
      showResolution: this.settings.showResolution,
      apiAccess: this.apiAccess
    });
    
    await this.cardEnhancer.init();
    
    // Listen for settings changes
    this.setupMessageListener();
    
    this.isInitialized = true;
    console.log('Jellyfin extension initialized successfully');
  }
  
  isJellyfinSite() {
    // Multiple detection methods
    return (
      document.querySelector('meta[name="application-name"][content*="Jellyfin"]') ||
      window.location.pathname.includes('/web/') ||
      document.querySelector('.mainDrawer') ||
      document.querySelector('.emby-scroller') ||
      window.ApiClient ||
      localStorage.getItem('jellyfin_credentials')
    );
  }
  
  setupMessageListener() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'settingsChanged':
          this.handleSettingsChange(message.settings);
          break;
        case 'refresh':
          this.refresh();
          break;
        case 'getStatus':
          sendResponse({
            isInitialized: this.isInitialized,
            isJellyfinSite: this.isJellyfinSite(),
            enhancedCards: this.cardEnhancer?.getEnhancedCount() || 0
          });
          break;
      }
    });
  }
  
  async handleSettingsChange(newSettings) {
    this.settings = newSettings;
    
    if (this.cardEnhancer) {
      await this.cardEnhancer.updateSettings(newSettings);
    }
    
    if (!newSettings.enabled && this.cardEnhancer) {
      this.cardEnhancer.removeAllEnhancements();
    } else if (newSettings.enabled && !this.cardEnhancer) {
      await this.initialize();
    }
  }
  
  async refresh() {
    if (this.cardEnhancer) {
      await this.cardEnhancer.refresh();
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new JellyfinExtensionController().initialize();
  });
} else {
  new JellyfinExtensionController().initialize();
}
```

### 3. Background Script Architecture

```javascript
// background.js - Background script for API requests and cross-origin access
class BackgroundService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }
  
  initialize() {
    // Listen for messages from content scripts
    browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Listen for tab updates to clear cache when needed
    browser.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    
    // Clean up cache periodically
    setInterval(this.cleanupCache.bind(this), 60 * 1000); // Every minute
  }
  
  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'fetchMovieData':
          const data = await this.fetchMovieData(request.itemId, request.authInfo);
          return { success: true, data };
          
        case 'fetchMultipleMovieData':
          const multiData = await this.fetchMultipleMovieData(request.itemIds, request.authInfo);
          return { success: true, data: multiData };
          
        case 'clearCache':
          this.cache.clear();
          return { success: true };
          
        default:
          return { success: false, error: 'Unknown action' };
      }
    } catch (error) {
      console.error('Background service error:', error);
      return { success: false, error: error.message };
    }
  }
  
  async fetchMovieData(itemId, authInfo) {
    const cacheKey = `${authInfo.serverAddress}:${itemId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    const fields = [
      'MediaSources',
      'Path',
      'Container',
      'RunTimeTicks',
      'Size',
      'MediaStreams'
    ];
    
    const url = new URL(`${authInfo.serverAddress}/Items/${itemId}`);
    url.searchParams.set('userId', authInfo.userId);
    url.searchParams.set('fields', fields.join(','));
    
    const headers = {
      'Accept': 'application/json'
    };
    
    if (authInfo.accessToken) {
      headers['Authorization'] = `Bearer ${authInfo.accessToken}`;
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache the result
    this.cache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
    
    return data;
  }
  
  async fetchMultipleMovieData(itemIds, authInfo) {
    const results = await Promise.allSettled(
      itemIds.map(itemId => this.fetchMovieData(itemId, authInfo))
    );
    
    return results.map((result, index) => ({
      itemId: itemIds[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  }
  
  handleTabUpdate(tabId, changeInfo, tab) {
    // Clear cache when navigating away from Jellyfin
    if (changeInfo.status === 'loading' && tab.url && !tab.url.includes('/web/')) {
      this.cache.clear();
    }
  }
  
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}

// Initialize background service
const backgroundService = new BackgroundService();
backgroundService.initialize();
```

### 4. Settings/Options Page Architecture

```html
<!-- options/options.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Jellyfin Movie Attributes - Settings</title>
    <link rel="stylesheet" href="options.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>Jellyfin Movie Attributes</h1>
            <p>Configure which movie attributes to display in your Jellyfin interface</p>
        </header>
        
        <main>
            <section class="setting-group">
                <h2>General Settings</h2>
                
                <div class="setting-item">
                    <label class="switch">
                        <input type="checkbox" id="enabled">
                        <span class="slider"></span>
                    </label>
                    <div class="setting-content">
                        <label for="enabled">Enable Extension</label>
                        <p>Turn the extension on or off</p>
                    </div>
                </div>
            </section>
            
            <section class="setting-group">
                <h2>Display Attributes</h2>
                
                <div class="setting-item">
                    <label class="switch">
                        <input type="checkbox" id="showFileSize">
                        <span class="slider"></span>
                    </label>
                    <div class="setting-content">
                        <label for="showFileSize">File Size</label>
                        <p>Display the file size of movies (e.g., "2.3 GB")</p>
                    </div>
                </div>
                
                <div class="setting-item">
                    <label class="switch">
                        <input type="checkbox" id="showFileName">
                        <span class="slider"></span>
                    </label>
                    <div class="setting-content">
                        <label for="showFileName">File Name</label>
                        <p>Display the original filename</p>
                    </div>
                </div>
                
                <div class="setting-item">
                    <label class="switch">
                        <input type="checkbox" id="showContainer">
                        <span class="slider"></span>
                    </label>
                    <div class="setting-content">
                        <label for="showContainer">Container Format</label>
                        <p>Display the file container (e.g., "MKV", "MP4")</p>
                    </div>
                </div>
                
                <div class="setting-item">
                    <label class="switch">
                        <input type="checkbox" id="showResolution">
                        <span class="slider"></span>
                    </label>
                    <div class="setting-content">
                        <label for="showResolution">Resolution</label>
                        <p>Display video resolution (e.g., "1920×1080")</p>
                    </div>
                </div>
            </section>
            
            <section class="setting-group">
                <h2>Advanced Settings</h2>
                
                <div class="setting-item">
                    <label for="cacheTimeout">Cache Timeout (minutes)</label>
                    <input type="number" id="cacheTimeout" min="1" max="60" value="5">
                    <p>How long to cache movie data to improve performance</p>
                </div>
            </section>
        </main>
        
        <footer>
            <div class="button-group">
                <button id="save">Save Settings</button>
                <button id="reset">Reset to Defaults</button>
            </div>
            <div id="status" class="status"></div>
        </footer>
    </div>
    
    <script src="../utils/storage.js"></script>
    <script src="options.js"></script>
</body>
</html>
```

```javascript
// options/options.js
class OptionsPage {
  constructor() {
    this.defaultSettings = {
      enabled: true,
      showFileSize: true,
      showFileName: true,
      showContainer: false,
      showResolution: false,
      cacheTimeout: 5
    };
    
    this.elements = {};
  }
  
  async initialize() {
    this.bindElements();
    this.bindEvents();
    await this.loadSettings();
  }
  
  bindElements() {
    this.elements = {
      enabled: document.getElementById('enabled'),
      showFileSize: document.getElementById('showFileSize'),
      showFileName: document.getElementById('showFileName'), 
      showContainer: document.getElementById('showContainer'),
      showResolution: document.getElementById('showResolution'),
      cacheTimeout: document.getElementById('cacheTimeout'),
      save: document.getElementById('save'),
      reset: document.getElementById('reset'),
      status: document.getElementById('status')
    };
  }
  
  bindEvents() {
    this.elements.save.addEventListener('click', this.saveSettings.bind(this));
    this.elements.reset.addEventListener('click', this.resetSettings.bind(this));
    
    // Auto-save on change
    Object.values(this.elements).forEach(element => {
      if (element.type === 'checkbox' || element.type === 'number') {
        element.addEventListener('change', this.debounce(this.saveSettings.bind(this), 500));
      }
    });
  }
  
  async loadSettings() {
    const settings = await ExtensionStorage.getSettings();
    
    this.elements.enabled.checked = settings.enabled;
    this.elements.showFileSize.checked = settings.showFileSize;
    this.elements.showFileName.checked = settings.showFileName;
    this.elements.showContainer.checked = settings.showContainer;
    this.elements.showResolution.checked = settings.showResolution;
    this.elements.cacheTimeout.value = settings.cacheTimeout;
  }
  
  async saveSettings() {
    const settings = {
      enabled: this.elements.enabled.checked,
      showFileSize: this.elements.showFileSize.checked,
      showFileName: this.elements.showFileName.checked,
      showContainer: this.elements.showContainer.checked,
      showResolution: this.elements.showResolution.checked,
      cacheTimeout: parseInt(this.elements.cacheTimeout.value)
    };
    
    await ExtensionStorage.saveSettings(settings);
    
    // Notify content scripts of changes
    const tabs = await browser.tabs.query({});
    tabs.forEach(tab => {
      browser.tabs.sendMessage(tab.id, {
        action: 'settingsChanged',
        settings: settings
      }).catch(() => {
        // Ignore errors for tabs that don't have our content script
      });
    });
    
    this.showStatus('Settings saved successfully', 'success');
  }
  
  async resetSettings() {
    const settings = { ...this.defaultSettings };
    
    await ExtensionStorage.saveSettings(settings);
    await this.loadSettings();
    
    this.showStatus('Settings reset to defaults', 'success');
  }
  
  showStatus(message, type = 'info') {
    this.elements.status.textContent = message;
    this.elements.status.className = `status ${type}`;
    
    setTimeout(() => {
      this.elements.status.textContent = '';
      this.elements.status.className = 'status';
    }, 3000);
  }
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage().initialize();
});
```

### 5. Storage Utilities

```javascript
// utils/storage.js
class ExtensionStorage {
  static defaultSettings = {
    enabled: true,
    showFileSize: true,
    showFileName: true,
    showContainer: false,
    showResolution: false,
    cacheTimeout: 5
  };
  
  static async getSettings() {
    try {
      const result = await browser.storage.sync.get('settings');
      return { ...this.defaultSettings, ...result.settings };
    } catch (error) {
      console.warn('Failed to load settings from sync storage, using local:', error);
      try {
        const result = await browser.storage.local.get('settings');
        return { ...this.defaultSettings, ...result.settings };
      } catch (localError) {
        console.error('Failed to load settings from local storage:', localError);
        return this.defaultSettings;
      }
    }
  }
  
  static async saveSettings(settings) {
    const settingsToSave = { ...this.defaultSettings, ...settings };
    
    try {
      await browser.storage.sync.set({ settings: settingsToSave });
    } catch (error) {
      console.warn('Failed to save to sync storage, using local:', error);
      await browser.storage.local.set({ settings: settingsToSave });
    }
  }
  
  static async clearSettings() {
    try {
      await browser.storage.sync.remove('settings');
    } catch (error) {
      await browser.storage.local.remove('settings');
    }
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.ExtensionStorage = ExtensionStorage;
}
```

### 6. Data Flow Architecture

```
User interacts with Jellyfin web interface
    ↓
Content Script detects movie cards
    ↓
Content Script extracts itemId from card data attributes
    ↓
Content Script requests movie data via Background Script OR Direct API
    ↓
Background Script fetches data from Jellyfin API (with caching)
    ↓
Content Script receives movie data
    ↓ 
Content Script formats and injects attributes into card DOM
    ↓
Enhanced movie cards displayed to user
```

This architecture provides a robust, maintainable, and user-friendly extension that can reliably enhance Jellyfin movie cards with additional attributes while respecting user preferences and maintaining good performance through caching.