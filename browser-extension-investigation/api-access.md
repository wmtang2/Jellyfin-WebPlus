# API Data Access Strategy for Jellyfin Extension

## Authentication and API Access Methods

Based on analysis of the Jellyfin web client, here are the available methods for accessing movie data:

### Method 1: Global ApiClient Access (Preferred)

The Jellyfin web client exposes a global `window.ApiClient` object that provides authenticated access to the API:

```javascript
class JellyfinApiAccess {
  constructor() {
    this.apiClient = null;
    this.isAuthenticated = false;
    this.retryCount = 0;
    this.maxRetries = 3;
  }
  
  async initialize() {
    // Wait for ApiClient to be available
    await this.waitForApiClient();
    
    if (this.apiClient) {
      this.isAuthenticated = true;
      console.log('Jellyfin API access initialized via ApiClient');
      return true;
    }
    
    // Fallback to manual authentication
    return await this.initializeManualAuth();
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
  
  async initializeManualAuth() {
    try {
      const authInfo = this.extractAuthFromStorage();
      if (authInfo) {
        this.apiClient = {
          serverAddress: () => authInfo.serverAddress,
          getCurrentUserId: () => authInfo.userId,
          accessToken: () => authInfo.accessToken,
          getItem: this.makeApiRequest.bind(this)
        };
        this.isAuthenticated = true;
        console.log('Jellyfin API access initialized via manual auth');
        return true;
      }
    } catch (error) {
      console.warn('Failed to initialize manual auth:', error);
    }
    
    return false;
  }
  
  extractAuthFromStorage() {
    // Try multiple storage locations
    const storageKeys = [
      'jellyfin_credentials',
      'jellyfin.user',
      'emby_credentials',
      'user_preferences'
    ];
    
    for (const key of storageKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          
          // Extract auth info from different formats
          if (parsed.Servers && parsed.Servers.length > 0) {
            const server = parsed.Servers[0];
            return {
              serverAddress: server.ManualAddress || server.LocalAddress,
              userId: server.UserId,
              accessToken: server.AccessToken
            };
          }
          
          if (parsed.serverAddress && parsed.userId) {
            return parsed;
          }
        }
      } catch (error) {
        console.warn(`Failed to parse ${key} from localStorage:`, error);
      }
    }
    
    // Fallback: extract from URL
    const origin = window.location.origin;
    const userId = this.extractUserIdFromUrl();
    
    if (userId) {
      return {
        serverAddress: origin,
        userId: userId,
        accessToken: null // Will try to work without token
      };
    }
    
    return null;
  }
  
  extractUserIdFromUrl() {
    // Look for userId in URL parameters or path
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId') || urlParams.get('user');
    
    if (userId) return userId;
    
    // Try to extract from path patterns like /web/index.html#!/home.html?userId=...
    const hashParams = window.location.hash.match(/userId=([^&]+)/);
    return hashParams ? hashParams[1] : null;
  }
  
  async fetchMovieData(itemId, options = {}) {
    if (!this.isAuthenticated) {
      throw new Error('API not authenticated');
    }
    
    try {
      // Use ApiClient if available
      if (this.apiClient && typeof this.apiClient.getItem === 'function') {
        const userId = this.apiClient.getCurrentUserId();
        return await this.apiClient.getItem(userId, itemId);
      }
      
      // Fallback to manual API request
      return await this.makeApiRequest(itemId, options);
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.warn(`API request failed, retrying (${this.retryCount}/${this.maxRetries}):`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
        return this.fetchMovieData(itemId, options);
      }
      
      throw error;
    }
  }
  
  async makeApiRequest(itemId, options = {}) {
    const baseUrl = this.apiClient.serverAddress();
    const userId = this.apiClient.getCurrentUserId();
    const accessToken = this.apiClient.accessToken();
    
    // Build URL with required fields
    const fields = [
      'MediaSources',
      'Path',
      'Container',
      'RunTimeTicks',
      'Size',
      'MediaStreams',
      ...options.additionalFields || []
    ];
    
    const url = new URL(`${baseUrl}/Items/${itemId}`);
    url.searchParams.set('userId', userId);
    url.searchParams.set('fields', fields.join(','));
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: headers,
      credentials: 'include' // Include cookies for session-based auth
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // Batch fetch multiple items for better performance
  async fetchMultipleMovieData(itemIds, options = {}) {
    if (!this.isAuthenticated) {
      throw new Error('API not authenticated');
    }
    
    const batchSize = options.batchSize || 5;
    const results = [];
    
    for (let i = 0; i < itemIds.length; i += batchSize) {
      const batch = itemIds.slice(i, i + batchSize);
      const batchPromises = batch.map(itemId => 
        this.fetchMovieData(itemId, options).catch(error => {
          console.warn(`Failed to fetch data for item ${itemId}:`, error);
          return null; // Return null for failed items
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to avoid overwhelming the server
      if (i + batchSize < itemIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
}

// Singleton instance
const apiAccess = new JellyfinApiAccess();
```

### Method 2: Network Request Interception

For cases where the global ApiClient is not available, we can intercept network requests:

```javascript
class NetworkInterceptor {
  constructor() {
    this.movieDataCache = new Map();
    this.requestInterceptor = null;
  }
  
  initialize() {
    this.interceptFetch();
    this.interceptXHR();
  }
  
  interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch.apply(this, args);
      
      // Check if this is a movie data request
      if (this.isMovieDataRequest(args[0])) {
        const clonedResponse = response.clone();
        this.cacheMovieDataFromResponse(args[0], clonedResponse);
      }
      
      return response;
    };
  }
  
  interceptXHR() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._interceptedUrl = url;
      return originalOpen.call(this, method, url, ...args);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      if (this.isMovieDataRequest(this._interceptedUrl)) {
        this.addEventListener('load', () => {
          if (this.status === 200) {
            this.cacheMovieDataFromXHR(this._interceptedUrl, this.responseText);
          }
        });
      }
      
      return originalSend.apply(this, args);
    };
  }
  
  isMovieDataRequest(url) {
    if (typeof url !== 'string') return false;
    
    return (
      url.includes('/Items/') && 
      (url.includes('fields=') || url.includes('MediaSources'))
    );
  }
  
  async cacheMovieDataFromResponse(url, response) {
    try {
      const data = await response.json();
      const itemId = this.extractItemIdFromUrl(url);
      
      if (itemId && data) {
        this.movieDataCache.set(itemId, data);
      }
    } catch (error) {
      console.warn('Failed to cache movie data from response:', error);
    }
  }
  
  cacheMovieDataFromXHR(url, responseText) {
    try {
      const data = JSON.parse(responseText);
      const itemId = this.extractItemIdFromUrl(url);
      
      if (itemId && data) {
        this.movieDataCache.set(itemId, data);
      }
    } catch (error) {
      console.warn('Failed to cache movie data from XHR:', error);
    }
  }
  
  extractItemIdFromUrl(url) {
    const match = url.match(/\/Items\/([^\/\?]+)/);
    return match ? match[1] : null;
  }
  
  getCachedMovieData(itemId) {
    return this.movieDataCache.get(itemId);
  }
  
  destroy() {
    // Restore original methods if needed
    this.movieDataCache.clear();
  }
}
```

### Method 3: Background Script API Requests

For Firefox extensions, we can use background scripts with additional permissions:

```javascript
// background.js
class BackgroundApiService {
  constructor() {
    this.cache = new Map();
  }
  
  async handleMessage(request, sender, sendResponse) {
    if (request.action === 'fetchMovieData') {
      try {
        const data = await this.fetchMovieData(request.itemId, request.authInfo);
        sendResponse({ success: true, data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }
  }
  
  async fetchMovieData(itemId, authInfo) {
    const url = `${authInfo.serverAddress}/Items/${itemId}?userId=${authInfo.userId}&fields=MediaSources,Path`;
    
    const headers = {
      'Accept': 'application/json'
    };
    
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

const apiService = new BackgroundApiService();
browser.runtime.onMessage.addListener(apiService.handleMessage.bind(apiService));
```

```javascript
// content.js - usage
async function getMovieDataViaBackground(itemId, authInfo) {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage({
      action: 'fetchMovieData',
      itemId: itemId,
      authInfo: authInfo
    }, (response) => {
      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}
```

### Integration with Card Enhancer

```javascript
// Enhanced version of the card enhancer with robust API access
class EnhancedJellyfinCardEnhancer extends JellyfinCardEnhancer {
  constructor(options = {}) {
    super(options);
    this.apiAccess = new JellyfinApiAccess();
    this.networkInterceptor = new NetworkInterceptor();
  }
  
  async init() {
    if (!this.isJellyfinSite()) {
      return;
    }
    
    // Initialize API access
    const apiInitialized = await this.apiAccess.initialize();
    
    if (!apiInitialized) {
      console.warn('Could not initialize API access, falling back to network interception');
      this.networkInterceptor.initialize();
    }
    
    // Start card enhancement
    super.init();
  }
  
  async fetchMovieData(itemId, serverId) {
    // Try API access first
    if (this.apiAccess.isAuthenticated) {
      try {
        return await this.apiAccess.fetchMovieData(itemId);
      } catch (error) {
        console.warn('API access failed, trying network cache:', error);
      }
    }
    
    // Fallback to intercepted network data
    const cachedData = this.networkInterceptor.getCachedMovieData(itemId);
    if (cachedData) {
      return cachedData;
    }
    
    // Last resort: manual API request
    return super.fetchMovieData(itemId, serverId);
  }
}
```

This comprehensive approach ensures reliable access to movie data across different Jellyfin configurations and authentication states.