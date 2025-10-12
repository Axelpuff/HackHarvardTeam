import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

export class TestServer {
  private process: ChildProcess | null = null;
  private readonly port: number = 3000;
  private readonly baseUrl: string = `http://localhost:${this.port}`;

  async start(): Promise<void> {
    if (this.process) {
      console.log('Test server already running');
      return;
    }

    console.log('Starting Next.js test server...');

    // Set NODE_ENV to test for the server process
    const env = { ...process.env, NODE_ENV: 'test' as const };

    this.process = spawn('npm', ['run', 'dev'], {
      env: env as NodeJS.ProcessEnv,
      stdio: 'pipe',
    });

    if (!this.process) {
      throw new Error('Failed to start test server process');
    }

    // Handle process errors
    this.process.on('error', (error) => {
      console.error('Test server process error:', error);
    });

    // Wait for server to be ready
    await this.waitForServer();
    console.log(`Test server ready at ${this.baseUrl}`);
  }

  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    console.log('Stopping test server...');

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      this.process.on('close', () => {
        this.process = null;
        console.log('Test server stopped');
        resolve();
      });

      // Try graceful shutdown first
      this.process.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  private async waitForServer(maxAttempts: number = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${this.baseUrl}/api/healthcheck`);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Server not ready yet, continue waiting
      }

      await sleep(1000); // Wait 1 second between attempts
    }

    throw new Error(`Test server failed to start after ${maxAttempts} seconds`);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Global test server instance
let globalTestServer: TestServer | null = null;

export async function setupTestServer(): Promise<TestServer> {
  if (!globalTestServer) {
    globalTestServer = new TestServer();
    await globalTestServer.start();

    // Ensure cleanup on process exit
    process.on('exit', async () => {
      if (globalTestServer) {
        await globalTestServer.stop();
      }
    });

    process.on('SIGINT', async () => {
      if (globalTestServer) {
        await globalTestServer.stop();
      }
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      if (globalTestServer) {
        await globalTestServer.stop();
      }
      process.exit(0);
    });
  }

  return globalTestServer;
}

export async function teardownTestServer(): Promise<void> {
  if (globalTestServer) {
    await globalTestServer.stop();
    globalTestServer = null;
  }
}
