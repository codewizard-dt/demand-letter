import path from 'node:path';
import { config } from 'dotenv';

config({ path: path.resolve(process.cwd(), '../..', '.env') });

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
const requiredEnv = ['DOCUMENTS_BUCKET'] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

async function main() {
  const { createApp } = await import('./app');
  const app = createApp();

  app.listen(port, host, () => {
    console.log(`Demand Letter server listening on http://${host}:${port}`);
  });
}

void main();
