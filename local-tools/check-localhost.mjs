import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`Margin requires Node 22.13+; found ${process.versions.node}.`);
  process.exit(1);
}

const dir = mkdtempSync(path.join(tmpdir(), 'margin-check-'));
try {
  const db = new DatabaseSync(path.join(dir, 'check.sqlite'));
  db.exec('CREATE TABLE test (value TEXT NOT NULL)');
  db.prepare('INSERT INTO test (value) VALUES (?)').run('ok');
  const row = db.prepare('SELECT value FROM test').get();
  if (row?.value !== 'ok') throw new Error('SQLite round-trip returned unexpected data.');
  db.close();
  console.log(`Margin localhost prerequisites OK (Node ${process.versions.node}, node:sqlite working).`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
