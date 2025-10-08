// src/settings.js
// Simple in-memory settings store with change listeners and browser storage persistence.

const STORAGE_KEY = 'movieAttributesSettings';

const defaultSettings = Object.freeze({
  showFileSize: true,
  showFileName: true,
  showContainer: true,
  showResolution: true,
  showHDR: true,
  showAudioLanguage: true,
  showDeleteButton: false,
  showIdentifyButton: false
});

let current = { ...defaultSettings };
let isStorageAvailable = false;
const listeners = new Set();

// Check if browser storage is available
try {
  isStorageAvailable = typeof browser !== 'undefined' && browser.storage && browser.storage.local;
} catch (e) {
  isStorageAvailable = false;
}

function getSettings() {
  return current;
}

function updateSettings(patch) {
  if (!patch || typeof patch !== 'object') return;
  const next = { ...current, ...patch };
  // Only notify if something changed shallowly
  let changed = false;
  for (const k of Object.keys(next)) {
    if (next[k] !== current[k]) { changed = true; break; }
  }
  if (!changed) return;
  current = next;
  
  // Save to storage asynchronously (fire and forget)
  if (isStorageAvailable) {
    browser.storage.local.set({ [STORAGE_KEY]: current }).catch(error => {
      console.error('Failed to save settings to storage:', error);
    });
  }
  
  for (const cb of listeners) {
    try { cb(current); } catch (_) { /* ignore */ }
  }
}

function onChange(cb) {
  if (typeof cb === 'function') listeners.add(cb);
  return () => listeners.delete(cb);
}

// Load settings from storage asynchronously
async function loadSettingsFromStorage() {
  if (!isStorageAvailable) return;
  
  try {
    const result = await browser.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY];
    if (stored && typeof stored === 'object') {
      // Merge with defaults to handle missing keys
      current = { ...defaultSettings, ...stored };
      // Notify listeners of the loaded settings
      for (const cb of listeners) {
        try { cb(current); } catch (_) { /* ignore */ }
      }
    }
  } catch (error) {
    console.error('Failed to load settings from storage:', error);
  }
}

// Listen for storage changes from other contexts (like options page)
function initStorageListener() {
  if (!isStorageAvailable) return;
  
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEY]) {
      const newSettings = changes[STORAGE_KEY].newValue;
      if (newSettings && typeof newSettings === 'object') {
        current = { ...defaultSettings, ...newSettings };
        // Notify listeners of the external change
        for (const cb of listeners) {
          try { cb(current); } catch (_) { /* ignore */ }
        }
      }
    }
  });
}

function __resetSettings() {
  current = { ...defaultSettings };
  listeners.clear();
}

// Export to global scope for browser use
window.JellyfinExtension = window.JellyfinExtension || {};
window.JellyfinExtension.settings = { 
  getSettings, 
  updateSettings, 
  onChange, 
  loadSettingsFromStorage,
  initStorageListener,
  __resetSettings, 
  defaultSettings 
};
