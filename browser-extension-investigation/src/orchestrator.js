// src/orchestrator.js
// Orchestrates discovering movie cards, fetching details, and injecting attributes.

// Use global exports instead of require

async function enhanceMovieCards(config) {
  const { baseUrl, token, options = {}, fields = ['Path', 'MediaSources'] } = config || {};
  if (!baseUrl) throw new Error('baseUrl required');
  const { findMovieCards, buildAttributesList, addAttributesToCard } = window.JellyfinExtension.cardEnhancer;
  const cards = findMovieCards();
  let enhancedCount = 0;
  const work = [];
  
  console.log('[Jellyfin Extension] Starting enhancement for', cards.length, 'cards with options:', options);
  
  // Log first few cards to see their current state
  cards.slice(0, 3).forEach((card, i) => {
    console.log(`[Jellyfin Extension] Card ${i} attributes:`, {
      id: card.getAttribute('data-id'),
      type: card.getAttribute('data-type'),
      enhanced: card.getAttribute('data-enhanced'),
      error: card.getAttribute('data-enhanced-error'),
      hasMovieAttributes: !!card.querySelector('.movie-attributes')
    });
  });

  for (const card of cards) {
    const enhanced = card.getAttribute('data-enhanced');
    const error = card.getAttribute('data-enhanced-error');
    const already = enhanced === '1' || error === '1';
    
    if (already) {
      console.log('[Jellyfin Extension] Skipping already enhanced card - enhanced:', enhanced, 'error:', error);
      continue;
    }
    
    const id = card.getAttribute('data-id');
    if (!id) {
      console.log('[Jellyfin Extension] Skipping card without data-id, attributes:', {
        class: card.className,
        dataType: card.getAttribute('data-type'),
        allAttributes: Array.from(card.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', ')
      });
      continue;
    }
    console.log('[Jellyfin Extension] Processing card with id:', id);
    work.push(processCard(card, id));
  }

  async function processCard(card, id) {
    try {
      console.log('[Jellyfin Extension] Fetching details for card:', id);
      const { fetchItemDetails } = window.JellyfinExtension.apiClient;
      const item = await fetchItemDetails(id, { baseUrl, token, fields });
      console.log('[Jellyfin Extension] Got item data:', item);
      
      const attrs = buildAttributesList(item, options);
      console.log('[Jellyfin Extension] Built attributes:', attrs);
      
      const inserted = addAttributesToCard(card, attrs);
      console.log('[Jellyfin Extension] Inserted attributes:', inserted);
      
      card.setAttribute('data-enhanced', '1');
      if (inserted) enhancedCount += 1;
    } catch (e) {
      console.error('[Jellyfin Extension] Error processing card:', e);
      card.setAttribute('data-enhanced-error', '1');
    }
  }

  await Promise.all(work);
  console.log('[Jellyfin Extension] Enhancement complete, enhanced', enhancedCount, 'cards');
  return enhancedCount;
}

// Export to global scope for browser use
window.JellyfinExtension = window.JellyfinExtension || {};
window.JellyfinExtension.orchestrator = { enhanceMovieCards };
