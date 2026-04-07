import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import db from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// docs/ folder lives at the project root (one level up from server/)
const DOCS_DIR = path.join(__dirname, '..', 'docs')

const app = express()
app.use(express.json({ limit: '50mb' }))

// ── Inline doc types & parser (mirrors useDocParser.ts) ───────────────────────

interface ColumnDoc { name: string; type?: string; required?: boolean; summary: string }
interface TableDoc  { tableName: string; overview: string; group?: string; columns: ColumnDoc[]; raw: string }

function parseDocFile(filename: string, content: string): TableDoc {
  const tableName = filename.replace(/\.md$/i, '')
  let overview = ''
  let group: string | undefined
  const columns: ColumnDoc[] = []
  const lines = content.split('\n')
  let section = ''
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)/)
    if (h2) { section = h2[1].trim().toLowerCase(); continue }
    if (line.startsWith('# ')) continue
    if (section === 'visão geral' || section === 'visao geral') {
      if (line.trim()) overview += (overview ? '\n' : '') + line.trim()
    } else if (section === 'grupo') {
      if (line.trim() && !group) group = line.trim()
    } else if (section === 'colunas') {
      const m = line.match(/^-\s+\*\*([^*]+)\*\*\s*(?:\(([^)]*)\))?\s*(?:\[([^\]]*)\])?\s*(?:[—-]\s*)?(.+)?/)
      if (m) {
        const [, name, type, req, summary] = m
        columns.push({ name: name.trim(), type: type?.trim(), required: req ? /obrig/i.test(req) : undefined, summary: summary?.trim() ?? '' })
      }
    }
  }
  return { tableName, overview, group, columns, raw: content }
}

// ── Docs routes ───────────────────────────────────────────────────────────────

app.get('/api/docs/status', (_req, res) => {
  try {
    if (!fs.existsSync(DOCS_DIR)) { res.json({ exists: false, count: 0, files: [] }); return }
    const files = fs.readdirSync(DOCS_DIR).filter(f => f.toLowerCase().endsWith('.md'))
    res.json({ exists: true, count: files.length, files })
  } catch (e) { res.status(500).json({ error: String(e) }) }
})

app.get('/api/docs', (_req, res) => {
  try {
    if (!fs.existsSync(DOCS_DIR)) { res.json({ docs: {}, warning: 'Pasta docs/ não encontrada.' }); return }
    const files = fs.readdirSync(DOCS_DIR).filter(f => f.toLowerCase().endsWith('.md'))
    if (files.length === 0) { res.json({ docs: {}, warning: 'Nenhum arquivo .md encontrado em docs/.' }); return }
    const docs: Record<string, TableDoc> = {}
    const errors: string[] = []
    for (const filename of files) {
      try {
        const content = fs.readFileSync(path.join(DOCS_DIR, filename), 'utf-8')
        const doc = parseDocFile(filename, content)
        docs[doc.tableName] = doc
      } catch (e) { errors.push(`${filename}: ${String(e)}`) }
    }
    res.json({ docs, warning: errors.length ? `Erros de parse: ${errors.join('; ')}` : null })
  } catch (e) { res.status(500).json({ error: String(e) }) }
})

app.post('/api/docs/open-folder', (_req, res) => {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true })
  const platform = process.platform
  const [cmd, args]: [string, string[]] = platform === 'win32'
    ? ['explorer', [DOCS_DIR.replace(/\//g, '\\')]]
    : platform === 'darwin'
      ? ['open', [DOCS_DIR]]
      : ['xdg-open', [DOCS_DIR]]
  execFile(cmd, args, (err) => {
    // explorer.exe always returns non-zero exit code on Windows — ignore it
    if (err && platform !== 'win32') { res.status(500).json({ error: err.message }); return }
    res.json({ ok: true, path: DOCS_DIR })
  })
})

// ── Positions ────────────────────────────────────────────────────────────────

app.get('/api/positions/:schemaId', (req, res) => {
  const { schemaId } = req.params
  const rows = db.prepare('SELECT table_name, x, y FROM node_positions WHERE schema_id = ?').all(schemaId)
  res.json(rows)
})

app.post('/api/positions/:schemaId', (req, res) => {
  const { schemaId } = req.params
  const { table_name, x, y } = req.body
  if (!table_name || x == null || y == null) { res.status(400).json({ error: 'Missing fields' }); return }
  db.prepare(`
    INSERT INTO node_positions (schema_id, table_name, x, y, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(schema_id, table_name) DO UPDATE SET x=excluded.x, y=excluded.y, updated_at=excluded.updated_at
  `).run(schemaId, table_name, x, y)
  res.json({ ok: true })
})

app.delete('/api/positions/:schemaId', (req, res) => {
  const { schemaId } = req.params
  db.prepare('DELETE FROM node_positions WHERE schema_id = ?').run(schemaId)
  res.json({ ok: true })
})

// ── Notes ────────────────────────────────────────────────────────────────────

app.get('/api/notes/:schemaId/:tableName', (req, res) => {
  const { schemaId, tableName } = req.params
  const row = db.prepare('SELECT note FROM table_notes WHERE schema_id=? AND table_name=?').get(schemaId, tableName) as any
  res.json({ note: row?.note ?? '' })
})

app.post('/api/notes/:schemaId/:tableName', (req, res) => {
  const { schemaId, tableName } = req.params
  const { note } = req.body
  db.prepare(`
    INSERT INTO table_notes (schema_id, table_name, note, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(schema_id, table_name) DO UPDATE SET note=excluded.note, updated_at=excluded.updated_at
  `).run(schemaId, tableName, note ?? '')
  res.json({ ok: true })
})

// ── Workspaces ────────────────────────────────────────────────────────────────

app.get('/api/workspaces', (_req, res) => {
  const rows = db.prepare('SELECT id, name, saved_at FROM workspaces ORDER BY saved_at DESC').all()
  res.json(rows)
})

app.get('/api/workspaces/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM workspaces WHERE id=?').get(req.params.id) as any
  if (!row) { res.status(404).json({ error: 'Not found' }); return }
  res.json({ ...row, data: JSON.parse(row.data) })
})

app.post('/api/workspaces', (req, res) => {
  const { id, name, data } = req.body
  if (!id || !name || !data) { res.status(400).json({ error: 'Missing fields' }); return }
  const savedAt = new Date().toISOString()
  db.prepare(`
    INSERT INTO workspaces (id, name, saved_at, data) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, saved_at=excluded.saved_at, data=excluded.data
  `).run(id, name, savedAt, JSON.stringify(data))
  // Save as last workspace
  db.prepare(`INSERT INTO app_settings (key, value) VALUES ('last_workspace', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(id)
  res.json({ ok: true, savedAt })
})

app.delete('/api/workspaces/:id', (req, res) => {
  db.prepare('DELETE FROM workspaces WHERE id=?').run(req.params.id)
  res.json({ ok: true })
})

app.get('/api/settings/last-workspace', (_req, res) => {
  const row = db.prepare("SELECT value FROM app_settings WHERE key='last_workspace'").get() as any
  res.json({ lastWorkspace: row?.value ?? null })
})

const PORT = 3333
app.listen(PORT, () => {
  console.log(`Schema Viewer API running on http://localhost:${PORT}`)
})
