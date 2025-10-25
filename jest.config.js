module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/*.spec.ts', '**/tests/*.spec.js'],
  moduleFileExtensions: ['ts', 'js'],
  collectCoverage: false,
  verbose: true,
};
