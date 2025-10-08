// cardEnhancer.dialog.test.js
const { JSDOM } = require('jsdom');
const { triggerDeleteDialog } = require('../src/cardEnhancer');

describe('triggerDeleteDialog', () => {
  beforeEach(() => {
    // Setup DOM
    const dom = new JSDOM('<!DOCTYPE html><body></body>');
    global.document = dom.window.document;
    global.window = dom.window;
  });

  it('should display filename and file size in delete dialog', async () => {
    // Create card element with data attributes
    const card = document.createElement('div');
    card.setAttribute('data-id', 'test123');
    card.setAttribute('data-filename', 'movie.mkv');
    card.setAttribute('data-size', '1.2 GB');
    document.body.appendChild(card);

    // Mock confirm dialog
    global.window.confirm = jest.fn(() => false); // Simulate cancel

    // Call function and await async completion
    await new Promise(resolve => {
      // Patch confirm to resolve after called
      global.window.confirm.mockImplementationOnce((msg) => {
        resolve(msg);
        return false;
      });
      triggerDeleteDialog('test123');
    }).then(dialogText => {
      expect(dialogText).toContain('Filename: movie.mkv');
      expect(dialogText).toContain('Size: 1.2 GB');
    });
  });
});
