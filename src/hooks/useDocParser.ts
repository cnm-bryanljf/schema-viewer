import type { TableDoc, ColumnDoc, DocsMap } from '../types'

/**
 * Parse a single .md file following the project's documentation format:
 *
 * # tableName
 * ## Visão geral
 * ...text...
 * ## Grupo
 * GroupName
 * ## Colunas
 * - **col** (type) [Obrigatório|Opcional] — summary text
 * ## Relações
 * ...
 */
export function parseDocFile(filename: string, content: string): TableDoc {
  const tableName = filename.replace(/\.md$/i, '')

  let overview = ''
  let group: string | undefined
  const columns: ColumnDoc[] = []

  const lines = content.split('\n')
  let section = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const h2 = line.match(/^##\s+(.+)/)
    if (h2) {
      section = h2[1].trim().toLowerCase()
      continue
    }
    // Skip h1
    if (line.startsWith('# ')) continue

    if (section === 'visão geral' || section === 'visao geral') {
      if (line.trim()) overview += (overview ? '\n' : '') + line.trim()
    } else if (section === 'grupo') {
      if (line.trim() && !group) group = line.trim()
    } else if (section === 'colunas') {
      // - **col_name** (type) [Obrigatório|Opcional] — summary
      // Also handles: - **col** (type) [Req] FK → table.col — summary (dash is optional)
      const m = line.match(/^-\s+\*\*([^*]+)\*\*\s*(?:\(([^)]*)\))?\s*(?:\[([^\]]*)\])?\s*(?:[—-]\s*)?(.+)?/)
      if (m) {
        const [, name, type, req, summary] = m
        columns.push({
          name: name.trim(),
          type: type?.trim(),
          required: req ? /obrig/i.test(req) : undefined,
          summary: summary?.trim() ?? '',
        })
      }
    }
    // skip Relações section
  }

  return { tableName, overview, group, columns, raw: content }
}

/**
 * Detect if a file contains multiple tables (each starting with "# table_name").
 * Returns an array of TableDoc, one per table found.
 */
export function parseMultiDocFile(content: string): TableDoc[] {
  const results: TableDoc[] = []
  // Split on lines that start with "# " followed by a word (table name)
  const parts = content.split(/(?=^# [a-zA-Z_]\w*\s*$)/m)
  for (const part of parts) {
    const h1 = part.match(/^# ([a-zA-Z_]\w*)\s*$/m)
    if (!h1) continue
    const tableName = h1[1].trim()
    const doc = parseDocFile(tableName + '.md', part.replace(/^# [a-zA-Z_]\w*\s*\n/, ''))
    results.push({ ...doc, tableName })
  }
  return results
}

export function verifyDocs(docs: DocsMap, tableNames: string[]): { missing: string[]; extra: string[] } {
  const docNames = new Set(Object.keys(docs))
  const schemaNames = new Set(tableNames)
  const missing = tableNames.filter(n => !docNames.has(n))
  const extra = [...docNames].filter(n => !schemaNames.has(n))
  return { missing, extra }
}

// ── Template ──────────────────────────────────────────────────────────────────

export function generateDocTemplate(): string {
  return `# nome_da_tabela

## Visão geral
Breve descrição do propósito desta tabela no sistema. Explique o que ela armazena,
qual o seu papel no domínio do negócio e quaisquer regras de negócio relevantes.

## Grupo
Nome do Grupo (ex: Clientes, Pedidos, Estoque)

## Colunas
- **id** (int) [Obrigatório] — Identificador único auto-incremento.
- **nome** (varchar 200) [Obrigatório] — Nome completo do registro.
- **descricao** (text) [Opcional] — Descrição detalhada, pode ser nula.
- **id_categoria** (int) [Opcional] FK → tb_categoria.id — Categoria associada ao registro.
- **ativo** (int) [Opcional, padrão 1] — Flag de ativação: 1=ativo, 0=inativo.
- **deleted** (int) [Opcional, padrão 0] — Soft-delete: 1=removido.
- **data_cadastro** (datetime) [Opcional] — Data e hora de criação do registro.
- **data_alteracao** (datetime) [Opcional] — Data e hora da última alteração.

## Relações
### Referencia (FK de saída)
- \`id_categoria\` → tb_categoria.id

### Referenciada por (FK de entrada)
- tb_outra_tabela.id_nome_da_tabela
`
}
