# Jellyfin Web Interface Enhancement: Movie Attributes Display

## Investigation Summary

Based on my thorough investigation of the Jellyfin web client codebase, here are the key findings and implementation plan:

## Architecture Analysis

### Current Components
1. **CardBuilder (`src/components/cardbuilder/cardBuilder.js`)**
   - Main component responsible for building movie/item cards
   - Uses `options.textLines` callback for custom text lines
   - Supports different card layouts and text positioning

2. **Data Sources**
   - **BaseItemDto**: Main item data structure
   - **MediaSourceInfo**: Contains file information including:
     - `Size`: File size in bytes
     - `Path`: Full file path
     - `Name`: Media source name
   - **ItemFields**: Controls what data is fetched from API
     - `ItemFields.Path`: Gets file path
     - `ItemFields.MediaSources`: Gets media source info including file size

3. **User Settings System**
   - Managed through `userSettings.js`
   - Stored in `displayPrefs` on server
   - `LibraryViewSettings` interface controls display options

### Current Movie Data Flow
```
API Request → ItemFields.MediaSources → BaseItemDto.MediaSources → CardBuilder → Display
```

## Implementation Plan

### Phase 1: Extend Data Models and User Settings

#### 1.1 Extend LibraryViewSettings
Add new properties to `src/types/library.ts`:
```typescript
export interface LibraryViewSettings {
  // ... existing properties
  ShowFileSize?: boolean;
  ShowFileName?: boolean;
  ShowFilePath?: boolean; 
  ShowContainer?: boolean;
  ShowBitrate?: boolean;
  ShowResolution?: boolean;
  CustomAttributes?: string[]; // For future extensibility
}
```

#### 1.2 Update User Settings
Modify `src/scripts/settings/userSettings.js` to:
- Add new settings for movie attributes
- Include them in allowed settings lists
- Provide default values
- Handle backward compatibility

#### 1.3 Utility Functions
Create `src/utils/file.ts` (extend existing):
```typescript
export function getReadableSize(bytes: number): string;
export function getFileNameFromPath(path: string): string;
export function getFileExtension(path: string): string;
export function formatResolution(width: number, height: number): string;
export function formatBitrate(bitrate: number): string;
```

### Phase 2: Modify API Requests

#### 2.1 Update useFetchItems Hook
Modify `src/hooks/useFetchItems.ts` to include required ItemFields:
```typescript
// Add MediaSources and Path fields when movie attributes are enabled
const getMovieItemFields = (libraryViewSettings: LibraryViewSettings) => {
  const fields = [...existingFields];
  
  if (libraryViewSettings.ShowFileSize || 
      libraryViewSettings.ShowFileName || 
      libraryViewSettings.ShowFilePath) {
    fields.push(ItemFields.MediaSources, ItemFields.Path);
  }
  
  return fields;
};
```

#### 2.2 Update Item Utilities
Modify `src/utils/items.ts` to include new fields in queries based on user preferences.

### Phase 3: Enhance Card Display

#### 3.1 Create Movie Attributes Generator
Create `src/components/cardbuilder/movieAttributes.ts`:
```typescript
export function generateMovieAttributeLines(
  item: BaseItemDto, 
  settings: LibraryViewSettings
): string[] {
  const lines: string[] = [];
  
  if (settings.ShowFileSize && item.MediaSources?.[0]?.Size) {
    lines.push(`Size: ${getReadableSize(item.MediaSources[0].Size)}`);
  }
  
  if (settings.ShowFileName && item.Path) {
    lines.push(`File: ${getFileNameFromPath(item.Path)}`);
  }
  
  if (settings.ShowContainer && item.MediaSources?.[0]?.Container) {
    lines.push(`Format: ${item.MediaSources[0].Container.toUpperCase()}`);
  }
  
  // Add resolution, bitrate, etc.
  
  return lines;
}
```

#### 3.2 Integrate with CardBuilder
Modify card building logic to use the new movie attributes:
```typescript
// In cardBuilder.js, extend options.textLines functionality
if (options.textLines) {
  const additionalLines = options.textLines(item);
  for (const additionalLine of additionalLines) {
    lines.push(additionalLine);
  }
}

// Add movie attributes if enabled
if (options.movieAttributes && item.Type === 'Movie') {
  const movieLines = generateMovieAttributeLines(item, options.libraryViewSettings);
  lines.push(...movieLines);
}
```

### Phase 4: Settings UI

#### 4.1 Library Display Settings
Extend existing display settings interface to include:
- Checkbox: "Show file size"
- Checkbox: "Show filename" 
- Checkbox: "Show file path" (admin only)
- Checkbox: "Show container format"
- Checkbox: "Show resolution"
- Checkbox: "Show bitrate"

#### 4.2 Settings Storage
Use existing user settings infrastructure to persist preferences.

### Phase 5: Permission and Security

#### 5.1 Admin-Only Attributes
- File path should only be shown to administrators
- Check `user?.Policy.IsAdministrator` before displaying sensitive info

#### 5.2 Performance Considerations
- Only fetch MediaSources when needed (when attributes are enabled)
- Cache file size formatting calculations
- Consider pagination impact with additional data

## Technical Considerations

### Data Availability
- **File Size**: Available in `MediaSources[0].Size` (requires `ItemFields.MediaSources`)
- **File Path**: Available in `item.Path` (requires `ItemFields.Path`)
- **Filename**: Extract from path using utility function
- **Container**: Available in `MediaSources[0].Container`
- **Resolution**: Available in `MediaStreams` video stream
- **Bitrate**: Available in `MediaSources[0].Bitrate`

### UI/UX Design
- Display attributes as secondary text lines below main title
- Use consistent formatting (e.g., "Size: 1.2 GB", "File: movie.mkv")
- Respect existing card layout options
- Maintain responsive design

### Backwards Compatibility
- Default all new settings to `false` (opt-in)
- Gracefully handle missing data
- Don't break existing card layouts

### Performance Impact
- Additional API fields only requested when needed
- File size formatting cached
- No impact when features are disabled

## Files to Modify

1. **Types and Models**
   - `src/types/library.ts` - Add new LibraryViewSettings properties
   - `src/utils/file.ts` - Add file utility functions

2. **Data Fetching**
   - `src/hooks/useFetchItems.ts` - Include required ItemFields
   - `src/utils/items.ts` - Update field queries

3. **Display Logic**
   - `src/components/cardbuilder/cardBuilder.js` - Integrate movie attributes
   - `src/components/cardbuilder/movieAttributes.ts` - Generate attribute lines

4. **Settings**
   - `src/scripts/settings/userSettings.js` - Add new user preferences
   - Library display settings UI components

5. **Strings**
   - `src/strings/en-us.json` - Add localization strings

## Next Steps

This investigation provides a comprehensive foundation for implementing user-selectable movie attributes in the Jellyfin web interface. The approach:

1. **Leverages existing architecture** - Uses current card builder and settings systems
2. **Maintains compatibility** - Doesn't break existing functionality
3. **Provides flexibility** - Allows users to choose which attributes to display
4. **Considers security** - Restricts sensitive info to administrators
5. **Optimizes performance** - Only fetches additional data when needed

The implementation would focus on the priority attributes (file size and filename) first, with easy extensibility for additional attributes later.