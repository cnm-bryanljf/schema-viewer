import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'schema-viewer.db')

const db = new Database(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS node_positions (
    schema_id   TEXT NOT NULL,
    table_name  TEXT NOT NULL,
    x           REAL NOT NULL,
    y           REAL NOT NULL,
    updated_at  TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (schema_id, table_name)
  );

  CREATE TABLE IF NOT EXISTS table_notes (
    schema_id   TEXT NOT NULL,
    table_name  TEXT NOT NULL,
    note        TEXT,
    updated_at  TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (schema_id, table_name)
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    saved_at    TEXT NOT NULL,
    data        TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

export default db
