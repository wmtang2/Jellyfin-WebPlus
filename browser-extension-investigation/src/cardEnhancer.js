// src/cardEnhancer.js
// Card detection and enhancement logic (to be TDD'd)

function findMovieCards(doc) {
  doc = doc || document;
  const cards = Array.from(doc.querySelectorAll('.card[data-type="Movie"]'));
  console.log('[Jellyfin Extension] Found', cards.length, 'movie cards');
  
  // Also try alternative selectors in case the structure is different
  if (cards.length === 0) {
    const alternativeCards = Array.from(doc.querySelectorAll('.card'));
    console.log('[Jellyfin Extension] Found', alternativeCards.length, 'total cards');
    
    // Log first few cards to see their structure
    alternativeCards.slice(0, 3).forEach((card, i) => {
      console.log(`[Jellyfin Extension] Card ${i}:`, {
        classes: card.className,
        dataType: card.getAttribute('data-type'),
        dataId: card.getAttribute('data-id'),
        innerHTML: card.innerHTML.substring(0, 200) + '...'
      });
    });
  }
  
  return cards;
}

// Human readable file size (binary units, 1KB = 1024B) with single decimal except bytes.
function formatFileSize(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '';
  if (!isFinite(bytes) || bytes < 0) return '';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) return bytes + ' B';
  const value = bytes / Math.pow(k, i);
  return value.toFixed(1) + ' ' + units[i];
}

// Build attribute list respecting option flags.
function buildAttributesList(item, options) {
  if (!item || !options) return [];
  const attrs = [];
  const mediaSource = item.MediaSources && item.MediaSources[0];

  if (options.showFileSize && mediaSource && typeof mediaSource.Size === 'number') {
    const sizeStr = formatFileSize(mediaSource.Size);
    if (sizeStr) attrs.push(sizeStr);
  }

  if (options.showFileName && item.Path) {
    const parts = item.Path.split(/[/\\]/);
    const name = parts[parts.length - 1];
    if (name) attrs.push(name);
  }

  if (options.showContainer && mediaSource && mediaSource.Container) {
    attrs.push(String(mediaSource.Container).toUpperCase());
  }

  if (options.showResolution && mediaSource && Array.isArray(mediaSource.MediaStreams)) {
    const vs = mediaSource.MediaStreams.find(s => s && s.Type === 'Video' && s.Width && s.Height);
    if (vs) attrs.push(`${vs.Width}×${vs.Height}`);
  }

  if (options.showHDR && mediaSource && Array.isArray(mediaSource.MediaStreams)) {
    const vs = mediaSource.MediaStreams.find(s => s && s.Type === 'Video');
    if (vs) {
      // Check for HDR indicators in various fields
      const isHDR = vs.VideoRange === 'HDR' || 
                    vs.ColorTransfer === 'smpte2084' || 
                    vs.ColorTransfer === 'arib-std-b67' ||
                    (vs.Profile && vs.Profile.toLowerCase().includes('hdr')) ||
                    (vs.VideoRangeType && vs.VideoRangeType !== 'SDR');
      
      if (isHDR) {
        // Try to determine HDR type
        if (vs.ColorTransfer === 'smpte2084') {
          attrs.push('HDR10');
        } else if (vs.ColorTransfer === 'arib-std-b67') {
          attrs.push('HLG');
        } else if (vs.Profile && vs.Profile.toLowerCase().includes('dv')) {
          attrs.push('Dolby Vision');
        } else {
          attrs.push('HDR');
        }
      } else {
        attrs.push('SDR');
      }
    }
  }

  if (options.showAudioLanguage && mediaSource && Array.isArray(mediaSource.MediaStreams)) {
    const as = mediaSource.MediaStreams.find(s => s && s.Type === 'Audio');
    if (as && as.Language) {
      // Convert language code to readable format if possible
      const langCode = as.Language.toLowerCase();
      const langMap = {
        'eng': 'English',
        'jpn': 'Japanese',
        'kor': 'Korean',
        'fra': 'French',
        'deu': 'German',
        'spa': 'Spanish',
        'ita': 'Italian',
        'rus': 'Russian',
        'chi': 'Chinese',
        'por': 'Portuguese',
        'hin': 'Hindi',
        'ara': 'Arabic'
      };
      const langName = langMap[langCode] || as.Language.toUpperCase();
      attrs.push(langName);
    }
  }

  return attrs;
}

// Stub: inject attributes into a card element
function addAttributesToCard(cardEl, attributes, options = {}) {
  if (!cardEl || !Array.isArray(attributes) || attributes.length === 0) return false;
  const cardText = cardEl.querySelector('.cardText');
  if (!cardText) return false;
  if (cardText.querySelector('.movie-attributes')) return false; // prevent duplication

  // Separate attributes into filename, resolution/HDR, and others
  let filename = null;
  let fileSize = null;
  let resolutionHdr = [];
  let others = [];
  const hdrKeywords = ['SDR', 'HDR', 'HDR10', 'HLG', 'Dolby Vision'];
  const resolutionRegex = /^\d{3,5}×\d{3,5}$/;

  if (attributes.length > 0) {
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (/^\d+\.\d+\s*(MB|GB|KB)$/.test(attr)) {
        fileSize = attr;
        others.push(attr); // Also include file size in visible extra attributes
      } else if (attr.includes('.') && !attr.includes(' ')) {
        filename = attr;
      } else if (resolutionRegex.test(attr) || hdrKeywords.some(k => attr === k)) {
        resolutionHdr.push(attr);
      } else {
        others.push(attr);
      }
    }
  }
  // Store file size as attribute
  if (fileSize) {
    cardEl.setAttribute('data-size', fileSize);
    console.log('[Jellyfin Extension] Set data-size on card:', cardEl.getAttribute('data-id'), fileSize);
  }

  // Create filename line and store as attribute
  if (filename) {
    const filenameDiv = document.createElement('div');
    filenameDiv.className = 'cardText-secondary movie-attributes movie-attributes-filename';
    filenameDiv.textContent = filename;
    cardText.appendChild(filenameDiv);
    cardEl.setAttribute('data-filename', filename);
    console.log('[Jellyfin Extension] Set data-filename on card:', cardEl.getAttribute('data-id'), filename);
  }
  // Create other attributes line
  if (others.length > 0) {
    const attrsDiv = document.createElement('div');
    attrsDiv.className = 'cardText-secondary movie-attributes movie-attributes-details';
    attrsDiv.textContent = others.join(' • ');
    cardText.appendChild(attrsDiv);
  }
  // Create resolution/HDR line
  if (resolutionHdr.length > 0) {
    const resDiv = document.createElement('div');
    resDiv.className = 'cardText-secondary movie-attributes movie-attributes-res';
    resDiv.textContent = resolutionHdr.join(' • ');
    cardText.appendChild(resDiv);
  }
  return true;
}

// Add action buttons to a card element
function addActionButtonsToCard(cardEl, itemId, options = {}) {
  if (!cardEl || !itemId) return false;
  const cardText = cardEl.querySelector('.cardText');
  if (!cardText) return false;
  if (cardText.querySelector('.movie-action-buttons')) return false; // prevent duplication

  // Check if any buttons should be shown
  const showDeleteButton = options.showDeleteButton || false;
  const showIdentifyButton = options.showIdentifyButton || false;
  
  if (!showDeleteButton && !showIdentifyButton) return false;

  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'movie-action-buttons';
  
  // Create Delete Media button
  if (showDeleteButton) {
    const deleteButton = document.createElement('button');
    deleteButton.className = 'jellyfin-action-btn jellyfin-delete-btn';
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('data-item-id', itemId);
    deleteButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('[Jellyfin Extension] Delete button clicked for item:', itemId);
      
      // Debug mode - hold Ctrl while clicking to inspect card structure
      if (e.ctrlKey) {
        debugCardStructure(itemId);
        return;
      }
      
      triggerDeleteDialog(itemId);
    });
    // Prevent any parent click handlers
    deleteButton.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    });
    buttonContainer.appendChild(deleteButton);
  }

  // Create Identify button
  if (showIdentifyButton) {
    const identifyButton = document.createElement('button');
    identifyButton.className = 'jellyfin-action-btn jellyfin-identify-btn';
    identifyButton.textContent = 'Identify';
    identifyButton.setAttribute('data-item-id', itemId);
    identifyButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('[Jellyfin Extension] Identify button clicked for item:', itemId);
      
      // Debug mode - hold Ctrl while clicking to inspect card structure
      if (e.ctrlKey) {
        debugCardStructure(itemId);
        return;
      }
      
      triggerIdentifyDialog(itemId);
    });
    // Prevent any parent click handlers
    identifyButton.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    });
    buttonContainer.appendChild(identifyButton);
  }

  cardText.appendChild(buttonContainer);
  return true;
}

// Trigger Jellyfin's native delete dialog
function triggerDeleteDialog(itemId) {
  console.log('[Jellyfin Extension] Triggering delete dialog for item:', itemId);
  
  // Get item details first
  getItemDetailsForDialog(itemId).then(itemInfo => {
    console.log('[Jellyfin Extension] Got item info:', itemInfo);
    
    // Retrieve filename and file size from card attributes if available
    let filename = '';
    let fileSize = '';
    const cardElement = document.querySelector(`[data-id="${itemId}"]`);
    if (cardElement) {
      if (cardElement.hasAttribute('data-filename')) {
        filename = cardElement.getAttribute('data-filename');
        console.log('[Jellyfin Extension] Retrieved data-filename from card:', itemId, filename);
      } else {
        console.warn('[Jellyfin Extension] data-filename not found on card:', itemId);
      }
      if (cardElement.hasAttribute('data-size')) {
        fileSize = cardElement.getAttribute('data-size');
        console.log('[Jellyfin Extension] Retrieved data-size from card:', itemId, fileSize);
      } else {
        console.warn('[Jellyfin Extension] data-size not found on card:', itemId);
      }
    } else {
      console.warn('[Jellyfin Extension] Card element not found for itemId:', itemId);
    }
    let deleteMessage = `Delete Item\n\n`;
    if (filename) {
      deleteMessage += `Filename: ${filename}\n`;
    }
    if (fileSize) {
      deleteMessage += `Size: ${fileSize}\n`;
    }
    deleteMessage += `\nDeleting this item will delete it from both the file system and your media library. Are you sure you wish to continue?`;
    
    const userConfirmed = confirm(deleteMessage);
    
    if (userConfirmed) {
      console.log('[Jellyfin Extension] User confirmed deletion, executing delete');
      executeDelete(itemId);
    } else {
      console.log('[Jellyfin Extension] User cancelled deletion');
    }
      
  }).catch(error => {
    console.error('[Jellyfin Extension] Failed to get item details:', error);
    // Show dialog with basic info even if API fails
    const fallbackMessage = `Delete Item\n\nTitle: Unknown Title\nFilename: Unable to retrieve filename\nPath: Unable to retrieve path\n\nDeleting this item will delete it from both the file system and your media library. Are you sure you wish to continue?`;
    
    const userConfirmed = confirm(fallbackMessage);
    if (userConfirmed) {
      executeDelete(itemId);
    }
  });
}

// Function to execute the actual delete operation
function executeDelete(itemId) {
  console.log('[Jellyfin Extension] Executing delete for item:', itemId);
  
  try {
    // Direct HTTP DELETE to Jellyfin API
    const baseUrl = extractBaseUrl();
    const token = extractAccessToken();
    if (!baseUrl || !token) {
      fallbackDelete(itemId, 'Missing server URL or API token.');
      return;
    }
    const url = `${baseUrl}/Items/${itemId}`;
    console.log('[Jellyfin Extension] Sending DELETE request to:', url);
    fetch(url, {
      method: 'DELETE',
      headers: {
        'X-Emby-Token': token,
        'Content-Type': 'application/json'
      }
    }).then(response => {
      if (response.ok) {
        console.log('[Jellyfin Extension] Delete successful via direct API');
        alert('Item deleted successfully.');
        window.location.reload();
      } else {
        response.text().then(text => {
          console.error('[Jellyfin Extension] API delete failed:', response.status, text);
          fallbackDelete(itemId, `API delete failed: ${response.status} ${text}`);
        });
      }
    }).catch(error => {
      console.error('[Jellyfin Extension] API delete request error:', error);
      fallbackDelete(itemId, 'API delete request error: ' + error);
    });
  } catch (error) {
    console.error('[Jellyfin Extension] Error executing delete:', error);
    fallbackDelete(itemId, 'Exception in executeDelete: ' + error);
  }
}

// Function to trigger native delete without showing dialog
function triggerNativeDeleteWithoutDialog(itemId) {
  try {
    // Override confirm to automatically return true for delete operations
    const originalConfirm = window.confirm;
    let confirmed = false;
    
    window.confirm = function(message) {
      console.log('[Jellyfin Extension] Auto-confirming delete message:', message);
      // Restore original immediately
      window.confirm = originalConfirm;
      confirmed = true;
      return true;
    };
    
    // Set timeout to restore confirm function as safety
    setTimeout(() => {
      window.confirm = originalConfirm;
    }, 1000);
    
    const result = triggerNativeDeleteProcess(itemId);
    return result && confirmed;
  } catch (error) {
    console.error('[Jellyfin Extension] Error in triggerNativeDeleteWithoutDialog:', error);
    return false;
  }
}

// Fallback delete function
function fallbackDelete(itemId, reason) {
  console.log('[Jellyfin Extension] Fallback delete for:', itemId, 'Reason:', reason);
  alert('Unable to delete item automatically. Reason: ' + (reason || 'Unknown') + '\nPlease use Jellyfin\'s native delete option from the more menu (⋮).');
}

// Separate function to handle the native delete process triggering
function triggerNativeDeleteProcess(itemId) {
  try {
    // Method 1: Look for the card's more button and simulate click
    const cardElement = document.querySelector(`[data-id="${itemId}"]`);
    if (cardElement) {
      console.log('[Jellyfin Extension] Found card element:', cardElement);
      
      // Try different selectors for the more button
      const moreButtonSelectors = [
        '.btnCardMoreOptions',
        '.cardMoreButton', 
        '.btnCardMore',
        '.card-more-button',
        '[data-action="menu"]',
        '.material-icons[title="More"]',
        '.md-icon-button[title="More"]',
        'button[title="More"]',
        '.more-vert',
        '.mdi-dots-vertical'
      ];
      
      let moreButton = null;
      for (const selector of moreButtonSelectors) {
        moreButton = cardElement.querySelector(selector);
        if (moreButton) {
          console.log('[Jellyfin Extension] Found more button with selector:', selector, moreButton);
          break;
        }
      }
      
      if (moreButton) {
        // Create a custom event to trigger the menu
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        moreButton.dispatchEvent(clickEvent);
        console.log('[Jellyfin Extension] Clicked more button');
        
        // Wait for menu to appear and look for delete option
        const deleteSelectors = [
          '[data-action="delete"]',
          '.menuItem[data-action="delete"]',
          '.listItem[data-action="delete"]',
          '.contextMenuItem[data-action="delete"]',
          '.menu-item[data-action="delete"]',
          '.deleteItem',
          '.btnDelete',
          'button[data-action="delete"]',
          'li[data-action="delete"]',
          'a[data-action="delete"]',
          '.md-icon-button[title*="Delete"]',
          '.material-icons[title*="Delete"]',
          'button[title*="Delete"]',
          '.mdi-delete',
          '.icon-delete',
          '.delete',
        ];

        let attempts = 0;
        const maxAttempts = 5;
        const delay = 400;

        function tryFindDeleteOption() {
          attempts++;
          let deleteOption = null;
          for (const selector of deleteSelectors) {
            deleteOption = document.querySelector(selector);
            if (deleteOption) {
              console.log('[Jellyfin Extension] Found delete option with selector:', selector, deleteOption);
              break;
            }
          }
          if (!deleteOption) {
            // Try to find by text content
            const allMenuItems = document.querySelectorAll('.menuItem, .listItem, .contextMenuItem, .menu-item, [role="menuitem"], li, a, button');
            for (const item of allMenuItems) {
              const text = item.textContent?.toLowerCase() || '';
              if (text.includes('delete') || text.includes('remove') || text.includes('trash')) {
                deleteOption = item;
                console.log('[Jellyfin Extension] Found delete option by text:', item);
                break;
              }
            }
          }
          if (deleteOption) {
            const deleteClickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            deleteOption.dispatchEvent(deleteClickEvent);
            console.log('[Jellyfin Extension] Clicked delete option');
            return true;
          } else {
            console.log(`[Jellyfin Extension] Delete option not found in menu (attempt ${attempts}/${maxAttempts})`);
            if (attempts < maxAttempts) {
              setTimeout(tryFindDeleteOption, delay);
            } else {
              console.log('[Jellyfin Extension] Giving up after max attempts');
              return false;
            }
          }
        }
        setTimeout(tryFindDeleteOption, delay);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('[Jellyfin Extension] Error in triggerNativeDeleteProcess:', error);
    return false;
  }
}

// Get item details for showing in dialog
async function getItemDetailsForDialog(itemId) {
  console.log('[Jellyfin Extension] Getting item details for:', itemId);
  
  try {
    // Try multiple methods to get the item details
  // item will be assigned below
    
    // Method 1: Use the extension's API client if available
    // Try extension API client first
    let item = null;
    if (window.JellyfinExtension && window.JellyfinExtension.apiClient) {
      console.log('[Jellyfin Extension] Trying extension API client');
      const { fetchItemDetails } = window.JellyfinExtension.apiClient;
      const baseUrl = extractBaseUrl();
      const token = extractAccessToken();
      if (baseUrl && token) {
        console.log('[Jellyfin Extension] Using baseUrl:', baseUrl, 'token available:', !!token);
        item = await fetchItemDetails(itemId, {
          baseUrl,
          token,
          fields: [
            'Path', 'MediaSources', 'Name', 'FileName', 'Container', 'OriginalTitle', 'Size', 'Type', 'Overview', 'PremiereDate', 'ProductionYear', 'IsFolder'
          ]
        });
        console.log('[Jellyfin Extension] Got item from extension API:', item);
      }
    }
    // If extension API fails, try native API client
    if ((!item || (!item.Path && (!Array.isArray(item.MediaSources) || item.MediaSources.length === 0))) && window.ApiClient) {
      console.log('[Jellyfin Extension] Trying native ApiClient');
      try {
        item = await window.ApiClient.getItem(window.ApiClient.getCurrentUserId(), itemId);
        console.log('[Jellyfin Extension] Got item from native API:', item);
      } catch (apiError) {
        console.log('[Jellyfin Extension] Native API failed:', apiError);
      }
    }
    // Only fall back to card content if API result is truly missing or invalid
    if (!item || (!item.Path && (!Array.isArray(item.MediaSources) || item.MediaSources.length === 0))) {
      console.log('[Jellyfin Extension] API result missing key fields, falling back to card content');
      const cardElement = document.querySelector(`[data-id="${itemId}"]`);
      if (cardElement) {
        const titleElement = cardElement.querySelector('.cardText-first, .cardTitle, .itemName, h3, .primary');
        const title = titleElement ? titleElement.textContent.trim() : 'Unknown Title';
        item = {
          Name: title,
          Path: null,
          MediaSources: null
        };
        console.log('[Jellyfin Extension] Extracted title from card:', item);
      }
    }
    
    if (!item) {
      throw new Error('Could not retrieve item details from any source');
    }
    
    // Extract the information we need from the API data
    let filename = 'Unknown file';
    let path = 'Unknown path';
    let mediaSource = Array.isArray(item.MediaSources) ? item.MediaSources[0] : null;
    
    // Prefer item.Path, then mediaSource.Path
    if (item.Path && typeof item.Path === 'string') {
      path = item.Path;
      const parts = item.Path.split(/[/\\]/);
      filename = parts[parts.length - 1] || 'Unknown file';
      console.log('[Jellyfin Extension] Using item.Path:', path);
      console.log('[Jellyfin Extension] Extracted filename from item.Path:', filename);
    } else if (mediaSource && mediaSource.Path && typeof mediaSource.Path === 'string') {
      path = mediaSource.Path;
      const parts = mediaSource.Path.split(/[/\\]/);
      filename = parts[parts.length - 1] || 'Unknown file';
      console.log('[Jellyfin Extension] Using mediaSource.Path:', path);
      console.log('[Jellyfin Extension] Extracted filename from mediaSource.Path:', filename);
    } else if (mediaSource && mediaSource.Name && typeof mediaSource.Name === 'string') {
      filename = mediaSource.Name;
      console.log('[Jellyfin Extension] Using mediaSource.Name:', filename);
    } else {
      path = `No path information available for ${item.Name || 'this item'}`;
      console.log('[Jellyfin Extension] No path available, using fallback');
    }
    
    // Clean up the title to remove 'Delete' and 'Identify'
    let rawTitle = (item.Name || item.OriginalTitle || 'Unknown Title').replace(/Delete|Identify/gi, '').trim();
    // Improved regex: split at first ' • ' or at first size/resolution/language/SDR/HDR
    let mediaTitle = rawTitle;
    let extraAttrs = '';
    // Try to split at first ' • '
    const dotSplit = rawTitle.split(/\s*•\s*/);
    if (dotSplit.length > 1) {
      mediaTitle = dotSplit[0].trim();
      extraAttrs = dotSplit.slice(1).join(' • ').trim();
    } else {
      // Fallback: split at first size/resolution/language/SDR/HDR
      const attrMatch = rawTitle.match(/^(.+?)(\d+\.\d+\s*(MB|GB|KB)|\d{3,4}×\d{3,4}|SDR|HDR|English|Japanese|Chinese|French|German|Spanish)/i);
      if (attrMatch) {
        mediaTitle = attrMatch[1].trim();
        extraAttrs = rawTitle.substring(mediaTitle.length).trim();
      }
    }
    const result = {
      title: mediaTitle,
      extraAttrs: extraAttrs,
      filename: filename,
      path: path
    };
    console.log('[Jellyfin Extension] Final item details:', result);
    return result;
    
  } catch (error) {
    console.error('[Jellyfin Extension] Error getting item details:', error);
    
    // Only use card content for title as a last resort, never for filename/path
    let fallbackTitle = 'Unknown Title';
    try {
      const cardElement = document.querySelector(`[data-id="${itemId}"]`);
      if (cardElement) {
        // Try to find the main title element only
        const titleElement = cardElement.querySelector('.cardText-first, .cardTitle, .itemName, h3, .primary');
        if (titleElement) {
          fallbackTitle = titleElement.textContent.trim();
          // Remove any attribute, button, or extra info
          fallbackTitle = fallbackTitle.replace(/(\d+\.\d+\s*(MB|GB|KB)|\d{3,4}×\d{3,4}|SDR|HDR|Delete|Identify|•|\s*\u2022\s*|\n.*)/g, '').trim();
        }
      }
    } catch (titleError) {
      console.error('[Jellyfin Extension] Failed to extract fallback title:', titleError);
    }
    // Never use card content for filename or path
    return {
      title: fallbackTitle,
      filename: 'Unable to retrieve filename',
      path: 'Unable to retrieve file path'
    };
  }
}

// Helper function to extract base URL
function extractBaseUrl() {
  try {
    let apiUrl = null;
    if (window.ApiClient && typeof window.ApiClient.serverAddress === 'function') {
      apiUrl = window.ApiClient.serverAddress();
  // ...removed debug log...
      if (apiUrl) return apiUrl;
    }
    if (window.JellyfinExtension && window.JellyfinExtension.apiClient && window.JellyfinExtension.apiClient.baseUrl) {
      apiUrl = window.JellyfinExtension.apiClient.baseUrl;
  // ...removed debug log...
      if (apiUrl) return apiUrl;
    }
    const currentUrl = window.location.href;
    const match = currentUrl.match(/^(https?:\/\/[^\/]+)/);
    if (match) {
      apiUrl = match[1];
  // ...removed debug log...
      return apiUrl;
    }
    if (window.JellyfinConfig && window.JellyfinConfig.serverUrl) {
      apiUrl = window.JellyfinConfig.serverUrl;
  // ...removed debug log...
      if (apiUrl) return apiUrl;
    }
  // ...removed debug log...
    return null;
  } catch (error) {
    console.error('[Jellyfin Extension] Error extracting baseUrl:', error);
    return null;
  }
}

// Helper function to extract access token
function extractAccessToken() {
  try {
    // Use the same logic as apiClient.js
    if (window.JellyfinExtension && window.JellyfinExtension.apiClient && typeof window.JellyfinExtension.apiClient.fetchItemDetails === 'function') {
      try {
        // Reuse the internal function if exposed
        if (window.JellyfinExtension.apiClient.getAccessTokenFromLocalStorage) {
          const token = window.JellyfinExtension.apiClient.getAccessTokenFromLocalStorage();
          // ...removed debug log...
          if (token) return token;
        }
      } catch (e) {
        // fallback below
      }
    }
    // Directly copy the logic from apiClient.js
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      if (!value) continue;
      try {
        const json = JSON.parse(value);
        if (json.AccessToken) {
          // ...removed debug log...
          return json.AccessToken;
        }
        if (json.Servers && Array.isArray(json.Servers)) {
          for (const server of json.Servers) {
            if (server.AccessToken) {
              // ...removed debug log...
              return server.AccessToken;
            }
          }
        }
      } catch (e) {
        // Not JSON, skip
      }
    }
  // ...removed debug log...
    return null;
  } catch (error) {
    console.error('[Jellyfin Extension] Error extracting token:', error);
    return null;
  }
}

// Trigger Jellyfin's native identify dialog
function triggerIdentifyDialog(itemId) {
  console.log('[Jellyfin Extension] Triggering identify dialog for item:', itemId);
  
  try {
    // Method 1: Look for the card's more button and simulate click
    const cardElement = document.querySelector(`[data-id="${itemId}"]`);
    if (cardElement) {
      console.log('[Jellyfin Extension] Found card element:', cardElement);
      
      // Try different selectors for the more button
      const moreButtonSelectors = [
        '.btnCardMoreOptions',
        '.cardMoreButton',
        '.btnCardMore',
        '.card-more-button',
        '[data-action="menu"]',
        '.material-icons[title="More"]',
        '.md-icon-button[title="More"]',
        'button[title="More"]',
        '.more-vert',
        '.mdi-dots-vertical'
      ];
      
      let moreButton = null;
      for (const selector of moreButtonSelectors) {
        moreButton = cardElement.querySelector(selector);
        if (moreButton) {
          console.log('[Jellyfin Extension] Found more button with selector:', selector, moreButton);
          break;
        }
      }
      
      if (moreButton) {
        // Create a custom event to trigger the menu
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        moreButton.dispatchEvent(clickEvent);
        console.log('[Jellyfin Extension] Clicked more button');
        
        // Wait for menu to appear and look for identify option
        setTimeout(() => {
          const identifySelectors = [
            '[data-action="identify"]',
            '.menuItem[data-action="identify"]',
            '.listItem[data-action="identify"]',
            '.contextMenuItem[data-action="identify"]',
            '.menu-item[data-action="identify"]',
            '.identifyItem',
            '.btnIdentify'
          ];
          
          let identifyOption = null;
          for (const selector of identifySelectors) {
            identifyOption = document.querySelector(selector);
            if (identifyOption) {
              console.log('[Jellyfin Extension] Found identify option with selector:', selector, identifyOption);
              break;
            }
          }
          
          if (!identifyOption) {
            // Try to find by text content
            const allMenuItems = document.querySelectorAll('.menuItem, .listItem, .contextMenuItem, .menu-item, [role="menuitem"]');
            for (const item of allMenuItems) {
              const text = item.textContent?.toLowerCase() || '';
              if (text.includes('identify') || text.includes('edit metadata')) {
                identifyOption = item;
                console.log('[Jellyfin Extension] Found identify option by text:', item);
                break;
              }
            }
          }
          
          if (identifyOption) {
            const identifyClickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            identifyOption.dispatchEvent(identifyClickEvent);
            console.log('[Jellyfin Extension] Clicked identify option');
          } else {
            console.log('[Jellyfin Extension] Identify option not found in menu');
            showFallbackInstructions('identify');
          }
        }, 300);
        return;
      }
    }
    
    // Method 2: Try to use Jellyfin's router to navigate to identify page
    if (window.Emby && window.Emby.Page) {
      const identifyUrl = `#!/itemidentifier.html?id=${itemId}`;
      console.log('[Jellyfin Extension] Trying to navigate to:', identifyUrl);
      window.Emby.Page.show(identifyUrl);
      return;
    }
    
    // Method 3: Try direct URL navigation
    const currentUrl = window.location.href;
    const baseUrl = currentUrl.split('/web/')[0];
    const identifyUrl = `${baseUrl}/web/index.html#!/itemidentifier.html?id=${itemId}`;
    console.log('[Jellyfin Extension] Navigating to identify URL:', identifyUrl);
    window.location.href = identifyUrl;
    return;
    
  } catch (error) {
    console.error('[Jellyfin Extension] Error in triggerIdentifyDialog:', error);
    showFallbackInstructions('identify');
  }
}

// Debug helper to inspect card structure
function debugCardStructure(itemId) {
  const cardElement = document.querySelector(`[data-id="${itemId}"]`);
  if (cardElement) {
    console.log('[Jellyfin Extension] Card HTML structure:', cardElement.outerHTML);
    console.log('[Jellyfin Extension] Card children:', Array.from(cardElement.children));
    
    // Look for all buttons in the card
    const buttons = cardElement.querySelectorAll('button, .btn, [role="button"]');
    console.log('[Jellyfin Extension] Found buttons in card:', buttons);
    
    buttons.forEach((btn, i) => {
      console.log(`[Jellyfin Extension] Button ${i}:`, {
        element: btn,
        classes: btn.className,
        title: btn.title,
        textContent: btn.textContent,
        dataset: btn.dataset
      });
    });
  }
}

// Show fallback instructions
function showFallbackInstructions(action) {
  const actionText = action === 'delete' ? 'delete this item' : 'identify this item';
  const instructions = `To ${actionText}:\n\n` +
    `1. Look for the three-dot menu button (⋮) on the movie card\n` +
    `2. Click it to open the context menu\n` +
    `3. Select "${action === 'delete' ? 'Delete' : 'Identify'}" from the menu\n\n` +
    `Alternatively, right-click on the movie card and select the option from the context menu.`;
  
  alert(instructions);
}

// Export to global scope for browser use
window.JellyfinExtension = window.JellyfinExtension || {};
window.JellyfinExtension.cardEnhancer = { 
  findMovieCards, 
  formatFileSize, 
  buildAttributesList, 
  addAttributesToCard, 
  addActionButtonsToCard,
  triggerDeleteDialog,
  triggerIdentifyDialog,
  triggerNativeDeleteProcess,
  debugCardStructure,
  getItemDetailsForDialog,
  executeDelete,
  triggerNativeDeleteWithoutDialog,
  fallbackDelete,
  extractBaseUrl,
  extractAccessToken
};

// Export for Node.js/Jest
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    findMovieCards,
    formatFileSize,
    buildAttributesList,
    addAttributesToCard,
    addActionButtonsToCard,
    triggerDeleteDialog,
    triggerIdentifyDialog,
    triggerNativeDeleteProcess,
    debugCardStructure,
    getItemDetailsForDialog,
    executeDelete,
    triggerNativeDeleteWithoutDialog,
    fallbackDelete,
    extractBaseUrl,
    extractAccessToken
  };
}
