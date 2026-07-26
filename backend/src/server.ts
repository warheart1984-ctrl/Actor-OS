import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { listProfiles } from './core/ProfileManager.js';
import { closeDatabase, initDatabase } from './db/Database.js';
import { seedIfEmpty } from './db/seed.js';
import { buildServices } from './services.js';
import { describeRegistry } from './models/connectors/registry.js';
import { attachWebSocket } from './ws.js';

async function main(): Promise<void> {
  const database = await initDatabase();
  const seeded = await seedIfEmpty();

  const services = buildServices();

  // Registering every profile makes broadcast() reach all of them; direct
  // dispatch does not depend on these handlers.
  for (const profile of await listProfiles()) {
    services.agents.registerProfileHandler(profile.id, (message) => {
      console.log(`[bus] ${message.from_profile} -> ${message.to_profile} (${message.id})`);
    });
  }

  const app = createApp(services);
  const server = createServer(app);
  attachWebSocket(server, services.lineage);

  const port = Number(process.env['PORT'] ?? 4000);
  server.listen(port, () => {
    const providers = describeRegistry(services.connectors)
      .map((entry) => `${entry.provider}=${entry.live ? 'live' : 'mock'}`)
      .join(' ');
    console.log(`LineageStudio API on http://localhost:${port} (db: ${database.dialect})`);
    if (seeded > 0) console.log(`Seeded ${seeded} starter profiles.`);
    console.log(`Providers: ${providers}`);
  });

  const shutdown = async (): Promise<void> => {
    server.close();
    await closeDatabase();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((error: unknown) => {
  console.error('Failed to start LineageStudio API:', error);
  process.exit(1);
});
