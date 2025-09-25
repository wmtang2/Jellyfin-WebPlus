// tests/apiClient.test.js
const { fetchItemDetails, __resetCache } = require('../src/apiClient');

function makeFetch(resultObj, { status = 200 } = {}) {
  const mock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => resultObj,
  });
  return mock;
}

describe('fetchItemDetails caching', () => {
  beforeEach(() => __resetCache());

  it('fetches item first time and caches second', async () => {
    const mockFetch = makeFetch({ Id: '1', Path: '/media/a.mkv', MediaSources: [] });
    const baseUrl = 'http://server';
    const token = 't';
    const r1 = await fetchItemDetails('1', { baseUrl, token, fetchImpl: mockFetch });
    const r2 = await fetchItemDetails('1', { baseUrl, token, fetchImpl: mockFetch });
    expect(r1).toBe(r2); // same object instance from cache
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('forceRefresh triggers a new network call', async () => {
    const mockFetch = makeFetch({ Id: '1' });
    const opts = { baseUrl: 'http://s', token: 't', fetchImpl: mockFetch };
    await fetchItemDetails('1', opts);
    await fetchItemDetails('1', { ...opts, forceRefresh: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('different fields arrays produce separate cache entries', async () => {
    const mockFetch = makeFetch({ Id: '1' });
    const opts = { baseUrl: 'http://s', token: 't', fetchImpl: mockFetch };
    await fetchItemDetails('1', { ...opts, fields: ['Path'] });
    await fetchItemDetails('1', { ...opts, fields: ['MediaSources'] });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('rejects when no itemId provided', async () => {
    await expect(fetchItemDetails('', { baseUrl: 'http://s', token: 't', fetchImpl: makeFetch({}) })).rejects.toThrow();
  });

  it('rejects on non-OK status', async () => {
    const mockFetch = makeFetch({}, { status: 500 });
    await expect(fetchItemDetails('1', { baseUrl: 'http://s', token: 't', fetchImpl: mockFetch })).rejects.toThrow('status 500');
  });

  it('handles malformed JSON safely (json throws)', async () => {
    const badFetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('bad json'); } });
    await expect(fetchItemDetails('1', { baseUrl: 'http://s', token: 't', fetchImpl: badFetch })).rejects.toThrow('bad json');
  });

  it('normalizes missing properties', async () => {
    const mockFetch = makeFetch({ Id: '1' });
    const data = await fetchItemDetails('1', { baseUrl: 'http://s', token: 't', fetchImpl: mockFetch });
    expect(data.MediaSources).toEqual([]);
  });
});
