import type { ParsedSchema, ParsedRef, ParsedColumn, ParsedTable } from '../types'

// ── Relation symbol ────────────────────────────────────────────────────────────

function relSymbol(rel: ParsedRef['relation']): string {
  switch (rel) {
    case '1-1': return '-'
    case '1-N': return '<'
    case 'N-1': return '>'
    case 'N-N': return '<>'
  }
}

// ── DBML serializer ────────────────────────────────────────────────────────────

export function schemaToDbml(schema: ParsedSchema): string {
  const lines: string[] = []

  for (const table of schema.tables) {
    lines.push(`Table ${table.name} {`)
    for (const col of table.columns) {
      const attrs: string[] = []
      if (col.pk) attrs.push('pk')
      if (!col.nullable) attrs.push('not null')
      if (col.note) attrs.push(`note: '${col.note.replace(/'/g, "\\'")}'`)
      const attrStr = attrs.length ? ` [${attrs.join(', ')}]` : ''
      lines.push(`  ${col.name} ${col.type || 'int'}${attrStr}`)
    }
    lines.push('}')
    lines.push('')
  }

  for (const ref of schema.refs) {
    lines.push(`Ref: ${ref.fromTable}.${ref.fromColumn} ${relSymbol(ref.relation)} ${ref.toTable}.${ref.toColumn}`)
  }

  // TableGroups
  const groups = new Map<string, string[]>()
  for (const table of schema.tables) {
    if (table.group) {
      if (!groups.has(table.group)) groups.set(table.group, [])
      groups.get(table.group)!.push(table.name)
    }
  }
  if (groups.size > 0) {
    lines.push('')
    for (const [name, tables] of groups) {
      lines.push(`TableGroup "${name}" {`)
      for (const t of tables) lines.push(`  ${t}`)
      lines.push('}')
    }
  }

  return lines.join('\n').trim()
}

// ── Relation mutations ────────────────────────────────────────────────────────

export function addRelation(schema: ParsedSchema, ref: ParsedRef): ParsedSchema {
  return { ...schema, refs: [...schema.refs, ref] }
}

export function removeRelation(schema: ParsedSchema, ref: ParsedRef): ParsedSchema {
  return {
    ...schema,
    refs: schema.refs.filter(
      r => !(r.fromTable === ref.fromTable && r.fromColumn === ref.fromColumn &&
             r.toTable === ref.toTable && r.toColumn === ref.toColumn)
    ),
  }
}

export function replaceRelation(schema: ParsedSchema, oldRef: ParsedRef, newRef: ParsedRef): ParsedSchema {
  return {
    ...schema,
    refs: schema.refs.map(r =>
      r.fromTable === oldRef.fromTable && r.fromColumn === oldRef.fromColumn &&
      r.toTable === oldRef.toTable && r.toColumn === oldRef.toColumn
        ? newRef : r
    ),
  }
}

// ── Table mutations ───────────────────────────────────────────────────────────

export function addTable(schema: ParsedSchema, table: ParsedTable): ParsedSchema {
  return { ...schema, tables: [...schema.tables, table] }
}

export function removeTable(schema: ParsedSchema, tableName: string): ParsedSchema {
  return {
    tables: schema.tables.filter(t => t.name !== tableName),
    refs: schema.refs.filter(r => r.fromTable !== tableName && r.toTable !== tableName),
  }
}

export function mutateTable(
  schema: ParsedSchema,
  tableName: string,
  update: { name?: string; columns?: ParsedColumn[] }
): ParsedSchema {
  const newName = update.name ?? tableName
  return {
    tables: schema.tables.map(t =>
      t.name !== tableName ? t : {
        ...t,
        ...(update.name ? { name: update.name } : {}),
        ...(update.columns ? { columns: update.columns } : {}),
      }
    ),
    refs: newName !== tableName
      ? schema.refs.map(r => ({
          ...r,
          fromTable: r.fromTable === tableName ? newName : r.fromTable,
          toTable:   r.toTable   === tableName ? newName : r.toTable,
        }))
      : schema.refs,
  }
}

// ── Default column factory ────────────────────────────────────────────────────

export function defaultColumn(index: number): ParsedColumn {
  return { name: `coluna_${index + 1}`, type: 'varchar', pk: false, nullable: true }
}

export function defaultTable(index: number): ParsedTable {
  return {
    name: `nova_tabela_${index + 1}`,
    group: null,
    groupColor: null,
    columns: [{ name: 'id', type: 'int', pk: true, nullable: false }],
  }
}

// ── Pick default columns for a new relation ───────────────────────────────────

export function defaultRelationCols(
  schema: ParsedSchema,
  fromTable: string,
  toTable: string
): { fromColumn: string; toColumn: string } {
  const src = schema.tables.find(t => t.name === fromTable)
  const tgt = schema.tables.find(t => t.name === toTable)
  const fromColumn = src?.columns.find(c => c.pk)?.name ?? src?.columns[0]?.name ?? 'id'
  const toColumn   = tgt?.columns.find(c => c.pk)?.name ?? tgt?.columns[0]?.name ?? 'id'
  return { fromColumn, toColumn }
}

// ── Group mutations ───────────────────────────────────────────────────────────

export function renameGroup(schema: ParsedSchema, oldName: string, newName: string): ParsedSchema {
  return {
    ...schema,
    tables: schema.tables.map(t =>
      t.group === oldName ? { ...t, group: newName } : t
    ),
  }
}

export function deleteGroup(schema: ParsedSchema, groupName: string): ParsedSchema {
  return {
    ...schema,
    tables: schema.tables.map(t =>
      t.group === groupName ? { ...t, group: null, groupColor: null } : t
    ),
  }
}

export function setTableGroup(schema: ParsedSchema, tableName: string, group: string | null): ParsedSchema {
  return {
    ...schema,
    tables: schema.tables.map(t =>
      t.name === tableName ? { ...t, group } : t
    ),
  }
}
