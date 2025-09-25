# DOM Manipulation Strategy for Jellyfin Extension

## Card Detection and Enhancement Strategy

Based on the Jellyfin web client investigation, here's a detailed plan for detecting and enhancing movie cards:

### Card Structure Analysis

From the cardBuilder.js investigation, movie cards have this structure:
```html
<div class="card backdropCard backdropCard-scalable" 
     data-type="Movie" 
     data-id="123456789" 
     data-serverid="server-id"
     data-action="link">
  
  <div class="cardImageContainer">
    <div class="cardPadder-backdrop"></div>
    <div class="cardContent">
      <div class="cardImageContainerInner">
        <!-- Image and play button -->
      </div>
    </div>
  </div>
  
  <div class="cardFooter">
    <div class="cardText">
      <div class="cardText-first">Movie Title</div>
      <div class="cardText-secondary">2023</div>
      <!-- Extension injects here -->
    </div>
  </div>
</div>
```

### Detection Selectors

```javascript
// Primary selector for movie cards
const MOVIE_CARD_SELECTOR = '.card[data-type="Movie"]';

// Alternative selectors for different card types
const CARD_SELECTORS = {
  movie: '.card[data-type="Movie"]',
  episode: '.card[data-type="Episode"]', 
  series: '.card[data-type="Series"]',
  all: '.card[data-type]'
};

// Container selectors where cards appear
const CARD_CONTAINER_SELECTORS = [
  '.itemsContainer',
  '.emby-itemscontainer',
  '.verticalSection-content',
  '.horizontalSection-content'
];
```

### Card Enhancement Logic

```javascript
class JellyfinCardEnhancer {
  constructor(options = {}) {
    this.options = {
      showFileSize: true,
      showFileName: true,
      showContainer: false,
      showResolution: false,
      ...options
    };
    
    this.cache = new Map();
    this.observer = null;
    this.enhanced = new WeakSet();
  }
  
  init() {
    if (!this.isJellyfinSite()) {
      console.log('Not a Jellyfin site, skipping enhancement');
      return;
    }
    
    console.log('Initializing Jellyfin card enhancer');
    this.startObserving();
    this.enhanceExistingCards();
  }
  
  isJellyfinSite() {
    // Multiple detection methods for reliability
    return (
      // Check for Jellyfin meta tag
      document.querySelector('meta[name="application-name"][content*="Jellyfin"]') ||
      // Check URL pattern
      window.location.pathname.includes('/web/') ||
      // Check for Jellyfin-specific elements
      document.querySelector('.mainDrawer') ||
      document.querySelector('.emby-scroller') ||
      // Check for Jellyfin API client
      window.ApiClient ||
      // Check localStorage for Jellyfin data
      localStorage.getItem('jellyfin_credentials')
    );
  }
  
  startObserving() {
    this.observer = new MutationObserver(this.handleMutations.bind(this));
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false // We don't need attribute changes
    });
  }
  
  handleMutations(mutations) {
    const cardsToEnhance = [];
    
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return; // Only element nodes
        
        // Check if the node itself is a card
        if (node.matches && node.matches(MOVIE_CARD_SELECTOR)) {
          cardsToEnhance.push(node);
        }
        
        // Check for cards within the added node
        if (node.querySelectorAll) {
          const cards = node.querySelectorAll(MOVIE_CARD_SELECTOR);
          cardsToEnhance.push(...cards);
        }
      });
    });
    
    // Enhance cards in batch
    if (cardsToEnhance.length > 0) {
      console.log(`Found ${cardsToEnhance.length} new cards to enhance`);
      this.enhanceCards(cardsToEnhance);
    }
  }
  
  enhanceExistingCards() {
    const existingCards = document.querySelectorAll(MOVIE_CARD_SELECTOR);
    console.log(`Found ${existingCards.length} existing cards to enhance`);
    this.enhanceCards(Array.from(existingCards));
  }
  
  async enhanceCards(cards) {
    // Process cards in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      await Promise.all(batch.map(card => this.enhanceCard(card)));
      
      // Small delay between batches
      if (i + batchSize < cards.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  async enhanceCard(card) {
    // Skip if already enhanced
    if (this.enhanced.has(card)) {
      return;
    }
    
    const itemId = card.getAttribute('data-id');
    const serverId = card.getAttribute('data-serverid');
    
    if (!itemId) {
      console.warn('Card missing data-id attribute', card);
      return;
    }
    
    try {
      const movieData = await this.getMovieData(itemId, serverId);
      this.addAttributesToCard(card, movieData);
      this.enhanced.add(card);
    } catch (error) {
      console.warn(`Failed to enhance card ${itemId}:`, error);
    }
  }
  
  async getMovieData(itemId, serverId) {
    // Check cache first
    const cacheKey = `${serverId || 'default'}:${itemId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const movieData = await this.fetchMovieData(itemId, serverId);
    
    // Cache the result
    this.cache.set(cacheKey, movieData);
    
    // Clean up cache if it gets too large
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    return movieData;
  }
  
  async fetchMovieData(itemId, serverId) {
    const authInfo = this.extractAuthInfo();
    if (!authInfo) {
      throw new Error('Could not extract Jellyfin authentication info');
    }
    
    const url = `${authInfo.apiUrl}/Items/${itemId}?userId=${authInfo.userId}&fields=MediaSources,Path`;
    const headers = {};
    
    if (authInfo.accessToken) {
      headers['Authorization'] = `Bearer ${authInfo.accessToken}`;
    }
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  extractAuthInfo() {
    // Try multiple methods to get auth info
    
    // Method 1: Global ApiClient object
    if (window.ApiClient) {
      return {
        apiUrl: window.ApiClient._serverAddress || window.ApiClient.serverAddress(),
        userId: window.ApiClient._currentUserId || window.ApiClient.getCurrentUserId(),
        accessToken: window.ApiClient._accessToken || window.ApiClient.accessToken()
      };
    }
    
    // Method 2: Check localStorage
    try {
      const credentials = localStorage.getItem('jellyfin_credentials');
      if (credentials) {
        const parsed = JSON.parse(credentials);
        return {
          apiUrl: parsed.serverAddress || window.location.origin,
          userId: parsed.userId,
          accessToken: parsed.accessToken
        };
      }
    } catch (e) {
      console.warn('Failed to parse credentials from localStorage', e);
    }
    
    // Method 3: Extract from page URL/context
    return {
      apiUrl: window.location.origin,
      userId: null, // Will need to be extracted differently
      accessToken: null
    };
  }
  
  addAttributesToCard(card, movieData) {
    const cardText = card.querySelector('.cardText');
    if (!cardText) {
      console.warn('Card missing .cardText element', card);
      return;
    }
    
    // Check if we already added attributes
    if (cardText.querySelector('.movie-attributes')) {
      return;
    }
    
    const attributes = this.buildAttributesList(movieData);
    if (attributes.length === 0) {
      return;
    }
    
    const attributesDiv = document.createElement('div');
    attributesDiv.className = 'cardText-secondary movie-attributes';
    attributesDiv.style.fontSize = '0.85em';
    attributesDiv.style.opacity = '0.8';
    attributesDiv.style.marginTop = '2px';
    
    // Create attribute elements
    attributes.forEach((attr, index) => {
      if (index > 0) {
        const separator = document.createElement('span');
        separator.textContent = ' • ';
        separator.style.opacity = '0.6';
        attributesDiv.appendChild(separator);
      }
      
      const span = document.createElement('span');
      span.textContent = attr;
      span.className = 'movie-attribute';
      attributesDiv.appendChild(span);
    });
    
    cardText.appendChild(attributesDiv);
  }
  
  buildAttributesList(movieData) {
    const attributes = [];
    
    // File size
    if (this.options.showFileSize && movieData.MediaSources?.[0]?.Size) {
      const size = this.formatFileSize(movieData.MediaSources[0].Size);
      attributes.push(size);
    }
    
    // Filename
    if (this.options.showFileName && movieData.Path) {
      const filename = movieData.Path.split(/[\\/]/).pop();
      if (filename) {
        attributes.push(filename);
      }
    }
    
    // Container format
    if (this.options.showContainer && movieData.MediaSources?.[0]?.Container) {
      attributes.push(movieData.MediaSources[0].Container.toUpperCase());
    }
    
    // Resolution
    if (this.options.showResolution && movieData.MediaSources?.[0]?.MediaStreams) {
      const videoStream = movieData.MediaSources[0].MediaStreams.find(s => s.Type === 'Video');
      if (videoStream?.Width && videoStream?.Height) {
        attributes.push(`${videoStream.Width}×${videoStream.Height}`);
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
  
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.cache.clear();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new JellyfinCardEnhancer().init();
  });
} else {
  new JellyfinCardEnhancer().init();
}
```

### CSS Styling

```css
/* styles.css */
.movie-attributes {
  font-size: 0.85em !important;
  opacity: 0.8;
  margin-top: 2px;
  line-height: 1.2;
}

.movie-attribute {
  white-space: nowrap;
}

/* Dark theme compatibility */
.theme-dark .movie-attributes {
  color: rgba(255, 255, 255, 0.7);
}

/* Light theme compatibility */  
.theme-light .movie-attributes {
  color: rgba(0, 0, 0, 0.6);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .movie-attributes {
    font-size: 0.8em !important;
  }
}
```

This approach provides a robust way to detect and enhance movie cards without breaking the existing Jellyfin interface.