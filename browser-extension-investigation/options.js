// options.js
// Options page script for managing extension settings

const STORAGE_KEY = 'movieAttributesSettings';

const defaultSettings = {
  showFileSize: true,
  showFileName: true,
  showContainer: true,
  showResolution: true,
  showHDR: true,
  showAudioLanguage: true,
  showDeleteButton: false,
  showIdentifyButton: false
};

// Load settings from storage and update UI
async function loadSettings() {
  try {
    const result = await browser.storage.local.get(STORAGE_KEY);
    const settings = result[STORAGE_KEY] || defaultSettings;
    
    // Update checkboxes
    document.getElementById('showFileSize').checked = settings.showFileSize;
    document.getElementById('showFileName').checked = settings.showFileName;
    document.getElementById('showContainer').checked = settings.showContainer;
    document.getElementById('showResolution').checked = settings.showResolution;
    document.getElementById('showHDR').checked = settings.showHDR;
    document.getElementById('showAudioLanguage').checked = settings.showAudioLanguage;
    document.getElementById('showDeleteButton').checked = settings.showDeleteButton;
    document.getElementById('showIdentifyButton').checked = settings.showIdentifyButton;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Save settings to storage
async function saveSettings() {
  try {
    const settings = {
      showFileSize: document.getElementById('showFileSize').checked,
      showFileName: document.getElementById('showFileName').checked,
      showContainer: document.getElementById('showContainer').checked,
      showResolution: document.getElementById('showResolution').checked,
      showHDR: document.getElementById('showHDR').checked,
      showAudioLanguage: document.getElementById('showAudioLanguage').checked,
      showDeleteButton: document.getElementById('showDeleteButton').checked,
      showIdentifyButton: document.getElementById('showIdentifyButton').checked
    };
    
    await browser.storage.local.set({ [STORAGE_KEY]: settings });
    showStatus('Settings saved successfully!');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('Failed to save settings', 'error');
  }
}

// Show status message
function showStatus(message, type = 'success') {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status show ${type}`;
  
  setTimeout(() => {
    status.classList.remove('show');
  }, 2000);
}

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  
  // Add change listeners to all checkboxes
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', saveSettings);
  });
});