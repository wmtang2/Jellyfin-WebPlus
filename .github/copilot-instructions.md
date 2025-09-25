# Jellyfin Web Interface Enhancement Project

This workspace is dedicated to investigating and developing enhancements to the Jellyfin web interface to display additional movie attributes beyond just titles.

## Project Goals
- Add support for displaying file size and filename in movie listings
- Implement user-selectable attributes for customizable movie displays
- Maintain compatibility with existing Jellyfin web client architecture

## Research Areas
- Jellyfin web client codebase structure and architecture
- Movie metadata API responses and available attributes
- Current movie listing components and rendering patterns
- User preference systems and settings management
- UI/UX design for attribute selection

## Priority Attributes
1. File size (primary)
2. Filename (primary)
3. Other metadata attributes (configurable by user)

## Investigation Status
- [x] Jellyfin web client architecture research
- [x] Movie data model analysis
- [x] Current display component study  
- [x] User preference system design
- [x] Implementation plan creation

## Key Findings
- **Architecture**: React/TypeScript with Material-UI, uses CardBuilder component for movie display
- **Data Models**: BaseItemDto with MediaSourceInfo containing file size and path
- **Settings System**: User preferences stored in displayPrefs, managed via userSettings.js
- **Extension Point**: CardBuilder supports custom text lines via options.textLines

## Ready for Implementation
The investigation is complete. Key implementation files identified:
- `src/types/library.ts` - Extend LibraryViewSettings
- `src/components/cardbuilder/cardBuilder.js` - Modify card display
- `src/scripts/settings/userSettings.js` - Add movie attribute settings
- `src/utils/file.ts` - File utilities for formatting

See `jellyfin-web-investigation.md` and `implementation-plan.md` for detailed technical analysis and step-by-step implementation guide.