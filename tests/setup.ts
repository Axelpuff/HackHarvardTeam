// Test setup for all test environments
import { vi } from 'vitest';

// Mock NextAuth
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn(),
}));

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
