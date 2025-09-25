# Firefox Extension for Jellyfin Movie Attributes

## Extension Approach Analysis

Based on my investigation of the Jellyfin web client, here's how a Firefox extension could work:

### DOM Structure Analysis

From the Jellyfin web client investigation, movie cards have this structure:
```html
<div class="card" data-type="Movie" data-id="[item-id]" data-serverid="[server-id]">
  <div class="cardImageContainer">
    <!-- Image content -->
  </div>
  <div class="cardText">
    <div class="cardText-first">Movie Title</div>
    <div class="cardText-secondary">Year or other info</div>
    <!-- This is where we'd inject additional attributes -->
  </div>
</div>
```

### Extension Strategy

1. **Content Script Detection**
   - Detect when we're on a Jellyfin web interface
   - Watch for movie cards being added to DOM
   - Extract item IDs from `data-id` attributes

2. **API Data Fetching**
   - Use item IDs to make API calls with MediaSources field
   - Extract file size, filename, path from MediaSourceInfo
   - Cache results to avoid duplicate requests

3. **DOM Enhancement**
   - Add new text lines to `.cardText` containers
   - Style consistently with existing Jellyfin theme
   - Respect user preferences for which attributes to show

## Proof of Concept Structure

### manifest.json
```json
{
  "manifest_version": 2,
  "name": "Jellyfin Movie Attributes",
  "version": "1.0",
  "description": "Adds file size and filename to Jellyfin movie cards",
  
  "permissions": [
    "storage",
    "activeTab",
    "http://*/",
    "https://*/"
  ],
  
  "content_scripts": [{
    "matches": ["http://*/web/*", "https://*/web/*"],
    "js": ["content.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }],
  
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  },
  
  "options_page": "options.html",
  
  "web_accessible_resources": [
    "injected.js"
  ]
}
```

### Content Script Logic
```javascript
// content.js
(function() {
  'use strict';
  
  // Detect if we're on Jellyfin
  if (!isJellyfinSite()) return;
  
  const observer = new MutationObserver(onDOMChange);
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  function isJellyfinSite() {
    return document.querySelector('meta[name="application-name"][content*="Jellyfin"]') ||
           window.location.pathname.includes('/web/') ||
           document.querySelector('.mainDrawer, .emby-scroller');
  }
  
  function onDOMChange(mutations) {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element node
          // Find movie cards
          const cards = node.classList?.contains('card') ? 
            [node] : 
            node.querySelectorAll?.('.card[data-type="Movie"]') || [];
            
          cards.forEach(enhanceMovieCard);
        }
      });
    });
  }
  
  async function enhanceMovieCard(card) {
    const itemId = card.getAttribute('data-id');
    const serverId = card.getAttribute('data-serverid');
    
    if (!itemId) return;
    
    try {
      const movieData = await fetchMovieData(itemId, serverId);
      addAttributesToCard(card, movieData);
    } catch (error) {
      console.warn('Failed to enhance movie card:', error);
    }
  }
  
  async function fetchMovieData(itemId, serverId) {
    // Get Jellyfin API base URL from current page
    const apiUrl = getJellyfinApiUrl();
    const userId = getCurrentUserId();
    
    const response = await fetch(`${apiUrl}/Items/${itemId}?userId=${userId}&fields=MediaSources,Path`);
    return response.json();
  }
  
  function addAttributesToCard(card, movieData) {
    const cardText = card.querySelector('.cardText');
    if (!cardText || cardText.querySelector('.movie-attributes')) return;
    
    const attributesDiv = document.createElement('div');
    attributesDiv.className = 'movie-attributes cardText-secondary';
    
    const attributes = [];
    
    // File size
    if (movieData.MediaSources?.[0]?.Size) {
      attributes.push(formatFileSize(movieData.MediaSources[0].Size));
    }
    
    // Filename
    if (movieData.Path) {
      const filename = movieData.Path.split(/[\\/]/).pop();
      attributes.push(filename);
    }
    
    if (attributes.length > 0) {
      attributesDiv.textContent = attributes.join(' • ');
      cardText.appendChild(attributesDiv);
    }
  }
  
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  function getJellyfinApiUrl() {
    // Extract from current page context
    return window.location.origin;
  }
  
  function getCurrentUserId() {
    // Extract from Jellyfin's current session
    // This would need to be extracted from the page's JavaScript context
    return null; // Placeholder
  }
})();
```

## Key Advantages of Extension Approach

### ✅ Benefits

1. **No Core Modification Required**
   - Works with any Jellyfin installation
   - No need to maintain fork of Jellyfin web
   - Easy to install/uninstall

2. **Cross-Browser Potential**
   - Can be ported to Chrome with minimal changes
   - Works with any Jellyfin server version

3. **User Control**
   - Users can enable/disable easily
   - Configurable which attributes to show
   - No server-side configuration needed

4. **Rapid Development**
   - Can iterate quickly without Jellyfin release cycles
   - Easy to test and debug
   - Simple distribution via browser extension stores

### ❌ Challenges to Address

1. **API Authentication**
   - Need to extract user session/token from page
   - Must handle different auth methods (API key, session, etc.)

2. **Dynamic Content Detection**
   - Jellyfin uses dynamic routing and AJAX loading
   - Need robust detection of new content

3. **Performance**
   - Avoid excessive API calls
   - Implement smart caching
   - Don't block UI rendering

4. **Cross-Origin Requests**
   - Need proper permissions for Jellyfin API calls
   - Handle different Jellyfin deployment URLs

## Technical Implementation Details

### Authentication Extraction
```javascript
function extractAuthInfo() {
  // Method 1: Check for API client in page
  if (window.ApiClient) {
    return {
      apiUrl: window.ApiClient._serverAddress,
      userId: window.ApiClient._currentUserId,
      accessToken: window.ApiClient._accessToken
    };
  }
  
  // Method 2: Extract from localStorage
  const auth = localStorage.getItem('jellyfin_credentials');
  if (auth) {
    return JSON.parse(auth);
  }
  
  // Method 3: Parse from network requests
  return extractFromNetworkRequests();
}
```

### Smart Caching Strategy
```javascript
class MovieDataCache {
  constructor() {
    this.cache = new Map();
    this.pending = new Map();
  }
  
  async get(itemId) {
    if (this.cache.has(itemId)) {
      return this.cache.get(itemId);
    }
    
    if (this.pending.has(itemId)) {
      return this.pending.get(itemId);
    }
    
    const promise = this.fetchMovieData(itemId);
    this.pending.set(itemId, promise);
    
    try {
      const data = await promise;
      this.cache.set(itemId, data);
      return data;
    } finally {
      this.pending.delete(itemId);
    }
  }
}
```

This extension approach looks very promising! It would provide all the functionality we want without any server-side modifications.