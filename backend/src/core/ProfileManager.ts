import { randomUUID } from 'node:crypto';
import { getDb, parseJsonColumn } from '../db/Database.js';
import { parseBinding, serializeBinding, type ModelBinding } from './ModelBinding.js';
import type { Profile, ProfileSettings } from '../types.js';

type ProfileRow = {
  id: string;
  name: string;
  model_type: string;
  role: string | null;
  settings_json: unknown;
};

function toProfile(row: ProfileRow): Profile {
  const settings = parseJsonColumn<ProfileSettings>(row.settings_json, {});
  const binding = parseBinding(row.model_type);
  // settings.model is an invocation override; binding.model is the profile default.
  return {
    id: row.id,
    name: row.name,
    model_type: row.model_type,
    binding,
    role: row.role,
    settings_json: settings,
  };
}

export async function listProfiles(): Promise<Profile[]> {
  const rows = await getDb().all<ProfileRow>(
    'SELECT id, name, model_type, role, settings_json FROM profiles ORDER BY name ASC',
  );
  return rows.map(toProfile);
}

export async function findProfile(id: string): Promise<Profile | undefined> {
  const row = await getDb().get<ProfileRow>(
    'SELECT id, name, model_type, role, settings_json FROM profiles WHERE id = ?',
    [id],
  );
  return row ? toProfile(row) : undefined;
}

export async function loadProfile(id: string): Promise<Profile> {
  const profile = await findProfile(id);
  if (!profile) {
    throw new Error(`Agent profile not found: ${id}`);
  }
  return profile;
}

export type CreateProfileInput = {
  id?: string;
  name: string;
  /** Prefer `binding`; `model_type` kept for API compat. */
  model_type?: string;
  binding?: ModelBinding;
  role?: string | null;
  settings_json?: ProfileSettings;
};

function resolveModelType(input: CreateProfileInput | UpdateProfileInput, fallback?: string): string {
  if (input.binding) {
    return serializeBinding(input.binding);
  }
  if (typeof input.model_type === 'string' && input.model_type.length > 0) {
    return input.model_type;
  }
  if (fallback) return fallback;
  throw new Error('Agent profile requires binding { connector, model } or model_type');
}

export async function createProfile(input: CreateProfileInput): Promise<Profile> {
  const modelType = resolveModelType(input);
  const profile: Profile = {
    id: input.id ?? randomUUID(),
    name: input.name,
    model_type: modelType,
    binding: parseBinding(modelType),
    role: input.role ?? null,
    settings_json: input.settings_json ?? {},
  };
  await getDb().run(
    `INSERT INTO profiles (id, name, model_type, role, settings_json)
     VALUES (?, ?, ?, ?, ?)`,
    [
      profile.id,
      profile.name,
      profile.model_type,
      profile.role,
      JSON.stringify(profile.settings_json),
    ],
  );
  return profile;
}

export type UpdateProfileInput = {
  name?: string;
  model_type?: string;
  binding?: ModelBinding;
  role?: string | null;
  settings_json?: ProfileSettings;
};

export async function updateProfile(id: string, input: UpdateProfileInput): Promise<Profile> {
  const current = await loadProfile(id);
  const modelType =
    input.binding || input.model_type
      ? resolveModelType(input, current.model_type)
      : current.model_type;
  const next: Profile = {
    id: current.id,
    name: input.name ?? current.name,
    model_type: modelType,
    binding: parseBinding(modelType),
    role: input.role === undefined ? current.role : input.role,
    settings_json: input.settings_json ?? current.settings_json,
  };
  await getDb().run(
    `UPDATE profiles SET name = ?, model_type = ?, role = ?, settings_json = ? WHERE id = ?`,
    [next.name, next.model_type, next.role, JSON.stringify(next.settings_json), next.id],
  );
  return next;
}
