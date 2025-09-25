// tests/cardEnhancer.test.js

const { findMovieCards, formatFileSize, buildAttributesList, addAttributesToCard } = require('../src/cardEnhancer');

describe('findMovieCards', () => {
  it('returns an empty array if no movie cards exist', () => {
    document.body.innerHTML = '<div></div>';
    expect(findMovieCards()).toEqual([]);
  });

  it('finds a single movie card', () => {
    document.body.innerHTML = '<div class="card" data-type="Movie" data-id="1"></div>';
    const cards = findMovieCards();
    expect(cards.length).toBe(1);
    expect(cards[0].getAttribute('data-id')).toBe('1');
  });

  it('finds multiple movie cards', () => {
    document.body.innerHTML = `
      <div class="card" data-type="Movie" data-id="1"></div>
      <div class="card" data-type="Movie" data-id="2"></div>
      <div class="card" data-type="Series" data-id="3"></div>
    `;
    const cards = findMovieCards();
    expect(cards.length).toBe(2);
    expect(cards.map(c => c.getAttribute('data-id'))).toEqual(['1', '2']);
  });
});

describe('formatFileSize', () => {
  it('formats 0 bytes as 0 B', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });
  it('formats 512 bytes stays in bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });
  it('formats 1024 bytes as 1.0 KB', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
  });
  it('formats 1536 bytes as 1.5 KB', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });
  it('formats large sizes (3GB)', () => {
    expect(formatFileSize(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
  });
  it('returns empty string for undefined', () => {
    expect(formatFileSize(undefined)).toBe('');
  });
  it('returns empty string for null', () => {
    expect(formatFileSize(null)).toBe('');
  });
  it('returns empty string for negative values', () => {
    expect(formatFileSize(-1)).toBe('');
  });
  it('returns empty string for NaN', () => {
    expect(formatFileSize(Number('abc'))).toBe('');
  });
});

describe('buildAttributesList', () => {
  const baseOptions = { showFileSize: true, showFileName: true, showContainer: true, showResolution: true, showHDR: true, showAudioLanguage: true };
  it('returns empty array when item is null', () => {
    expect(buildAttributesList(null, baseOptions)).toEqual([]);
  });
  it('includes file size when present', () => {
    const item = { MediaSources: [{ Size: 2048 }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('2.0 KB');
  });
  it('includes filename extracted from Path', () => {
    const item = { Path: 'C:/media/movies/Example.Movie.mkv' };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('Example.Movie.mkv');
  });
  it('extracts filename from Windows-style backslash path', () => {
    const item = { Path: 'C\\\\Videos\\MovieName.mp4' };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('MovieName.mp4');
  });
  it('includes container upper-cased', () => {
    const item = { MediaSources: [{ Container: 'mkv' }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('MKV');
  });
  it('includes resolution WxH from video stream', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Video', Width: 1920, Height: 1080 }] }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('1920×1080');
  });
  it('omits resolution when width missing', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Video', Height: 1080 }] }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out.find(a => a.includes('1080'))).toBeUndefined();
  });
  it('omits resolution when height missing', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Video', Width: 1920 }] }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out.find(a => a.includes('1920'))).toBeUndefined();
  });
  it('respects option flags (no filename when disabled)', () => {
    const item = { Path: '/srv/file.mp4' };
    const out = buildAttributesList(item, { ...baseOptions, showFileName: false });
    expect(out.find(a => a === 'file.mp4')).toBeUndefined();
  });
  it('returns empty array when options null', () => {
    const item = { Path: '/srv/file.mp4' };
    expect(buildAttributesList(item, null)).toEqual([]);
  });
  
  it('detects HDR10 from smpte2084 color transfer', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Video', ColorTransfer: 'smpte2084' }] }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('HDR10');
  });
  
  it('detects HLG from arib-std-b67 color transfer', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Video', ColorTransfer: 'arib-std-b67' }] }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('HLG');
  });
  
  it('detects Dolby Vision from profile name', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Video', Profile: 'Main 10 HDR DV' }] }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('Dolby Vision');
  });
  
  it('detects generic HDR from VideoRange', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Video', VideoRange: 'HDR' }] }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('HDR');
  });
  
  it('detects SDR when no HDR indicators present', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Video', VideoRangeType: 'SDR' }] }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('SDR');
  });
  
  it('shows SDR as default for video streams', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Video' }] }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('SDR');
  });
  
  it('extracts audio language from language code', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Audio', Language: 'eng' }] }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('English');
  });
  
  it('maps Japanese language code correctly', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Audio', Language: 'jpn' }] }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('Japanese');
  });
  
  it('shows unknown language codes in uppercase', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Audio', Language: 'xyz' }] }] };
    const out = buildAttributesList(item, baseOptions);
    expect(out).toContain('XYZ');
  });
  
  it('respects showHDR option flag', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Video', ColorTransfer: 'smpte2084' }] }] };
    const out = buildAttributesList(item, { ...baseOptions, showHDR: false });
    expect(out.find(a => a.includes('HDR10'))).toBeUndefined();
  });
  
  it('respects showAudioLanguage option flag', () => {
    const item = { MediaSources: [{ MediaStreams: [{ Type: 'Audio', Language: 'eng' }] }] };
    const out = buildAttributesList(item, { ...baseOptions, showAudioLanguage: false });
    expect(out.find(a => a === 'English')).toBeUndefined();
  });
});

describe('addAttributesToCard', () => {
  function makeCard() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="card" data-type="Movie" data-id="x">
        <div class="cardText">
          <div class="cardText-first">Title</div>
        </div>
      </div>`;
    return wrapper.firstElementChild;
  }

  it('returns false if no attributes provided', () => {
    const card = makeCard();
    expect(addAttributesToCard(card, [])).toBe(false);
  });

  it('injects attributes div once', () => {
    const card = makeCard();
    const inserted = addAttributesToCard(card, ['1.0 GB', 'Movie.mkv']);
    expect(inserted).toBe(true);
    const second = addAttributesToCard(card, ['SHOULD NOT ADD']);
    expect(second).toBe(false);
    const nodes = card.querySelectorAll('.movie-attributes');
    expect(nodes.length).toBe(1);
    expect(nodes[0].textContent).toContain('1.0 GB');
  });

  it('returns false if .cardText missing', () => {
    const card = document.createElement('div');
    card.className = 'card';
    expect(addAttributesToCard(card, ['X'])).toBe(false);
  });

  it('returns false if attributes is not an array', () => {
    const card = makeCard();
    expect(addAttributesToCard(card, 'not-array')).toBe(false);
  });

  it('returns false if card element is null', () => {
    expect(addAttributesToCard(null, ['X'])).toBe(false);
  });
});
