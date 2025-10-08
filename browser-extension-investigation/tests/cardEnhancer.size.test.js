// cardEnhancer.size.test.js
const { JSDOM } = require('jsdom');
const { addAttributesToCard } = require('../src/cardEnhancer');

describe('addAttributesToCard - file size attribute', () => {
  it('sets data-size attribute on card element', () => {
    const dom = new JSDOM('<div class="card" data-id="123"><div class="cardText"></div></div>');
    const cardEl = dom.window.document.querySelector('.card');
    const attributes = ['49.4 MB', 'filename.mp4'];
    addAttributesToCard(cardEl, attributes, {});
    expect(cardEl.getAttribute('data-size')).toBe('49.4 MB');
  });
});
