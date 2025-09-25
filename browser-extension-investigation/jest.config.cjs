module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  moduleFileExtensions: ['js', 'json', 'mjs'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupJest.js'],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[tj]s?(x)',
    '**/?(*.)+(spec|test).mjs'
  ],
};
