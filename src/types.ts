export type ParsedColumn = {
  name: string
  type: string
  pk: boolean
  nullable: boolean
  note?: string
}

export type ParsedTable = {
  name: string
  group: string | null
  groupColor: string | null
  columns: ParsedColumn[]
}

export type ParsedRef = {
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
  relation: '1-1' | '1-N' | 'N-1' | 'N-N'
}

export type ParsedSchema = {
  tables: ParsedTable[]
  refs: ParsedRef[]
}

export type NodePosition = {
  table_name: string
  x: number
  y: number
}

export type SchemaEntry = {
  id: string
  label: string
  loadedAt: string
  content?: string
}

export type TableNodeData = {
  table: ParsedTable
  selected?: boolean
  dimmed?: boolean
  showAllColumns?: boolean
  // Highlight state when another table is selected
  selectionDimmed?: boolean
  highlightedColumns?: string[]
  // Snowflake layout: marks the central (highest-degree) table per group
  isSnowflakeCenter?: boolean
}

export type GroupNodeData = {
  groupName: string
  color: string
  collapsed?: boolean
  editable?: boolean
  onToggleEdit?: (groupId: string) => void
}

export type TableVisibilityRow = {
  name: string
  visible: boolean
}

// ── Notes ────────────────────────────────────────────────────────────────────

export type NoteItem = {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

// ── Documentation ─────────────────────────────────────────────────────────────

export type ColumnDoc = {
  name: string
  summary: string        // full text after the dash
  required?: boolean     // [Obrigatório]
  type?: string          // type extracted from parens
}

export type TableDoc = {
  tableName: string
  overview: string       // ## Visão geral
  group?: string         // ## Grupo
  columns: ColumnDoc[]   // ## Colunas
  raw: string            // original markdown
}

export type DocsMap = Record<string, TableDoc>  // tableName → doc

// ── Workspace ────────────────────────────────────────────────────────────────

export type WorkspaceNodePos = { id: string; x: number; y: number; w?: number; h?: number }

export type Workspace = {
  id: string
  name: string
  savedAt: string
  schemaContent: string
  schemaId: string
  nodePositions: WorkspaceNodePos[]
  notes: Record<string, NoteItem[]>      // tableName → notes array
  docOverrides: Record<string, Partial<TableDoc>>  // tableName → edited fields
  hiddenTables: string[]
  hasDocs?: boolean                       // whether docs/ were loaded when saved
}
