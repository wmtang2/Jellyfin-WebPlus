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
