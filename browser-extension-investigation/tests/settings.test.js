// tests/settings.test.js
describe('settings module (RED)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns default settings initially', () => {
    const settings = require('../src/settings');
    const s = settings.getSettings();
    expect(s).toEqual({
      showFileSize: true,
      showFileName: true,
      showContainer: true,
      showResolution: true,
      showHDR: true,
      showAudioLanguage: true
    });
  });

  it('merges updates without losing unspecified keys', () => {
    const settings = require('../src/settings');
    settings.updateSettings({ showFileName: false });
    const s = settings.getSettings();
    expect(s.showFileName).toBe(false);
    expect(s.showFileSize).toBe(true); // unchanged
  });

  it('invokes change callbacks on update', () => {
    const settings = require('../src/settings');
    const spy = jest.fn();
    settings.onChange(spy);
    settings.updateSettings({ showContainer: false });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].showContainer).toBe(false);
  });

  it('ignores falsy or non-object updates gracefully', () => {
    const settings = require('../src/settings');
    const before = settings.getSettings();
    settings.updateSettings(null);
    settings.updateSettings(undefined);
    settings.updateSettings(42);
    expect(settings.getSettings()).toBe(before);
  });
});
