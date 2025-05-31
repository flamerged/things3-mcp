// ABOUTME: Setup file for integration tests
// ABOUTME: Provides configuration and utilities for Things3 integration testing

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

// Increase timeout for integration tests
jest.setTimeout(120000); // 2 minutes

// Global setup for Things3 integration tests
beforeAll(() => {
  console.log('🧪 Starting Things3 Integration Tests');
  console.log('🚨 These tests require Things3 to be running on macOS');
});

afterAll(() => {
  console.log('✅ Things3 Integration Tests Complete');
});