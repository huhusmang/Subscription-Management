const path = require('path');

module.exports = {
    testEnvironment: 'node',
    rootDir: path.resolve(__dirname, '..'),
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    clearMocks: true,
    collectCoverageFrom: [
        'routes/**/*.js',
        'services/**/*.js',
        'config/**/*.js',
        'db/**/*.js',
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/tests/',
    ],
};
