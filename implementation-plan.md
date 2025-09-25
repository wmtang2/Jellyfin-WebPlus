# Implementation Plan: Jellyfin Movie Attributes Enhancement

## Development Phases

### Phase 1: Foundation and Data Models (Priority: High)

#### Step 1.1: Extend Library View Settings
**File**: `src/types/library.ts`
```typescript
export interface LibraryViewSettings {
  // ... existing properties
  ShowFileSize?: boolean;
  ShowFileName?: boolean;
  ShowFilePath?: boolean; // Admin only
  ShowContainer?: boolean;
  CustomMovieAttributes?: {
    fileSize: boolean;
    fileName: boolean;
    filePath: boolean;
    container: boolean;
    resolution: boolean;
    bitrate: boolean;
  };
}
```

#### Step 1.2: Create File Utilities
**File**: `src/utils/file.ts` (extend existing)
```typescript
/**
 * Get readable file size from bytes
 */
export function getReadableSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extract filename from full path
 */
export function getFileNameFromPath(path: string): string {
  if (!path) return '';
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || '';
}

/**
 * Get file extension from path
 */
export function getFileExtension(path: string): string {
  const fileName = getFileNameFromPath(path);
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(lastDot + 1) : '';
}

/**
 * Format video resolution
 */
export function formatResolution(width?: number, height?: number): string {
  if (!width || !height) return '';
  return `${width}×${height}`;
}

/**
 * Format bitrate to readable string
 */
export function formatBitrate(bitrate?: number): string {
  if (!bitrate) return '';
  return `${Math.round(bitrate / 1000)} kbps`;
}
```

#### Step 1.3: Update User Settings
**File**: `src/scripts/settings/userSettings.js`
```javascript
// Add to allowedFilterSettings array
const allowedMovieAttributeSettings = [
  'ShowFileSize', 'ShowFileName', 'ShowFilePath', 'ShowContainer'
];

// Add methods for movie attributes
export function showFileSize(userId) {
  return getUserSetting('ShowFileSize', userId) === 'true';
}

export function setShowFileSize(val, userId) {
  setUserSetting('ShowFileSize', val.toString(), userId);
}

export function showFileName(userId) {
  return getUserSetting('ShowFileName', userId) === 'true';
}

export function setShowFileName(val, userId) {
  setUserSetting('ShowFileName', val.toString(), userId);
}

// Similar methods for other attributes...
```

### Phase 2: Data Fetching Enhancement (Priority: High)

#### Step 2.1: Modify Items Utility
**File**: `src/utils/items.ts`
```typescript
const getItemFieldsEnum = (
  viewType: LibraryTab,
  libraryViewSettings: LibraryViewSettings
) => {
  const itemFields: ItemFields[] = [];

  // Existing fields...
  if (viewType !== LibraryTab.Networks) {
    itemFields.push(ItemFields.MediaSourceCount);
  }

  // Add movie attribute fields
  if (needsMovieAttributeFields(libraryViewSettings)) {
    itemFields.push(ItemFields.MediaSources);
    
    if (libraryViewSettings.ShowFilePath || libraryViewSettings.ShowFileName) {
      itemFields.push(ItemFields.Path);
    }
  }

  return itemFields;
};

function needsMovieAttributeFields(settings: LibraryViewSettings): boolean {
  return !!(settings.ShowFileSize || 
           settings.ShowFileName || 
           settings.ShowFilePath || 
           settings.ShowContainer);
}
```

#### Step 2.2: Update useFetchItems Hook
**File**: `src/hooks/useFetchItems.ts`
```typescript
// Ensure MovieRecommendations includes MediaSources when needed
const fetchGetMovieRecommendations = async (
  currentApi: JellyfinApiContext,
  parentId: ParentId,
  libraryViewSettings: LibraryViewSettings,
  options?: AxiosRequestConfig
) => {
  const { api, user } = currentApi;
  if (api && user?.Id) {
    const fields = [
      ItemFields.PrimaryImageAspectRatio,
      ItemFields.MediaSourceCount
    ];
    
    // Add MediaSources if movie attributes are enabled
    if (needsMovieAttributeFields(libraryViewSettings)) {
      fields.push(ItemFields.MediaSources);
    }

    const response = await getMoviesApi(api).getMovieRecommendations({
      userId: user.Id,
      fields,
      parentId: parentId ?? undefined,
      categoryLimit: 6,
      itemLimit: 20
    }, { signal: options?.signal });
    
    return response.data;
  }
};
```

### Phase 3: Card Display Enhancement (Priority: High)

#### Step 3.1: Create Movie Attributes Component
**File**: `src/components/cardbuilder/movieAttributes.ts`
```typescript
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import type { LibraryViewSettings } from 'types/library';
import { getReadableSize, getFileNameFromPath, formatResolution, formatBitrate } from 'utils/file';

export interface MovieAttributeOptions {
  libraryViewSettings: LibraryViewSettings;
  isAdministrator?: boolean;
  showAdminFields?: boolean;
}

/**
 * Generate additional text lines for movie attributes
 */
export function generateMovieAttributeLines(
  item: BaseItemDto,
  options: MovieAttributeOptions
): string[] {
  const lines: string[] = [];
  const { libraryViewSettings, isAdministrator = false } = options;
  
  // Skip if not a movie or no media sources
  if (item.Type !== 'Movie' || !item.MediaSources?.length) {
    return lines;
  }

  const mediaSource = item.MediaSources[0];
  
  // File Size
  if (libraryViewSettings.ShowFileSize && mediaSource.Size) {
    lines.push(`${getReadableSize(mediaSource.Size)}`);
  }
  
  // File Name
  if (libraryViewSettings.ShowFileName && item.Path) {
    const fileName = getFileNameFromPath(item.Path);
    if (fileName) {
      lines.push(fileName);
    }
  }
  
  // File Path (Admin only)
  if (libraryViewSettings.ShowFilePath && item.Path && isAdministrator) {
    lines.push(item.Path);
  }
  
  // Container Format
  if (libraryViewSettings.ShowContainer && mediaSource.Container) {
    lines.push(mediaSource.Container.toUpperCase());
  }
  
  // Resolution (from video stream)
  const videoStream = mediaSource.MediaStreams?.find(s => s.Type === 'Video');
  if (videoStream?.Width && videoStream?.Height) {
    const resolution = formatResolution(videoStream.Width, videoStream.Height);
    if (resolution) {
      lines.push(resolution);
    }
  }
  
  // Bitrate
  if (mediaSource.Bitrate) {
    lines.push(formatBitrate(mediaSource.Bitrate));
  }
  
  return lines;
}
```

#### Step 3.2: Modify Card Builder
**File**: `src/components/cardbuilder/cardBuilder.js`
```javascript
import { generateMovieAttributeLines } from './movieAttributes';

// Modify getCardFooterText function
function getCardFooterText(item, apiClient, options, footerClass, progressHtml, flags, urls) {
  // ... existing code ...
  
  if (options.textLines) {
    const additionalLines = options.textLines(item);
    for (const additionalLine of additionalLines) {
      lines.push(additionalLine);
    }
  }
  
  // Add movie attributes
  if (options.libraryViewSettings && item.Type === 'Movie') {
    const movieAttributeOptions = {
      libraryViewSettings: options.libraryViewSettings,
      isAdministrator: options.isAdministrator || false
    };
    
    const movieLines = generateMovieAttributeLines(item, movieAttributeOptions);
    for (const movieLine of movieLines) {
      lines.push(movieLine);
    }
  }
  
  // ... rest of existing code ...
}
```

### Phase 4: Settings UI (Priority: Medium)

#### Step 4.1: Create Movie Attributes Settings Component
**File**: `src/components/movieAttributeSettings/MovieAttributeSettings.tsx`
```typescript
import React from 'react';
import { Checkbox, FormControlLabel, FormGroup, Typography, Box } from '@mui/material';
import { useCurrentUser } from 'hooks/useCurrentUser';
import type { LibraryViewSettings } from 'types/library';

interface MovieAttributeSettingsProps {
  libraryViewSettings: LibraryViewSettings;
  onSettingsChange: (settings: Partial<LibraryViewSettings>) => void;
}

export const MovieAttributeSettings: React.FC<MovieAttributeSettingsProps> = ({
  libraryViewSettings,
  onSettingsChange
}) => {
  const { user } = useCurrentUser();
  const isAdmin = user?.Policy?.IsAdministrator || false;

  const handleAttributeChange = (attribute: keyof LibraryViewSettings) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onSettingsChange({
      [attribute]: event.target.checked
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Movie Attributes
      </Typography>
      <FormGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={libraryViewSettings.ShowFileSize || false}
              onChange={handleAttributeChange('ShowFileSize')}
            />
          }
          label="Show file size"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={libraryViewSettings.ShowFileName || false}
              onChange={handleAttributeChange('ShowFileName')}
            />
          }
          label="Show filename"
        />
        {isAdmin && (
          <FormControlLabel
            control={
              <Checkbox
                checked={libraryViewSettings.ShowFilePath || false}
                onChange={handleAttributeChange('ShowFilePath')}
              />
            }
            label="Show file path"
          />
        )}
        <FormControlLabel
          control={
            <Checkbox
              checked={libraryViewSettings.ShowContainer || false}
              onChange={handleAttributeChange('ShowContainer')}
            />
          }
          label="Show container format"
        />
      </FormGroup>
    </Box>
  );
};
```

#### Step 4.2: Integrate Settings into Library Views
Update library view components to include the movie attributes settings panel.

### Phase 5: Localization and Polish (Priority: Low)

#### Step 5.1: Add Localization Strings
**File**: `src/strings/en-us.json`
```json
{
  "MovieAttributesSettings": "Movie Attributes",
  "ShowFileSize": "Show file size",
  "ShowFileName": "Show filename", 
  "ShowFilePath": "Show file path",
  "ShowContainerFormat": "Show container format",
  "ShowResolution": "Show resolution",
  "ShowBitrate": "Show bitrate"
}
```

## Testing Strategy

### Unit Tests
1. **File utilities** (`src/utils/file.ts`)
   - Test `getReadableSize()` with various byte values
   - Test `getFileNameFromPath()` with different path formats
   - Test `formatResolution()` and `formatBitrate()`

2. **Movie attributes generator** (`src/components/cardbuilder/movieAttributes.ts`)
   - Test with different item types
   - Test with missing MediaSources
   - Test admin vs non-admin scenarios

### Integration Tests
1. **Settings persistence** - Verify settings are saved and loaded correctly
2. **API requests** - Ensure additional fields are requested when needed
3. **Card rendering** - Confirm attributes appear in cards when enabled

### Visual Testing
1. **Card layouts** - Test with different card sizes and layouts
2. **Responsive design** - Test on mobile and desktop
3. **Long filenames** - Test truncation and overflow handling

## Deployment Considerations

### Performance Impact
- Additional API fields only requested when attributes are enabled
- File size calculations cached where possible
- No performance impact when feature is disabled

### Backwards Compatibility
- All new settings default to `false` (opt-in)
- Graceful handling of missing data
- No breaking changes to existing APIs

### Security
- File paths only shown to administrators
- Sensitive information properly filtered
- User permissions respected

## Rollout Plan

### Phase 1: Core Implementation (Week 1-2)
- File utilities and data models
- Basic file size and filename display
- User settings integration

### Phase 2: Enhanced Attributes (Week 3)
- Container format, resolution, bitrate
- Admin-only file path display
- Settings UI

### Phase 3: Polish and Testing (Week 4)
- Localization
- Comprehensive testing
- Performance optimization
- Documentation

### Phase 4: Deployment (Week 5)
- Feature flag rollout
- User feedback collection
- Bug fixes and refinements

## Success Metrics

1. **User Adoption**: Percentage of users who enable movie attributes
2. **Performance**: No degradation in page load times
3. **User Satisfaction**: Positive feedback on additional movie information
4. **Usage Patterns**: Which attributes are most commonly enabled

This implementation plan provides a structured approach to adding user-selectable movie attributes while maintaining code quality, performance, and user experience.