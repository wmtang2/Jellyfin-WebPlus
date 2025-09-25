// src/apiClient.js
// Lightweight Jellyfin item details fetcher with in-memory cache.

const cache = new Map(); // key -> Promise or resolved object

function makeCacheKey(id, fields) {
  const f = Array.isArray(fields) ? [...fields].sort().join(',') : '';
  return id + '|' + f;
}


function getAccessTokenFromLocalStorage() {
  // Search all localStorage keys for a value containing AccessToken
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    if (!value) continue;
    try {
      const json = JSON.parse(value);
      // Direct AccessToken
      if (json.AccessToken) {
        return json.AccessToken;
      }
      // Jellyfin stores credentials under Servers array
      if (json.Servers && Array.isArray(json.Servers)) {
        for (const server of json.Servers) {
          if (server.AccessToken) {
            return server.AccessToken;
          }
        }
      }
    } catch (e) {
      // Not JSON, skip
    }
  }
  throw new Error('No AccessToken found in localStorage');
}

async function fetchItemDetails(itemId, options) {
  if (!itemId) throw new Error('itemId required');
  if (!options) throw new Error('options required');
  const { baseUrl, token, fields, forceRefresh, fetchImpl } = options;
  if (!baseUrl) throw new Error('baseUrl required');
  const fetchFn = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  const accessToken = getAccessTokenFromLocalStorage();
  if (!accessToken) {
    throw new Error('No AccessToken found in localStorage');
  }
  if (!fetchFn) throw new Error('No fetch implementation available');

  const key = makeCacheKey(itemId, fields);
  if (!forceRefresh && cache.has(key)) {
    return cache.get(key);
  }

  // Build query params
  const params = new URLSearchParams();
  if (Array.isArray(fields) && fields.length) {
    params.set('Fields', fields.join(','));
  }
  let url = baseUrl.replace(/\/$/, '') + '/Items/' + encodeURIComponent(itemId);
  let query = params.toString();
  if (query) {
    query += `&api_key=${accessToken}`;
  } else {
    query = `api_key=${accessToken}`;
  }
  url += `?${query}`;

  const headers = {};
  if (token) headers['X-Emby-Token'] = token; // Jellyfin compatibility

  const p = (async () => {
    const res = await fetchFn(url, { headers });
    if (!res.ok) throw new Error('Fetch failed with status ' + res.status);
    const data = await res.json();
    // Normalize structure we rely on
    if (!Array.isArray(data.MediaSources)) data.MediaSources = [];
    return data;
  })();

  cache.set(key, p);
  try {
    const resolved = await p;
    cache.set(key, resolved); // store resolved object (avoid re-await by future callers)
    return resolved;
  } catch (e) {
    cache.delete(key); // don't retain failed promise
    throw e;
  }
}


function __resetCache() { cache.clear(); }


// Export to global scope for browser use
window.JellyfinExtension = window.JellyfinExtension || {};
window.JellyfinExtension.apiClient = { fetchItemDetails, __resetCache };
