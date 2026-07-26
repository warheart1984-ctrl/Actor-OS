import 'dotenv/config';
import { createProfile, listProfiles } from '../core/ProfileManager.js';
import { closeDatabase, initDatabase } from './Database.js';
import type { CreateProfileInput } from '../core/ProfileManager.js';

/**
 * Starter agent profiles. Identity is the role; connectors are swappable
 * bindings. Providers without keys fall back to the mock connector.
 */
export const SEED_PROFILES: CreateProfileInput[] = [
  {
    id: 'agent_email',
    name: 'Email Drafter',
    binding: { connector: 'openai', model: 'gpt-4.1' },
    role: 'Drafts clear, professional correspondence',
    settings_json: {
      temperature: 0.6,
      max_tokens: 1024,
      system: 'You draft clear, professional correspondence. Keep it short.',
      capabilities: ['draft', 'email'],
    },
  },
  {
    id: 'agent_research',
    name: 'Research Editor',
    binding: { connector: 'anthropic', model: 'claude-sonnet-4-20250514' },
    role: 'Reviews text for clarity, structure, and unsupported claims',
    settings_json: {
      temperature: 0.2,
      max_tokens: 1500,
      system: 'You review text for clarity, structure, and unsupported claims.',
      capabilities: ['review', 'edit', 'research'],
    },
  },
  {
    id: 'agent_factcheck',
    name: 'Fact Checker',
    binding: { connector: 'gemini', model: 'gemini-2.0-flash' },
    role: 'Verifies factual claims and flags unsupported statements',
    settings_json: {
      temperature: 0.3,
      max_tokens: 1500,
      system: 'You verify factual claims and flag anything unsupported.',
      capabilities: ['fact_check', 'verify'],
    },
  },
  {
    id: 'agent_summary',
    name: 'Summarizer',
    binding: { connector: 'mistral', model: 'mistral-large-latest' },
    role: 'Compresses text into tight summaries without losing decisions',
    settings_json: {
      temperature: 0.4,
      max_tokens: 800,
      system: 'You compress text into a tight summary without losing decisions.',
      capabilities: ['summarize'],
    },
  },
];

/** Inserts starter agent profiles only when the profiles table is empty. */
export async function seedIfEmpty(): Promise<number> {
  const existing = await listProfiles();
  if (existing.length > 0) return 0;
  for (const profile of SEED_PROFILES) {
    await createProfile(profile);
  }
  return SEED_PROFILES.length;
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('src/db/seed.ts');
if (isDirectRun) {
  await initDatabase();
  const inserted = await seedIfEmpty();
  console.log(
    inserted > 0
      ? `Seeded ${inserted} agent profiles.`
      : 'Agent profiles already exist, nothing to seed.',
  );
  await closeDatabase();
}
