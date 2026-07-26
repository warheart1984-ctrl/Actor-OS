import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export type SqlParam = string | number | boolean | null;

export type Dialect = 'sqlite' | 'postgres';

/**
 * Minimal async data-access surface shared by both drivers. SQL is written
 * with `?` placeholders; the Postgres driver rewrites them to `$n`.
 */
export interface Database {
  readonly dialect: Dialect;
  get<T>(sql: string, params?: SqlParam[]): Promise<T | undefined>;
  all<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  run(sql: string, params?: SqlParam[]): Promise<void>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

const moduleDir = dirname(fileURLToPath(import.meta.url));

function readSchema(dialect: Dialect): string {
  const file = dialect === 'postgres' ? 'schema.postgres.sql' : 'schema.sql';
  return readFileSync(join(moduleDir, file), 'utf8');
}

class SqliteDatabase implements Database {
  readonly dialect = 'sqlite' as const;
  private readonly handle: DatabaseSync;

  constructor(location: string) {
    if (location !== ':memory:') {
      mkdirSync(dirname(location), { recursive: true });
    }
    this.handle = new DatabaseSync(location);
    this.handle.exec('PRAGMA journal_mode = WAL;');
    this.handle.exec('PRAGMA foreign_keys = ON;');
  }

  async get<T>(sql: string, params: SqlParam[] = []): Promise<T | undefined> {
    const row = this.handle.prepare(sql).get(...(params as never[]));
    return row === undefined ? undefined : ({ ...(row as object) } as T);
  }

  async all<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    const rows = this.handle.prepare(sql).all(...(params as never[]));
    return rows.map((row) => ({ ...(row as object) }) as T);
  }

  async run(sql: string, params: SqlParam[] = []): Promise<void> {
    this.handle.prepare(sql).run(...(params as never[]));
  }

  async exec(sql: string): Promise<void> {
    this.handle.exec(sql);
  }

  async close(): Promise<void> {
    this.handle.close();
  }
}

class PostgresDatabase implements Database {
  readonly dialect = 'postgres' as const;
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  /** Rewrites `?` placeholders into Postgres `$n` positional parameters. */
  private static toPositional(sql: string): string {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }

  async get<T>(sql: string, params: SqlParam[] = []): Promise<T | undefined> {
    const result = await this.pool.query(PostgresDatabase.toPositional(sql), params);
    return result.rows[0] as T | undefined;
  }

  async all<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    const result = await this.pool.query(PostgresDatabase.toPositional(sql), params);
    return result.rows as T[];
  }

  async run(sql: string, params: SqlParam[] = []): Promise<void> {
    await this.pool.query(PostgresDatabase.toPositional(sql), params);
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export type DatabaseConfig = {
  driver?: Dialect;
  /** SQLite file path, or `:memory:`. Ignored for Postgres. */
  location?: string;
  /** Postgres connection string. Ignored for SQLite. */
  connectionString?: string;
};

let instance: Database | null = null;

export function createDatabase(config: DatabaseConfig = {}): Database {
  const driver = config.driver ?? ((process.env.DATABASE_DRIVER as Dialect | undefined) ?? 'sqlite');
  if (driver === 'postgres') {
    const connectionString = config.connectionString ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required when DATABASE_DRIVER=postgres');
    }
    return new PostgresDatabase(connectionString);
  }
  const location = config.location ?? process.env.SQLITE_PATH ?? join(process.cwd(), 'data', 'lineage.sqlite');
  return new SqliteDatabase(location);
}

/** Creates the database, applies the schema, and installs it as the singleton. */
export async function initDatabase(config: DatabaseConfig = {}): Promise<Database> {
  const database = createDatabase(config);
  await database.exec(readSchema(database.dialect));
  await migrateSchema(database);
  instance = database;
  return database;
}

/**
 * Additive migrations for databases created before newer columns existed.
 * CREATE TABLE IF NOT EXISTS does not alter existing tables.
 */
async function migrateSchema(database: Database): Promise<void> {
  if (database.dialect === 'sqlite') {
    const columns = await database.all<{ name: string }>('PRAGMA table_info(tasks)');
    if (!columns.some((column) => column.name === 'spec_json')) {
      await database.exec('ALTER TABLE tasks ADD COLUMN spec_json TEXT');
    }
    return;
  }
  await database.exec('ALTER TABLE tasks ADD COLUMN IF NOT EXISTS spec_json JSONB');
}

export function getDb(): Database {
  if (!instance) {
    throw new Error('Database not initialized. Call initDatabase() before using getDb().');
  }
  return instance;
}

export async function closeDatabase(): Promise<void> {
  if (instance) {
    await instance.close();
    instance = null;
  }
}

/**
 * JSON columns come back as strings on SQLite and as parsed objects on
 * Postgres. This normalizes both into a plain object.
 */
export function parseJsonColumn<T extends object>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? (parsed as T) : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function nowIso(): string {
  return new Date().toISOString();
}
