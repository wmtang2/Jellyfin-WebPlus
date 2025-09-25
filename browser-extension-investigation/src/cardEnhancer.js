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
function addAttributesToCard(cardEl, attributes) {
  if (!cardEl || !Array.isArray(attributes) || attributes.length === 0) return false;
  const cardText = cardEl.querySelector('.cardText');
  if (!cardText) return false;
  if (cardText.querySelector('.movie-attributes')) return false; // prevent duplication

  // Separate attributes into filename, resolution/HDR, and others
  let filename = null;
  let resolutionHdr = [];
  let others = [];
  const hdrKeywords = ['SDR', 'HDR', 'HDR10', 'HLG', 'Dolby Vision'];
  const resolutionRegex = /^\d{3,5}×\d{3,5}$/;

  if (attributes.length > 0) {
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (attr.includes('.') && !attr.includes(' ')) {
        filename = attr;
      } else if (resolutionRegex.test(attr) || hdrKeywords.some(k => attr === k)) {
        resolutionHdr.push(attr);
      } else {
        others.push(attr);
      }
    }
  }

  // Create filename line
  if (filename) {
    const filenameDiv = document.createElement('div');
    filenameDiv.className = 'cardText-secondary movie-attributes movie-attributes-filename';
    filenameDiv.textContent = filename;
    cardText.appendChild(filenameDiv);
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

// Export to global scope for browser use
window.JellyfinExtension = window.JellyfinExtension || {};
window.JellyfinExtension.cardEnhancer = { findMovieCards, formatFileSize, buildAttributesList, addAttributesToCard };

// ...more logic to be added via TDD
