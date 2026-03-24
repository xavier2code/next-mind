import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
beforeAll(() => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/nextmind_test';
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-key-min-32-characters-long';
});
