// tests/reEnhancer.test.js
jest.useFakeTimers();

describe('reEnhanceCards (RED)', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '';
  });

  it('updates existing enhanced card attributes when settings change', async () => {
    // Setup DOM with one already enhanced card
    document.body.innerHTML = `
      <div class="card" data-type="Movie" data-id="x" data-enhanced="1">
        <div class="cardText"><div class="cardText-first">Title</div><div class="movie-attributes">OLD</div></div>
      </div>`;

    // Mock dependencies
    jest.doMock('../src/apiClient', () => ({
      fetchItemDetails: jest.fn().mockResolvedValue({
        Id: 'x',
        Path: '/p/a.mkv',
        MediaSources: [{ Size: 2048, Container: 'mkv', MediaStreams: [{ Type: 'Video', Width: 1280, Height: 720 }] }]
      }),
      __resetCache: () => {}
    }));

    const settings = require('../src/settings');
    // Simulate user disabling filename
    settings.updateSettings({ showFileName: false });

    const { reEnhanceCards } = require('../src/reEnhancer');
    const updated = await reEnhanceCards({ baseUrl: 'http://s', token: 't' });
    expect(updated).toBe(1);
    const attr = document.querySelector('.movie-attributes');
    expect(attr.textContent).not.toContain('a.mkv');
    expect(attr.textContent).toContain('2.0 KB');
  });

  it('skips cards without prior enhancement marker', async () => {
    document.body.innerHTML = `
      <div class="card" data-type="Movie" data-id="y">
        <div class="cardText"><div class="cardText-first">Title</div></div>
      </div>`;
    jest.doMock('../src/apiClient', () => ({ fetchItemDetails: jest.fn(), __resetCache: () => {} }));
    const { reEnhanceCards } = require('../src/reEnhancer');
    const updated = await reEnhanceCards({ baseUrl: 'http://s' });
    expect(updated).toBe(0);
  });
});
