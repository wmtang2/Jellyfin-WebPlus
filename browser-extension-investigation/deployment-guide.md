# Firefox Extension Deployment and Distribution Guide

## Firefox Add-ons Store (AMO) Submission

### Prerequisites
- Firefox Developer Account at [addons.mozilla.org](https://addons.mozilla.org)
- Completed extension package (zip file)
- All required metadata and assets

### Store Requirements

#### Technical Requirements
- **Manifest Version**: Use manifest_version 2 (v3 support coming)
- **File Size**: Maximum 200MB per extension
- **Permissions**: Only request necessary permissions
- **Security**: No eval(), inline scripts must be minimal
- **Performance**: Must not significantly impact browser performance

#### Content Requirements
- **Name**: Unique, descriptive name (max 50 characters)
- **Description**: Clear explanation of functionality (max 132 characters for summary)
- **Icons**: Required sizes: 16x16, 48x48, 128x128 pixels
- **Screenshots**: At least 1, recommended 3-5 showing key features
- **Category**: Choose appropriate category (e.g., "Productivity", "Entertainment")

### Pre-Submission Checklist

#### Code Quality
- [ ] No console.log statements in production
- [ ] Proper error handling throughout
- [ ] Minimal permissions requested
- [ ] No hardcoded URLs or credentials
- [ ] Code follows Mozilla's extension guidelines

#### Testing
- [ ] Works on Firefox release, beta, and developer editions
- [ ] No memory leaks or performance issues
- [ ] Graceful handling of network failures
- [ ] Works with multiple tabs/windows
- [ ] No conflicts with common extensions

#### Documentation
- [ ] Clear README.md with installation instructions
- [ ] Privacy policy (if collecting any data)
- [ ] License file (recommended: MIT or GPL)
- [ ] Changelog for updates

### Submission Process

#### Step 1: Package Extension
```bash
# Remove development files
rm -rf .git test-cases.md development-notes.md

# Create distribution package
zip -r jellyfin-movie-attributes-v1.0.0.zip . \
  -x "*.git*" "node_modules/*" "*.md" "*.txt"

# Verify package contents
unzip -l jellyfin-movie-attributes-v1.0.0.zip
```

#### Step 2: Submit to AMO
1. **Login**: Go to [addons.mozilla.org/developers](https://addons.mozilla.org/developers)
2. **Submit**: Click "Submit a New Add-on"
3. **Upload**: Upload the zip file
4. **Validation**: Wait for automated validation
5. **Metadata**: Fill in all required information:
   - Name: "Jellyfin Movie Attributes"
   - Summary: "Display file size, filename, and other attributes in Jellyfin movie cards"
   - Description: Detailed explanation of features
   - Category: "Entertainment" or "Productivity"
   - Tags: "jellyfin", "media", "movies", "attributes"

#### Step 3: Review Process
- **Automated Review**: Usually takes minutes to hours
- **Manual Review**: May take 1-7 days for new extensions
- **Common Issues**: 
  - Excessive permissions
  - Security vulnerabilities
  - Performance problems
  - Missing metadata

### Alternative Distribution Methods

#### Self-Hosting
```javascript
// Add update URL to manifest.json for self-hosted updates
{
  "applications": {
    "gecko": {
      "id": "jellyfin-movie-attributes@yoursite.com",
      "update_url": "https://yoursite.com/updates.json"
    }
  }
}
```

Create `updates.json` for self-hosted updates:
```json
{
  "addons": {
    "jellyfin-movie-attributes@yoursite.com": {
      "updates": [
        {
          "version": "1.0.0",
          "update_link": "https://yoursite.com/jellyfin-movie-attributes-1.0.0.xpi"
        }
      ]
    }
  }
}
```

#### GitHub Releases
1. Create GitHub repository
2. Use GitHub Actions for automated building
3. Create releases with extension packages
4. Provide installation instructions

Example GitHub Actions workflow:
```yaml
# .github/workflows/release.yml
name: Build and Release Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Package Extension
      run: |
        zip -r jellyfin-movie-attributes-${{ github.ref_name }}.zip . \
          -x "*.git*" ".github/*" "*.md"
    
    - name: Create Release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: ${{ github.ref }}
        release_name: Release ${{ github.ref }}
        draft: false
        prerelease: false
        
    - name: Upload Release Asset
      uses: actions/upload-release-asset@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        upload_url: ${{ steps.create_release.outputs.upload_url }}
        asset_path: ./jellyfin-movie-attributes-${{ github.ref_name }}.zip
        asset_name: jellyfin-movie-attributes-${{ github.ref_name }}.zip
        asset_content_type: application/zip
```

### Distribution Documentation

#### Installation Instructions for Users

**From Firefox Add-ons Store:**
1. Go to [addons.mozilla.org](https://addons.mozilla.org)
2. Search for "Jellyfin Movie Attributes"
3. Click "Add to Firefox"
4. Confirm installation when prompted

**Manual Installation (Development/Beta versions):**
1. Download the `.xpi` file or `.zip` file
2. Open Firefox and go to `about:addons`
3. Click the gear icon and select "Install Add-on From File"
4. Select the downloaded file
5. Confirm installation

**Temporary Installation (Developers):**
1. Open Firefox and go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the extracted extension

#### User Documentation

Create comprehensive user documentation:

```markdown
# Jellyfin Movie Attributes Extension

## Features
- Display file size for movies in your Jellyfin library
- Show original filenames in movie cards
- Optional display of container format and resolution
- Fully configurable through extension settings

## Configuration
1. Right-click the extension icon and select "Options"
2. Choose which attributes to display
3. Enable or disable the extension as needed
4. Settings are automatically saved

## Troubleshooting
- **Not working on my Jellyfin site**: Ensure you're accessing via `/web/` path
- **No file sizes showing**: Check that MediaSources data is available
- **Performance issues**: Reduce number of displayed attributes

## Privacy
This extension does not collect or transmit any personal data. All operations are performed locally in your browser.

## Support
Report issues at: [GitHub Issues URL]
```

### Maintenance and Updates

#### Version Management
- Use semantic versioning (e.g., 1.0.0, 1.1.0, 2.0.0)
- Maintain a changelog
- Test updates thoroughly before release

#### Update Process
1. **Development**: Make changes in development branch
2. **Testing**: Test with multiple Jellyfin versions and Firefox versions
3. **Version Bump**: Update version in manifest.json
4. **Package**: Create new distribution package
5. **Submit**: Upload to AMO (automatic update) or release on GitHub

#### Long-term Maintenance
- Monitor for Jellyfin web client changes
- Update for new Firefox extension APIs
- Respond to user feedback and bug reports
- Keep dependencies up to date

### Legal Considerations

#### Licensing
Recommended license options:
- **MIT License**: Most permissive, allows commercial use
- **GPL v3**: Copyleft license, requires derivative works to be open source
- **Mozilla Public License**: Mozilla's preferred license

#### Privacy Policy
Required if collecting any data:
```markdown
# Privacy Policy

This extension does not collect, store, or transmit any personal information. All data processing occurs locally within your browser.

The extension accesses your Jellyfin server API only to retrieve public movie metadata that is already visible in your interface.

No analytics, tracking, or data collection is performed.
```

### Marketing and Promotion

#### AMO Store Optimization
- Use clear, descriptive screenshots
- Write compelling but honest descriptions
- Respond to user reviews promptly
- Keep extension updated and functional

#### Community Engagement
- Post in Jellyfin community forums
- Create documentation/tutorials
- Engage with users on Reddit/Discord
- Collaborate with other Jellyfin developers

This comprehensive deployment guide ensures successful distribution and long-term maintenance of the Firefox extension.