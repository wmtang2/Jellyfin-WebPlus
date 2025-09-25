// tests/options.test.js
// Test the options page functionality

/**
 * @jest-environment jsdom
 */

// Mock browser API for options page
Object.defineProperty(global, 'browser', {
  value: {
    storage: {
      local: {
        get: jest.fn(),
        set: jest.fn()
      }
    }
  },
  writable: true
});

describe('options page functionality', () => {
  let optionsScript;
  
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div class="option-group">
        <div class="checkbox-row">
          <input type="checkbox" id="showFileSize">
          <label for="showFileSize">Show file size</label>
        </div>
        <div class="checkbox-row">
          <input type="checkbox" id="showFileName">
          <label for="showFileName">Show filename</label>
        </div>
        <div class="checkbox-row">
          <input type="checkbox" id="showContainer">
          <label for="showContainer">Show container format</label>
        </div>
        <div class="checkbox-row">
          <input type="checkbox" id="showResolution">
          <label for="showResolution">Show resolution</label>
        </div>
        <div class="checkbox-row">
          <input type="checkbox" id="showHDR">
          <label for="showHDR">Show HDR/SDR status</label>
        </div>
        <div class="checkbox-row">
          <input type="checkbox" id="showAudioLanguage">
          <label for="showAudioLanguage">Show audio language</label>
        </div>
      </div>
      <div class="status" id="status"></div>
    `;
    
    // Reset mocks
    jest.resetAllMocks();
    
    // Mock successful storage operations
    global.browser.storage.local.get.mockResolvedValue({
      movieAttributesSettings: {
        showFileSize: true,
        showFileName: false,
        showContainer: true,
        showResolution: false,
        showHDR: true,
        showAudioLanguage: false
      }
    });
    global.browser.storage.local.set.mockResolvedValue();
  });
  
  test('should load settings from storage and update checkboxes', async () => {
    // Load the options script content
    const fs = require('fs');
    const path = require('path');
    const optionsPath = path.join(__dirname, '..', 'options.js');
    const optionsContent = fs.readFileSync(optionsPath, 'utf8');
    
    // Execute the relevant functions
    eval(optionsContent.replace('document.addEventListener(\'DOMContentLoaded\', async () => {', '(async () => {').replace(/}\);$/, '})();'));
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(global.browser.storage.local.get).toHaveBeenCalledWith('movieAttributesSettings');
    expect(document.getElementById('showFileSize').checked).toBe(true);
    expect(document.getElementById('showFileName').checked).toBe(false);
    expect(document.getElementById('showContainer').checked).toBe(true);
    expect(document.getElementById('showResolution').checked).toBe(false);
    expect(document.getElementById('showHDR').checked).toBe(true);
    expect(document.getElementById('showAudioLanguage').checked).toBe(false);
  });
  
  test('should save settings to storage when checkboxes change', async () => {
    // Load and execute options script
    const fs = require('fs');
    const path = require('path');
    const optionsPath = path.join(__dirname, '..', 'options.js');
    const optionsContent = fs.readFileSync(optionsPath, 'utf8');
    
    // Execute the initialization part
    eval(optionsContent.replace('document.addEventListener(\'DOMContentLoaded\', async () => {', '(async () => {').replace(/}\);$/, '})();'));
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Simulate checkbox change
    document.getElementById('showFileName').checked = true;
    const changeEvent = new Event('change');
    document.getElementById('showFileName').dispatchEvent(changeEvent);
    
    // Wait for async save
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(global.browser.storage.local.set).toHaveBeenCalledWith({
      movieAttributesSettings: {
        showFileSize: true,
        showFileName: true,
        showContainer: true,
        showResolution: false,
        showHDR: true,
        showAudioLanguage: false
      }
    });
  });
  
  test('should handle storage errors gracefully', async () => {
    // Mock storage failure
    global.browser.storage.local.get.mockRejectedValue(new Error('Storage error'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Load and execute options script
    const fs = require('fs');
    const path = require('path');
    const optionsPath = path.join(__dirname, '..', 'options.js');
    const optionsContent = fs.readFileSync(optionsPath, 'utf8');
    
    eval(optionsContent.replace('document.addEventListener(\'DOMContentLoaded\', async () => {', '(async () => {').replace(/}\);$/, '})();'));
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load settings:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });
});