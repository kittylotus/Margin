import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';

type BoundStatement = {
  all(): { results: Record<string, unknown>[] };
  run(): unknown;
};

type D1LikeStatement = {
  bind(...values: any[]): BoundStatement;
  all(): { results: Record<string, unknown>[] };
  run(): unknown;
};

type D1LikeDatabase = {
  prepare(sql: string): D1LikeStatement;
};

type MarginGlobal = typeof globalThis & {
  __marginDb?: DatabaseSync;
  __marginSchemaVersion?: number;
};

const MARGIN_SCHEMA_VERSION = 4;
const BUNDLED_EXAMPLE_ID = 'margin-example-ai-slop-v1';

function databasePath() {
  const configured = process.env.MARGIN_DB_PATH?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), 'data', 'margin.sqlite');
}

function initialize(db: DatabaseSync, seedBundledExample = false) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      transcript TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      collection TEXT NOT NULL DEFAULT 'Inbox',
      tags TEXT NOT NULL DEFAULT '',
      favorite INTEGER NOT NULL DEFAULT 0,
      created TEXT NOT NULL,
      headerColor TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS collections (
      name TEXT PRIMARY KEY
    );
    CREATE TABLE IF NOT EXISTS connection_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT '',
      secret TEXT NOT NULL DEFAULT '',
      created TEXT NOT NULL,
      updated TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      articleId TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'highlight',
      exactText TEXT NOT NULL DEFAULT '',
      prefixText TEXT NOT NULL DEFAULT '',
      suffixText TEXT NOT NULL DEFAULT '',
      startOffset INTEGER NOT NULL DEFAULT -1,
      endOffset INTEGER NOT NULL DEFAULT -1,
      note TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'sage',
      created TEXT NOT NULL,
      updated TEXT NOT NULL,
      FOREIGN KEY(articleId) REFERENCES articles(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS annotations_article_idx ON annotations(articleId, created);
  `);

  const articleColumns = db.prepare("PRAGMA table_info(articles)").all() as { name?: string }[];
  if (!articleColumns.some((column) => column.name === 'headerColor')) {
    db.exec("ALTER TABLE articles ADD COLUMN headerColor TEXT NOT NULL DEFAULT ''");
  }

  if (seedBundledExample) {
    try {
      const examplePath = path.join(process.cwd(), 'examples', 'AI Slop is Obvious.md');
      const source = readFileSync(examplePath, 'utf8').replace(/\r\n/g, '\n').trim();
      const titleMatch = source.match(/^#\s+(.+?)\s*\n+/);
      const title = titleMatch?.[1]?.trim() || 'AI Slop is Obvious';
      const content = (titleMatch ? source.slice(titleMatch[0].length) : source).trim();
      if (content) {
        db.prepare(`
          INSERT OR IGNORE INTO articles
            (id,title,content,transcript,url,collection,tags,favorite,created,headerColor)
          VALUES (?,?,?,?,?,?,?,?,?,?)
        `).run(
          BUNDLED_EXAMPLE_ID,
          title,
          content,
          '',
          '',
          'Inbox',
          'AI, Media literacy',
          0,
          new Date().toISOString(),
          '#6674FF',
        );
        db.prepare('INSERT OR IGNORE INTO collections (name) VALUES (?)').run('Inbox');
      }
    } catch (error) {
      console.warn('[Margin] Could not seed the bundled example article.', error);
    }
  }
}

function nativeDatabase() {
  const global = globalThis as MarginGlobal;
  if (global.__marginDb) {
    if (global.__marginSchemaVersion !== MARGIN_SCHEMA_VERSION) {
      initialize(global.__marginDb, false);
      global.__marginSchemaVersion = MARGIN_SCHEMA_VERSION;
    }
    return global.__marginDb;
  }

  const file = databasePath();
  const isFreshDatabase = !existsSync(file);
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  initialize(db, isFreshDatabase);
  global.__marginDb = db;
  global.__marginSchemaVersion = MARGIN_SCHEMA_VERSION;
  return db;
}

function wrapStatement(statement: StatementSync): D1LikeStatement {
  const execute = (values: any[] = []): BoundStatement => ({
    all: () => ({ results: statement.all(...values) as Record<string, unknown>[] }),
    run: () => statement.run(...values),
  });

  return {
    bind: (...values: any[]) => execute(values),
    all: () => execute().all(),
    run: () => execute().run(),
  };
}

export function database(): D1LikeDatabase {
  const db = nativeDatabase();
  return {
    prepare(sql: string) {
      return wrapStatement(db.prepare(sql));
    },
  };
}

export function failure(e: unknown) {
  console.error('[Margin API]', e);
  return Response.json(
    { error: e instanceof Error ? e.message : 'Request failed. Please try again.' },
    { status: 400 },
  );
}

export function sameOrigin(r: Request) {
  const origin = r.headers.get('origin');
  if (!origin) return;

  const source = new URL(origin);
  const requestUrl = new URL(r.url);
  const forwardedHost = r.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || r.headers.get('host');

  if (host && source.host === host) return;
  if (source.origin === requestUrl.origin) return;

  const loopback = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
  const sameLoopbackPort = loopback.has(source.hostname) && loopback.has(requestUrl.hostname) && source.port === requestUrl.port;
  if (sameLoopbackPort) return;

  throw new Error('Request origin is not allowed.');
}
