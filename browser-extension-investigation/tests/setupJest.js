// tests/setupJest.js
// Setup file for Jest (jsdom)

// Polyfill browser APIs if needed
window.browser = {
  runtime: { onMessage: { addListener: jest.fn() }, sendMessage: jest.fn() },
  storage: { 
    sync: { 
      get: jest.fn().mockResolvedValue({}), 
      set: jest.fn().mockResolvedValue() 
    }, 
    local: { 
      get: jest.fn().mockResolvedValue({}), 
      set: jest.fn().mockResolvedValue() 
    },
    onChanged: {
      addListener: jest.fn()
    }
  },
  tabs: { query: jest.fn(), sendMessage: jest.fn() }
};

global.browser = window.browser;
// Polyfill TextEncoder for jsdom
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder } = require('util');
  global.TextEncoder = TextEncoder;
}
// Polyfill TextDecoder for jsdom
if (typeof global.TextDecoder === 'undefined') {
  const { TextDecoder } = require('util');
  global.TextDecoder = TextDecoder;
}
