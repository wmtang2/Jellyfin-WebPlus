# Jellyfin Movie Attributes Plugin Feasibility Analysis

## Plugin Architecture Investigation Results

After thoroughly investigating the Jellyfin web client plugin system, here's my assessment of whether the movie attributes enhancement can be implemented as a plugin instead of modifying the main branch.

## Current Plugin System Analysis

### ✅ What Plugins CAN Do

1. **Plugin Types Available**
   ```typescript
   enum PluginType {
     MediaPlayer = 'mediaplayer',
     PreplayIntercept = 'preplayintercept', 
     Screensaver = 'screensaver',
     SyncPlay = 'syncplay'
   }
   ```

2. **Dependencies Plugins Receive**
   - `Events` - Event system for listening/triggering events
   - `ServerConnections` - API client access
   - `dashboard` - Dashboard utilities
   - `appSettings` - Application settings
   - `globalize` - Internationalization
   - `appRouter` - Navigation
   - `toast`, `confirm` - UI dialogs
   - Standard DOM access

3. **Plugin Capabilities**
   - Access to DOM manipulation
   - Event listening and triggering
   - API requests through ServerConnections
   - Access to user data and settings
   - Custom UI components and overlays

### ❌ What Plugins CANNOT Do (Major Limitations)

1. **No CardBuilder Extension Points**
   - CardBuilder (`src/components/cardbuilder/cardBuilder.js`) has no plugin hooks
   - No events triggered before/after card creation
   - No way to extend `options.textLines` functionality from plugins
   - Cards are built with fixed structure, no extensibility

2. **No UI Component Override System**
   - No plugin type for "UI extensions" or "card modifiers"
   - No dependency injection for core components
   - No way to replace or wrap existing components

3. **No API Request Interception**
   - No hooks for modifying API requests (like adding ItemFields)
   - Plugins can make their own API calls but can't modify existing ones
   - Can't extend useFetchItems hook or similar data fetching

4. **Settings Integration Limitations**
   - No way to extend LibraryViewSettings interface
   - Can't add settings to existing settings panels
   - Would need completely separate settings UI

## Plugin Implementation Feasibility: ❌ NOT FEASIBLE

### Why a Pure Plugin Approach Won't Work

1. **Core Architecture Limitation**
   ```javascript
   // This is how cards are built - no plugin extension points
   html += cardBuilder.getCardsHtml({
     items: items,
     shape: shape,
     showTitle: true,
     // No hooks for plugins here
   });
   ```

2. **Data Fetching Problem**
   ```typescript
   // Plugins can't modify these existing API calls
   const fields = [
     ItemFields.PrimaryImageAspectRatio,
     ItemFields.MediaSourceCount
     // Can't add ItemFields.MediaSources from plugin
   ];
   ```

3. **No Card Modification Hooks**
   ```javascript
   // After cards are created, no events are triggered for plugins
   buildCards(items, options); // No plugin hooks
   ```

## Alternative Approaches Analyzed

### 1. DOM Manipulation Plugin (Hacky, Not Recommended)
```javascript
class MovieAttributesPlugin {
  constructor({ Events, ServerConnections }) {
    this.name = 'Movie Attributes';
    this.type = 'ui-extension'; // Custom type
    
    // Watch for cards being added to DOM
    this.observer = new MutationObserver(this.onDOMChange.bind(this));
    this.observer.observe(document.body, { childList: true, subtree: true });
  }
  
  onDOMChange(mutations) {
    // Find new movie cards and modify them
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.classList?.contains('card')) {
          this.enhanceMovieCard(node);
        }
      });
    });
  }
  
  async enhanceMovieCard(cardElement) {
    // This would be very fragile and hacky
    const itemId = cardElement.getAttribute('data-id');
    // Make separate API call to get file info
    // Modify DOM to add file size/name
  }
}
```

**Problems with this approach:**
- ❌ Very fragile - breaks with any DOM structure changes
- ❌ Performance issues - separate API calls for each card
- ❌ No access to original item data
- ❌ Race conditions with card creation
- ❌ No settings integration

### 2. Hybrid Approach (Minimal Core Changes + Plugin)

The only viable approach would be a **hybrid solution**:

#### Core Changes (Minimal)
1. Add plugin hooks to CardBuilder:
   ```javascript
   // In cardBuilder.js
   function getCardFooterText(item, apiClient, options, footerClass, progressHtml, flags, urls) {
     // ... existing code ...
     
     // NEW: Plugin hook
     if (window.pluginManager) {
       const cardPlugins = window.pluginManager.ofType('card-enhancer');
       for (const plugin of cardPlugins) {
         if (plugin.enhanceCard) {
           const additionalLines = plugin.enhanceCard(item, options);
           lines.push(...additionalLines);
         }
       }
     }
     
     // ... rest of existing code ...
   }
   ```

2. Add plugin type to types:
   ```typescript
   enum PluginType {
     // ... existing types
     CardEnhancer = 'card-enhancer'
   }
   ```

#### Plugin Implementation
```javascript
class MovieAttributesPlugin {
  constructor({ ServerConnections, Events }) {
    this.name = 'Movie Attributes';
    this.type = 'card-enhancer';
    this.id = 'movie-attributes';
  }
  
  enhanceCard(item, options) {
    if (item.Type !== 'Movie' || !item.MediaSources) return [];
    
    const lines = [];
    // Add file size, filename, etc.
    if (item.MediaSources[0]?.Size) {
      lines.push(`Size: ${this.formatFileSize(item.MediaSources[0].Size)}`);
    }
    return lines;
  }
}
```

## Final Recommendation: 🔄 HYBRID APPROACH

### Recommended Implementation Strategy

**Option 1: Pure Core Modification (Recommended)**
- Implement the feature directly in the main codebase as originally planned
- Most maintainable and robust solution
- Better integration with existing systems
- Follows established patterns

**Option 2: Minimal Core + Plugin (If Plugin Architecture is Preferred)**
- Add minimal plugin hooks to CardBuilder (3-5 lines of code)
- Implement main functionality as a plugin
- Requires core team approval for minimal hooks

### Core Changes Required for Plugin Support
```javascript
// In cardBuilder.js - add ~5 lines
Events.trigger(cardBuilder, 'card-building', [item, options]);

// In PluginType enum - add 1 line  
CardEnhancer = 'card-enhancer'
```

## Conclusion

A **pure plugin implementation is not feasible** due to architectural limitations in the Jellyfin web client. The plugin system is designed for media players and screensavers, not UI component extensions.

The **hybrid approach would work** but requires minimal core changes anyway, so it's more practical to implement the feature directly in the main codebase as originally planned.

### Benefits of Direct Implementation
- ✅ Proper integration with existing settings system
- ✅ Efficient API requests (add fields when needed)
- ✅ Robust and maintainable code
- ✅ Better user experience
- ✅ Follows established Jellyfin patterns

### Plugin Limitations Summary
- ❌ No CardBuilder extension points
- ❌ Can't modify existing API requests
- ❌ No settings panel integration
- ❌ Would require hacky DOM manipulation
- ❌ Performance and reliability issues

**Recommendation: Proceed with the original implementation plan** as documented in `implementation-plan.md`.