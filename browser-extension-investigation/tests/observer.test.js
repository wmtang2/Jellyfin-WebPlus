// tests/observer.test.js
jest.useFakeTimers();

describe('startEnhancerLoop (observer)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
  });

  it('invokes enhanceMovieCards immediately on start', async () => {
    const enhanceSpy = jest.fn().mockResolvedValue(1);
    jest.doMock('../src/orchestrator', () => ({ enhanceMovieCards: enhanceSpy }));
    const { startEnhancerLoop } = require('../src/observer');
    startEnhancerLoop({ baseUrl: 'http://s', token: 't', options: {} });
    expect(enhanceSpy).toHaveBeenCalledTimes(1);
  });

  it('invokes enhance after manual trigger (simulated mutation)', async () => {
    const enhanceSpy = jest.fn().mockResolvedValue(0);
    jest.doMock('../src/orchestrator', () => ({ enhanceMovieCards: enhanceSpy }));
    const { startEnhancerLoop } = require('../src/observer');
    const handle = startEnhancerLoop({ baseUrl: 'http://s', token: 't', options: {} });
    enhanceSpy.mockClear();
    // Simulate via manual trigger
    handle.triggerEnhance();
    jest.runAllTimers();
    await Promise.resolve();
    expect(enhanceSpy).toHaveBeenCalledTimes(1);
  });

  it('does not invoke after disconnect is called', async () => {
    const enhanceSpy = jest.fn().mockResolvedValue(0);
    jest.doMock('../src/orchestrator', () => ({ enhanceMovieCards: enhanceSpy }));
    const { startEnhancerLoop } = require('../src/observer');
    const handle = startEnhancerLoop({ baseUrl: 'http://s', token: 't', options: {} });
    enhanceSpy.mockClear();
    handle.disconnect();
    document.body.appendChild(document.createElement('div'));
    jest.advanceTimersByTime(150);
    await Promise.resolve();
    expect(enhanceSpy).not.toHaveBeenCalled();
  });
});
