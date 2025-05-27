// ABOUTME: Setup file for integration tests
// ABOUTME: Provides configuration and utilities for Things3 integration testing

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global setup for Things3 integration tests
beforeAll(() => {
  console.log('🧪 Starting Things3 Integration Tests');
  console.log('🚨 These tests require Things3 to be running on macOS');
});

afterAll(() => {
  console.log('✅ Things3 Integration Tests Complete');
});