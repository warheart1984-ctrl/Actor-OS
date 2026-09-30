import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { listProfiles } from './core/ProfileManager.js';
import { closeDatabase, initDatabase } from './db/Database.js';
import { readSecurityConfig } from './api/auth.js';
import { pipelineAgentIds } from './core/CrewPipeline.js';
import { ensureSeedProfiles, seedIfEmpty } from './db/seed.js';
import { buildServices } from './services.js';
import { describeRegistry } from './models/connectors/registry.js';
import { attachWebSocket } from './ws.js';

async function main(): Promise<void> {
  const database = await initDatabase();
  const seeded = await seedIfEmpty();
  // Older databases predate the pipeline agents; add only the missing ones.
  const addedPipelineAgents = await ensureSeedProfiles(pipelineAgentIds());

  const services = buildServices();

  // Registering every profile makes broadcast() reach all of them; direct
  // dispatch does not depend on these handlers.
  for (const profile of await listProfiles()) {
    services.agents.registerProfileHandler(profile.id, (message) => {
      console.log(`[bus] ${message.from_profile} -> ${message.to_profile} (${message.id})`);
    });
  }

  const security = readSecurityConfig();
  const app = createApp(services, security);
  const server = createServer(app);
  attachWebSocket(server, services.lineage, security);

  const port = Number(process.env['PORT'] ?? 4000);
  // Loopback by default: the API is reachable from other machines only when
  // HOST is set explicitly (Docker sets HOST=0.0.0.0).
  const host = process.env['HOST']?.trim() || '127.0.0.1';
  const loopback = host === '127.0.0.1' || host === 'localhost' || host === '::1';
  server.listen(port, host, () => {
    const providers = describeRegistry(services.connectors)
      .map((entry) => `${entry.provider}=${entry.live ? 'live' : 'mock'}`)
      .join(' ');
    console.log(`LineageStudio API on http://${host}:${port} (db: ${database.dialect})`);
    if (seeded > 0) console.log(`Seeded ${seeded} starter profiles.`);
    else if (addedPipelineAgents > 0) console.log(`Added ${addedPipelineAgents} pipeline agent profiles.`);
    console.log(`Auth: ${security.apiToken ? 'bearer token required' : 'open (no LINEAGE_API_TOKEN)'}`);
    if (!security.apiToken && !loopback) {
      console.warn(
        `WARNING: listening on ${host} with no LINEAGE_API_TOKEN. Anyone who can reach this port can use your provider keys.`,
      );
    }
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
