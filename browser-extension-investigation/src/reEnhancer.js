// src/reEnhancer.js
// Re-enhances already processed cards when settings change.

// Use global exports instead of require

async function reEnhanceCards(config) {
  const { baseUrl, token, fields = ['Path', 'MediaSources'] } = config || {};
  if (!baseUrl) throw new Error('baseUrl required');
  const cards = Array.from(document.querySelectorAll('.card[data-type="Movie"][data-enhanced="1"]'));
  if (cards.length === 0) return 0;
  const { buildAttributesList, addAttributesToCard } = window.JellyfinExtension.cardEnhancer;
  const { fetchItemDetails } = window.JellyfinExtension.apiClient;
  const { getSettings } = window.JellyfinExtension.settings;
  const opts = getSettings();
  let updated = 0;
  await Promise.all(cards.map(async card => {
    const id = card.getAttribute('data-id');
    if (!id) return;
    try {
      const item = await fetchItemDetails(id, { baseUrl, token, fields, forceRefresh: true });
      const attrs = buildAttributesList(item, opts);
      // Replace existing attributes node
      const existing = card.querySelector('.movie-attributes');
      if (existing) existing.remove();
      const inserted = addAttributesToCard(card, attrs);
      if (inserted) updated += 1;
    } catch (_) {
      // Silent; could add error flag if needed
    }
  }));
  return updated;
}

// Export to global scope for browser use
window.JellyfinExtension = window.JellyfinExtension || {};
window.JellyfinExtension.reEnhancer = { reEnhanceCards };
