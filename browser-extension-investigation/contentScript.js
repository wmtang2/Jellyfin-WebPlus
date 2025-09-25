// contentScript.js
// Entry point injected into Jellyfin pages.

// Attempt to derive baseUrl from location (strip trailing /web or path segments).
function inferBaseUrl() {
  try {
    const { origin, pathname } = window.location;
    // Jellyfin often serves at /web/ ; ascend until not ending with /web
    if (pathname.includes('/web')) {
      return origin; // API base generally at origin
    }
    return origin;
  } catch (_) {
    return window.location.origin;
  }
}

(async function init() {
  // Wait for all modules to be loaded
  if (!window.JellyfinExtension || !window.JellyfinExtension.settings) {
    console.log('[Jellyfin Extension] Waiting for modules to load...');
    setTimeout(init, 100);
    return;
  }
  
  console.log('[Jellyfin Extension] Modules loaded, initializing...');
  
  const { startEnhancerLoop } = window.JellyfinExtension.observer;
  const { getSettings, onChange, loadSettingsFromStorage, initStorageListener } = window.JellyfinExtension.settings;
  const { reEnhanceCards } = window.JellyfinExtension.reEnhancer;
  
  // Initialize storage systems
  await loadSettingsFromStorage();
  initStorageListener();
  
  const baseUrl = inferBaseUrl();
  const token = null; // Future enhancement: extract from localStorage or an auth header
  const settings = getSettings();
  
  console.log('[Jellyfin Extension] Configuration:', { baseUrl, settings });
  
  // Clear any previous enhancement markers to ensure fresh start
  const existingEnhanced = document.querySelectorAll('[data-enhanced], [data-enhanced-error]');
  console.log('[Jellyfin Extension] Clearing', existingEnhanced.length, 'previously enhanced cards');
  existingEnhanced.forEach(card => {
    card.removeAttribute('data-enhanced');
    card.removeAttribute('data-enhanced-error');
    // Also remove any existing movie-attributes divs
    const existingAttrs = card.querySelector('.movie-attributes');
    if (existingAttrs) existingAttrs.remove();
  });
  
  startEnhancerLoop({ baseUrl, token, options: settings });

  onChange(() => {
    // Re-enhance with new settings; rely on existing enhanced markers
    console.log('[Jellyfin Extension] Settings changed, re-enhancing cards');
    reEnhanceCards({ baseUrl, token });
  });
  
  console.log('[Jellyfin Extension] Initialization complete');
})();
