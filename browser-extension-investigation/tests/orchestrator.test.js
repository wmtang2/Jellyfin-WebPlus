// tests/orchestrator.test.js
const { __resetCache } = require('../src/apiClient');
const { fetchItemDetails } = require('../src/apiClient'); // will be mocked in-place
const { buildAttributesList, addAttributesToCard } = require('../src/cardEnhancer');

// We'll require orchestrator after setting up some helper mocks (once implemented)

describe('orchestrator enhanceMovieCards (RED phase)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    __resetCache();
    jest.resetModules();
  });

  it('enhances a single movie card with fetched attributes', async () => {
    document.body.innerHTML = `
      <div class="card" data-type="Movie" data-id="abc">
        <div class="cardText"><div class="cardText-first">Title</div></div>
      </div>`;

    // Mock fetch before requiring orchestrator
    const api = require('../src/apiClient');
    jest.spyOn(api, 'fetchItemDetails').mockResolvedValue({
      Id: 'abc',
      Path: '/media/title.mkv',
      MediaSources: [{ Size: 1024, Container: 'mkv', MediaStreams: [{ Type: 'Video', Width: 1920, Height: 1080 }] }]
    });

    const { enhanceMovieCards } = require('../src/orchestrator');

    const count = await enhanceMovieCards({ baseUrl: 'http://s', token: 't', options: { showFileSize: true, showFileName: true, showContainer: true, showResolution: true } });
    expect(count).toBe(1);
    const injected = document.querySelector('.movie-attributes');
    expect(injected).not.toBeNull();
    expect(injected.textContent).toContain('1.0 KB');
    expect(injected.textContent).toContain('TITLE.MKV'.toLowerCase() ? 'title.mkv' : 'title.mkv');
  });

  it('skips already enhanced cards', async () => {
    document.body.innerHTML = `
      <div class="card" data-type="Movie" data-id="a" data-enhanced="1">
        <div class="cardText"><div class="cardText-first">A</div><div class="movie-attributes">Existing</div></div>
      </div>`;
  const api = require('../src/apiClient');
  const spy = jest.spyOn(api, 'fetchItemDetails');
  const { enhanceMovieCards } = require('../src/orchestrator');
    const count = await enhanceMovieCards({ baseUrl: 'http://s', token: 't', options: {} });
    expect(count).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('marks error when fetch fails', async () => {
    document.body.innerHTML = `
      <div class="card" data-type="Movie" data-id="z">
        <div class="cardText"><div class="cardText-first">Z</div></div>
      </div>`;
    const api = require('../src/apiClient');
    jest.spyOn(api, 'fetchItemDetails').mockRejectedValue(new Error('boom'));
    const { enhanceMovieCards } = require('../src/orchestrator');
    const count = await enhanceMovieCards({ baseUrl: 'http://s', token: 't', options: {} });
    expect(count).toBe(0);
    const card = document.querySelector('.card');
    expect(card.getAttribute('data-enhanced-error')).toBe('1');
  });

  it('skips cards without data-id without calling fetch', async () => {
    document.body.innerHTML = `
      <div class="card" data-type="Movie">
        <div class="cardText"><div class="cardText-first">No ID</div></div>
      </div>`;
  const api = require('../src/apiClient');
  const spy = jest.spyOn(api, 'fetchItemDetails');
  const { enhanceMovieCards } = require('../src/orchestrator');
    const count = await enhanceMovieCards({ baseUrl: 'http://s', token: 't', options: {} });
    expect(count).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });
});
