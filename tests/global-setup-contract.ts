import { setupTestServer, teardownTestServer } from './test-server';

export async function setup() {
  console.log('Setting up test server for contract tests...');
  await setupTestServer();
}

export async function teardown() {
  console.log('Tearing down test server...');
  await teardownTestServer();
}
