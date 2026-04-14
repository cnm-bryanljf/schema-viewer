import { useState, useEffect, useRef, useCallback } from 'react'
import type { ParsedTable, ParsedRef, ParsedColumn, TableDoc, DocsMap, NoteItem } from '../types'
import { usePositions } from '../hooks/usePositions'

type Tab = 'columns' | 'relations' | 'notes'

type Props = {
  table: ParsedTable | null
  refs: ParsedRef[]
  schemaId: string | null
  docs: DocsMap
  onClose: () => void
  onFocusTable: (name: string) => void
  onDocEdit: (tableName: string, doc: Partial<TableDoc>) => void
  // Structural editing
  onUpdateTable?: (tableName: string, update: { name?: string; columns?: ParsedColumn[] }) => void
  onSetGroup?: (tableName: string, group: string | null) => void
  onDeleteTable?: (tableName: string) => void
  onDeleteRelation?: (ref: ParsedRef) => void
  onUpdateRelation?: (oldRef: ParsedRef, newRef: ParsedRef) => void
  allTables?: ParsedTable[]
  allGroups?: string[]
  darkMode?: boolean
}

// ── Column row (doc edit) ─────────────────────────────────────────────────────

function ColumnRow({
  col, doc, editMode, onSummaryChange,
}: {
  col: ParsedColumn
  doc?: { summary: string; required?: boolean; type?: string }
  editMode: boolean
  onSummaryChange: (name: string, summary: string) => void
}) {
  const [open, setOpen] = useState(false)
  const hasSummary = !!(doc?.summary)
  return (
    <div className="border-b border-gray-100 dark:border-slate-700/40 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        {col.pk
          ? <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500 dark:text-yellow-400 shrink-0"><path d="M6 10.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M14 13.5l-3.5-3.5"/><path d="M11.5 11l1.5 1.5"/></svg>
          : <span className="w-4 shrink-0" />
        }
        <span className="text-gray-800 dark:text-slate-200 font-medium truncate flex-1">{col.name}</span>
        <span className="text-gray-500 dark:text-slate-400 font-mono shrink-0">{col.type}</span>
        {!col.nullable && <span className="text-red-400 shrink-0" title="NOT NULL">*</span>}
        {hasSummary
          ? <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor" className={`ml-1 text-gray-400 dark:text-slate-500 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}><polygon points="1,0 7,4 1,8" /></svg>
          : <span className="w-3 shrink-0" />
        }
      </button>
      {open && (
        <div className="px-3 pb-2">
          {editMode
            ? <textarea className="w-full text-xs bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded p-2 resize-none focus:outline-none focus:border-blue-500" rows={2} value={doc?.summary ?? ''} placeholder="Resumo da coluna..." onChange={e => onSummaryChange(col.name, e.target.value)} />
            : <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed pl-6">{doc?.summary || <span className="italic text-gray-300 dark:text-slate-600">Sem informação</span>}</p>
          }
        </div>
      )}
    </div>
  )
}

// ── Note card ─────────────────────────────────────────────────────────────────

function NoteCard({ note, index, onSave, onDelete, p }: {
  note: NoteItem; index: number
  onSave: (n: NoteItem) => Promise<void>
  onDelete: (id: string) => Promise<void>
  p: Record<string, string>
}) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [saving, setSaving] = useState(false)
  const dirty = title !== note.title || content !== note.content
  const handleSave = async () => { setSaving(true); await onSave({ ...note, title, content }); setSaving(false) }
  return (
    <div className={`rounded-lg border ${p.header} mb-2 overflow-hidden`}>
      <div className={`flex items-center gap-1 px-2 py-1 border-b ${p.toolbar}`}>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder={`Nota ${index + 1}`} className="flex-1 text-xs font-medium bg-transparent focus:outline-none placeholder-gray-400 dark:placeholder-slate-500 text-gray-800 dark:text-slate-200" />
        <button onClick={() => onDelete(note.id)} className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${p.btn} hover:text-red-500 transition-colors`} title="Excluir nota">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
      <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Conteúdo da nota..." className={`w-full text-xs ${p.noteArea} px-2 py-1.5 resize-none focus:outline-none border-0`} rows={4} />
      <div className={`flex items-center justify-between px-2 py-1 border-t ${p.toolbar}`}>
        <span className={`text-[10px] ${p.textMuted}`}>{note.updatedAt ? new Date(note.updatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
        <button onClick={handleSave} disabled={!dirty || saving} className="text-xs px-3 py-0.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors">
          {saving ? 'Salvando...' : dirty ? 'Salvar' : 'Salvo ✓'}
        </button>
      </div>
    </div>
  )
}

// ── Structural column editor row ──────────────────────────────────────────────

function StructColRow({ col, onChange, onDelete, p }: {
  col: ParsedColumn
  onChange: (updated: ParsedColumn) => void
  onDelete: () => void
  p: Record<string, string>
}) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 border-b ${p.header} group`}>
      <input
        value={col.name}
        onChange={e => onChange({ ...col, name: e.target.value })}
        className={`flex-1 min-w-0 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none focus:border-blue-500`}
        placeholder="nome"
      />
      <input
        value={col.type}
        onChange={e => onChange({ ...col, type: e.target.value })}
        className={`w-24 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none focus:border-blue-500 font-mono`}
        placeholder="tipo"
      />
      <button
        onClick={() => onChange({ ...col, pk: !col.pk })}
        title="Primary Key"
        className={`text-xs px-1.5 py-0.5 rounded border transition-colors shrink-0 ${col.pk ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' : `${p.btn} opacity-40 hover:opacity-80`}`}
      >PK</button>
      <button
        onClick={() => onChange({ ...col, nullable: !col.nullable })}
        title={col.nullable ? 'Nullable (clique para NOT NULL)' : 'NOT NULL (clique para nullable)'}
        className={`text-xs px-1.5 py-0.5 rounded border transition-colors shrink-0 ${!col.nullable ? 'bg-red-500/20 border-red-500/40 text-red-400' : `${p.btn} opacity-40 hover:opacity-80`}`}
      >NN</button>
      <button onClick={onDelete} className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs p-1 rounded ${p.btn} hover:text-red-400 shrink-0`} title="Remover coluna">
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/></svg>
      </button>
    </div>
  )
}

function darkInputCls(p: Record<string, string>) {
  return p.panel.includes('slate') ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-gray-50 border-gray-300 text-gray-800'
}

// ── Main SidePanel ────────────────────────────────────────────────────────────

const REL_TYPES: { value: ParsedRef['relation']; label: string }[] = [
  { value: '1-N', label: '1→N' },
  { value: 'N-1', label: 'N→1' },
  { value: '1-1', label: '1→1' },
  { value: 'N-N', label: 'N↔N' },
]

export default function SidePanel({
  table, refs, schemaId, docs,
  onClose, onFocusTable, onDocEdit,
  onUpdateTable, onSetGroup, onDeleteTable, onDeleteRelation, onUpdateRelation,
  allTables, allGroups,
  darkMode,
}: Props) {
  const [tab, setTab] = useState<Tab>('columns')
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [editMode, setEditMode] = useState(false)
  const [showAllSummaries, setShowAllSummaries] = useState(false)
  const [localDoc, setLocalDoc] = useState<Partial<TableDoc>>({})
  const [navStack, setNavStack] = useState<string[]>([])

  // Structural edit state
  const [structEdit, setStructEdit] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedCols, setEditedCols] = useState<ParsedColumn[]>([])
  const [editingRelIdx, setEditingRelIdx] = useState<number | null>(null)
  const [editingRelData, setEditingRelData] = useState<ParsedRef | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { fetchNotes, saveNote, deleteNote } = usePositions(schemaId)

  const patchTableMarkdown = useCallback(async (tableName: string, patch: {
    overview?: string; columns?: { name: string; summary: string }[]
  }) => {
    try {
      await fetch(`/api/docs/${encodeURIComponent(tableName)}/patch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    if (!table) return
    fetchNotes(table.name).then(setNotes)
    setLocalDoc({})
    setEditMode(false)
    setStructEdit(false)
    setShowAllSummaries(false)
    setEditingRelIdx(null)
    setShowDeleteConfirm(false)
  }, [table?.name, fetchNotes])

  const handleAddNote = useCallback(() => {
    if (!table) return
    const now = new Date().toISOString()
    setNotes(prev => [...prev, { id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, title: '', content: '', createdAt: now, updatedAt: now }])
  }, [table])

  const handleSaveNote = useCallback(async (updated: NoteItem) => {
    if (!table) return
    const savedNote = { ...updated, updatedAt: new Date().toISOString() }
    await saveNote(table.name, savedNote)
    setNotes(prev => prev.map(n => n.id === updated.id ? savedNote : n))
  }, [table, saveNote])

  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!table) return
    await deleteNote(table.name, noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }, [table, deleteNote])

  const handleSummaryChange = useCallback((colName: string, summary: string) => {
    setLocalDoc(prev => {
      const cols = [...(prev.columns ?? docs[table!.name]?.columns ?? [])]
      const idx = cols.findIndex(c => c.name === colName)
      if (idx >= 0) cols[idx] = { ...cols[idx], summary }
      else cols.push({ name: colName, summary })
      return { ...prev, columns: cols }
    })
  }, [docs, table])

  const handleSaveDoc = () => {
    if (!table) return
    onDocEdit(table.name, localDoc)
    setEditMode(false)
    const patch: { overview?: string; columns?: { name: string; summary: string }[] } = {}
    if (localDoc.overview !== undefined) patch.overview = localDoc.overview
    if (localDoc.columns?.length) patch.columns = localDoc.columns.map(c => ({ name: c.name, summary: c.summary }))
    if (Object.keys(patch).length > 0) patchTableMarkdown(table.name, patch)
  }

  // Structural edit handlers
  const enterStructEdit = () => {
    if (!table) return
    setEditedName(table.name)
    setEditedCols(table.columns.map(c => ({ ...c })))
    setStructEdit(true)
    setEditMode(false)
  }

  const handleSaveStruct = () => {
    if (!table || !onUpdateTable) return
    const update: { name?: string; columns?: ParsedColumn[] } = {}
    if (editedName !== table.name) update.name = editedName.trim() || table.name
    update.columns = editedCols
    onUpdateTable(table.name, update)
    setStructEdit(false)
  }

  const handleColChange = (idx: number, updated: ParsedColumn) => {
    setEditedCols(prev => prev.map((c, i) => i === idx ? updated : c))
  }

  const handleAddCol = () => {
    setEditedCols(prev => [...prev, { name: `col_${prev.length + 1}`, type: 'varchar', pk: false, nullable: true }])
  }

  const handleDeleteCol = (idx: number) => {
    setEditedCols(prev => prev.filter((_, i) => i !== idx))
  }

  const startEditRelation = (ref: ParsedRef, idx: number) => {
    setEditingRelIdx(idx)
    setEditingRelData({ ...ref })
  }

  const handleSaveRelation = () => {
    if (!editingRelData || editingRelIdx === null || !onUpdateRelation) return
    const allRels = [...refs.filter(r => r.fromTable === table!.name), ...refs.filter(r => r.toTable === table!.name && r.fromTable !== table!.name)]
    const oldRef = allRels[editingRelIdx]
    if (oldRef) onUpdateRelation(oldRef, editingRelData)
    setEditingRelIdx(null)
    setEditingRelData(null)
  }

  // Navigation
  const navigateTo = (name: string) => {
    if (table) setNavStack(s => [...s, table.name])
    onFocusTable(name)
  }
  const navigateBack = () => {
    const prev = navStack[navStack.length - 1]
    if (!prev) return
    setNavStack(s => s.slice(0, -1))
    onFocusTable(prev)
  }

  if (!table) return null

  const doc = docs[table.name]
  const mergedDoc: TableDoc | undefined = doc
    ? { ...doc, ...localDoc, columns: localDoc.columns ?? doc.columns }
    : undefined

  const incoming = refs.filter(r => r.toTable === table.name)
  const outgoing = refs.filter(r => r.fromTable === table.name)
  const allRels = [...outgoing, ...incoming.filter(r => r.fromTable !== table.name)]
  const hasBack = navStack.length > 0

  const allRelationTexts = [
    ...outgoing.map(r => `${r.fromColumn} → ${r.toTable}.${r.toColumn} (${r.relation})`),
    ...incoming.map(r => `${r.fromTable}.${r.fromColumn} → ${r.toColumn} (${r.relation})`),
  ]
  const maxLen = allRelationTexts.reduce((m, s) => Math.max(m, s.length), 0)
  const panelWidth = Math.max(320, Math.min(540, 280 + maxLen * 5.5))

  const p = darkMode === false
    ? { panel: 'bg-white border-gray-200', header: 'border-gray-200', overview: 'bg-gray-50 border-gray-200', tab: 'border-gray-200', tabActive: 'text-gray-900 border-blue-500', tabInactive: 'text-gray-400 hover:text-gray-600', toolbar: 'border-gray-100', btn: 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700', text: 'text-gray-700', textMuted: 'text-gray-400', rowHover: 'hover:bg-gray-50', relation: 'bg-gray-100 hover:bg-gray-200', noteArea: 'bg-gray-50 border-gray-200 text-gray-800', editArea: 'bg-gray-100 border-gray-300 text-gray-800' }
    : { panel: 'bg-slate-900 border-slate-700', header: 'border-slate-700', overview: 'bg-slate-800/30 border-slate-700/60', tab: 'border-slate-700', tabActive: 'text-white border-blue-500', tabInactive: 'text-slate-400 hover:text-slate-200', toolbar: 'border-slate-700/50', btn: 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200', text: 'text-slate-400', textMuted: 'text-slate-600', rowHover: 'hover:bg-slate-800/50', relation: 'bg-slate-800 hover:bg-slate-700', noteArea: 'bg-slate-800 border-slate-700 text-slate-200', editArea: 'bg-slate-800 border-slate-600 text-slate-300' }

  return (
    <div className={`fixed right-0 top-0 h-full ${p.panel} border-l flex flex-col z-50 shadow-2xl`} style={{ width: panelWidth }}>

      {/* Header */}
      <div className={`flex items-start justify-between px-4 py-3 border-b ${p.header} shrink-0 gap-2`}>
        <div className="flex items-start gap-2 min-w-0 flex-1">
          {hasBack && (
            <button onClick={navigateBack} className={`mt-0.5 ${p.text} hover:text-gray-900 dark:hover:text-white text-sm shrink-0 p-0.5 rounded ${p.btn} transition-colors`} title="Voltar">←</button>
          )}
          <div className="min-w-0 flex-1">
            {structEdit ? (
              <input
                value={editedName}
                onChange={e => setEditedName(e.target.value)}
                className={`w-full text-sm font-bold rounded px-2 py-0.5 border focus:outline-none focus:border-blue-500 ${darkInputCls(p)}`}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveStruct() }}
              />
            ) : (
              <h2 className="font-bold text-gray-900 dark:text-white text-sm truncate">{table.name}</h2>
            )}
            {!structEdit && onSetGroup && (() => {
              const groups = allGroups ?? [...new Set((allTables ?? []).map(t => t.group).filter(Boolean) as string[])]
              return (
                <select
                  value={table.group ?? ''}
                  onChange={e => onSetGroup(table.name, e.target.value || null)}
                  className={`mt-0.5 text-xs px-2 py-0.5 rounded-full border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${darkMode === false ? 'bg-gray-100 text-gray-600' : 'bg-slate-800 text-slate-300'}`}
                  style={table.group ? { background: (table.groupColor ?? '#64748b') + '33', color: table.groupColor ?? '#94a3b8' } : {}}
                  title="Grupo da tabela"
                >
                  <option value="">Sem grupo</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              )
            })()}
            {!structEdit && !onSetGroup && table.group && (
              <span className="text-xs px-2 py-0.5 rounded-full mt-0.5 inline-block" style={{ background: (table.groupColor ?? '#64748b') + '33', color: table.groupColor ?? '#94a3b8' }}>{table.group}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Struct edit / delete */}
          {onUpdateTable && !structEdit && (
            <button
              onClick={enterStructEdit}
              className={`text-xs px-2 py-1 rounded ${p.btn} transition-colors`}
              title="Editar estrutura da tabela"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>
            </button>
          )}
          {structEdit && (
            <>
              <button onClick={handleSaveStruct} className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">Salvar</button>
              <button onClick={() => setStructEdit(false)} className={`text-xs px-2 py-1 ${p.btn} rounded transition-colors`}>Cancelar</button>
              {onDeleteTable && !showDeleteConfirm && (
                <button onClick={() => setShowDeleteConfirm(true)} className="text-xs px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors border border-red-500/30" title="Excluir tabela">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 13,6"/><path d="M5 6V4h6v2"/><path d="M4 6l1 8h6l1-8"/></svg>
                </button>
              )}
              {showDeleteConfirm && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-red-400">Confirmar?</span>
                  <button onClick={() => { onDeleteTable!(table.name); setStructEdit(false) }} className="text-xs px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded transition-colors">Sim</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className={`text-xs px-2 py-0.5 ${p.btn} rounded transition-colors`}>Não</button>
                </div>
              )}
            </>
          )}
          <button onClick={onClose} className={`${p.text} hover:text-gray-900 dark:hover:text-white text-lg leading-none ml-1`}>✕</button>
        </div>
      </div>

      {/* Overview */}
      {(mergedDoc?.overview || editMode) && !structEdit && (
        <div className={`px-4 py-2 border-b ${p.overview} shrink-0`}>
          {editMode
            ? <textarea className={`w-full text-xs ${p.editArea} border rounded p-2 resize-none focus:outline-none focus:border-blue-500`} rows={3} value={localDoc.overview ?? mergedDoc?.overview ?? ''} placeholder="Visão geral..." onChange={e => setLocalDoc(d => ({ ...d, overview: e.target.value }))} />
            : <p className={`text-xs ${p.text} leading-relaxed`}>{mergedDoc?.overview}</p>
          }
        </div>
      )}
      {!mergedDoc && !editMode && !structEdit && docs && Object.keys(docs).length > 0 && (
        <div className={`px-4 py-2 border-b ${p.header} shrink-0`}>
          <p className={`text-xs ${p.textMuted} italic`}>Sem documentação para esta tabela</p>
        </div>
      )}

      {/* Tabs */}
      <div className={`flex border-b ${p.tab} shrink-0`}>
        {(['columns', 'relations', 'notes'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${tab === t ? `${p.tabActive} border-b-2` : p.tabInactive}`}>
            {t === 'columns' ? 'Colunas' : t === 'relations' ? 'Relações' : 'Notas'}
            {t === 'notes' && notes.length > 0 && (
              <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full leading-none ${tab === 'notes' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>{notes.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab toolbar (columns) */}
      {tab === 'columns' && !structEdit && (
        <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${p.toolbar} shrink-0`}>
          <button onClick={() => setShowAllSummaries(v => !v)} className={`text-xs px-2 py-1 rounded transition-colors ${showAllSummaries ? 'bg-blue-700 text-white' : p.btn}`}>
            {showAllSummaries ? 'Ocultar Resumos' : 'Exibir Resumos'}
          </button>
          <div className="flex-1" />
          {!editMode
            ? <button onClick={() => setEditMode(true)} className={`text-xs px-2 py-1 ${p.btn} rounded transition-colors`}>✏ Editar docs</button>
            : <div className="flex gap-1">
                <button onClick={handleSaveDoc} className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">Salvar</button>
                <button onClick={() => { setEditMode(false); setLocalDoc({}) }} className={`text-xs px-2 py-1 ${p.btn} rounded transition-colors`}>Cancelar</button>
              </div>
          }
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Columns tab ── */}
        {tab === 'columns' && !structEdit && (
          <div>
            {showAllSummaries
              ? table.columns.map(col => {
                  const colDoc = mergedDoc?.columns.find(c => c.name === col.name)
                  return (
                    <div key={col.name} className={`border-b ${p.header}`}>
                      <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
                        {col.pk && <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400 shrink-0"><path d="M6 10.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M14 13.5l-3.5-3.5"/><path d="M11.5 11l1.5 1.5"/></svg>}
                        {!col.pk && <span className="w-4 shrink-0" />}
                        <span className="text-gray-800 dark:text-slate-200 font-medium truncate flex-1">{col.name}</span>
                        <span className={`${p.text} font-mono shrink-0`}>{col.type}</span>
                        {!col.nullable && <span className="text-red-400 shrink-0">*</span>}
                      </div>
                      <div className="px-3 pb-2">
                        {editMode
                          ? <textarea className={`w-full text-xs ${p.editArea} border rounded p-2 resize-none focus:outline-none focus:border-blue-500`} rows={2} value={colDoc?.summary ?? ''} placeholder="Resumo..." onChange={e => handleSummaryChange(col.name, e.target.value)} />
                          : <p className={`text-xs ${p.text} leading-relaxed pl-6`}>{colDoc?.summary || <span className={`italic ${p.textMuted}`}>Sem informação</span>}</p>
                        }
                      </div>
                    </div>
                  )
                })
              : table.columns.map(col => {
                  const colDoc = mergedDoc?.columns.find(c => c.name === col.name)
                  return <ColumnRow key={col.name} col={col} doc={colDoc} editMode={editMode} onSummaryChange={handleSummaryChange} />
                })
            }
          </div>
        )}

        {/* ── Columns structural edit ── */}
        {tab === 'columns' && structEdit && (
          <div>
            {editedCols.map((col, idx) => (
              <StructColRow key={idx} col={col} onChange={u => handleColChange(idx, u)} onDelete={() => handleDeleteCol(idx)} p={p} />
            ))}
            <button
              onClick={handleAddCol}
              className={`w-full flex items-center justify-center gap-1.5 py-2 text-xs ${p.btn} border-t ${p.header} transition-colors`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="5" y1="1" x2="5" y2="9"/><line x1="1" y1="5" x2="9" y2="5"/></svg>
              Adicionar coluna
            </button>
          </div>
        )}

        {/* ── Relations tab ── */}
        {tab === 'relations' && (
          <div className="p-3 space-y-4">
            {outgoing.length > 0 && (
              <div>
                <div className={`text-xs ${p.text} mb-2 font-semibold uppercase tracking-wide`}>Saída ({outgoing.length})</div>
                <div className="space-y-1">
                  {outgoing.map((r, i) => (
                    <div key={i} className={`flex items-center gap-1 rounded ${p.relation} group`}>
                      {editingRelIdx === i && editingRelData ? (
                        <div className="flex-1 p-2 space-y-1.5">
                          <div className="flex gap-1 flex-wrap">
                            {REL_TYPES.map(rt => (
                              <button key={rt.value} onClick={() => setEditingRelData(d => d ? { ...d, relation: rt.value } : d)}
                                className={`text-[10px] px-2 py-0.5 rounded border font-mono transition-colors ${editingRelData.relation === rt.value ? 'bg-blue-600 border-blue-500 text-white' : p.btn}`}
                              >{rt.label}</button>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            {allTables ? (
                              <select value={editingRelData.fromTable} onChange={e => setEditingRelData(d => d ? { ...d, fromTable: e.target.value, fromColumn: allTables.find(t => t.name === e.target.value)?.columns[0]?.name ?? '' } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`}>
                                {allTables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                              </select>
                            ) : (
                              <input value={editingRelData.fromTable} onChange={e => setEditingRelData(d => d ? { ...d, fromTable: e.target.value } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`} placeholder="tabela origem" />
                            )}
                            {allTables ? (
                              <select value={editingRelData.fromColumn} onChange={e => setEditingRelData(d => d ? { ...d, fromColumn: e.target.value } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`}>
                                {(allTables.find(t => t.name === editingRelData.fromTable)?.columns ?? []).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                              </select>
                            ) : (
                              <input value={editingRelData.fromColumn} onChange={e => setEditingRelData(d => d ? { ...d, fromColumn: e.target.value } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`} placeholder="coluna origem" />
                            )}
                          </div>
                          <div className="flex gap-1">
                            <span className={`text-xs ${p.textMuted} self-center w-3`}>→</span>
                            {allTables ? (
                              <select value={editingRelData.toTable} onChange={e => setEditingRelData(d => d ? { ...d, toTable: e.target.value, toColumn: allTables.find(t => t.name === e.target.value)?.columns[0]?.name ?? '' } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`}>
                                {allTables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                              </select>
                            ) : (
                              <input value={editingRelData.toTable} onChange={e => setEditingRelData(d => d ? { ...d, toTable: e.target.value } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`} placeholder="tabela destino" />
                            )}
                            {allTables ? (
                              <select value={editingRelData.toColumn} onChange={e => setEditingRelData(d => d ? { ...d, toColumn: e.target.value } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`}>
                                {(allTables.find(t => t.name === editingRelData.toTable)?.columns ?? []).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                              </select>
                            ) : (
                              <input value={editingRelData.toColumn} onChange={e => setEditingRelData(d => d ? { ...d, toColumn: e.target.value } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`} placeholder="coluna destino" />
                            )}
                          </div>
                          <div className="flex gap-1 pt-0.5">
                            <button onClick={handleSaveRelation} className="text-xs px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">Salvar</button>
                            <button onClick={() => { setEditingRelIdx(null); setEditingRelData(null) }} className={`text-xs px-2 py-0.5 ${p.btn} rounded transition-colors`}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => navigateTo(r.toTable)} className="flex-1 flex items-center gap-2 px-3 py-2 text-left transition-colors">
                            <span className="text-blue-400 font-mono text-xs shrink-0">{r.fromColumn}</span>
                            <span className={`${p.textMuted} text-xs shrink-0`}>→</span>
                            <span className="text-gray-900 dark:text-white text-xs font-medium shrink-0">{r.toTable}</span>
                            <span className={`${p.textMuted} text-xs shrink-0`}>.{r.toColumn}</span>
                            <span className={`ml-auto ${p.text} text-xs font-mono shrink-0`}>{r.relation}</span>
                          </button>
                          {onUpdateRelation && (
                            <button onClick={() => startEditRelation(r, i)} className={`opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-1 ${p.btn} text-xs rounded mr-0.5`} title="Editar relação">
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>
                            </button>
                          )}
                          {onDeleteRelation && (
                            <button onClick={() => onDeleteRelation(r)} className={`opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-1 ${p.btn} hover:text-red-400 text-xs rounded mr-1`} title="Excluir relação">
                              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/></svg>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {incoming.length > 0 && (
              <div>
                <div className={`text-xs ${p.text} mb-2 font-semibold uppercase tracking-wide`}>Entrada ({incoming.length})</div>
                <div className="space-y-1">
                  {incoming.map((r, i) => {
                    const relIdx = outgoing.length + i
                    return (
                      <div key={i} className={`flex items-center gap-1 rounded ${p.relation} group`}>
                        {editingRelIdx === relIdx && editingRelData ? (
                          <div className="flex-1 p-2 space-y-1.5">
                            <div className="flex gap-1 flex-wrap">
                              {REL_TYPES.map(rt => (
                                <button key={rt.value} onClick={() => setEditingRelData(d => d ? { ...d, relation: rt.value } : d)}
                                  className={`text-[10px] px-2 py-0.5 rounded border font-mono transition-colors ${editingRelData.relation === rt.value ? 'bg-blue-600 border-blue-500 text-white' : p.btn}`}
                                >{rt.label}</button>
                              ))}
                            </div>
                            <div className="flex gap-1">
                              {allTables ? (
                                <select value={editingRelData.fromTable} onChange={e => setEditingRelData(d => d ? { ...d, fromTable: e.target.value, fromColumn: allTables.find(t => t.name === e.target.value)?.columns[0]?.name ?? '' } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`}>
                                  {allTables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                </select>
                              ) : (
                                <input value={editingRelData.fromTable} onChange={e => setEditingRelData(d => d ? { ...d, fromTable: e.target.value } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`} placeholder="tabela origem" />
                              )}
                              {allTables ? (
                                <select value={editingRelData.fromColumn} onChange={e => setEditingRelData(d => d ? { ...d, fromColumn: e.target.value } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`}>
                                  {(allTables.find(t => t.name === editingRelData.fromTable)?.columns ?? []).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                              ) : (
                                <input value={editingRelData.fromColumn} onChange={e => setEditingRelData(d => d ? { ...d, fromColumn: e.target.value } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`} placeholder="coluna origem" />
                              )}
                            </div>
                            <div className="flex gap-1">
                              <span className={`text-xs ${p.textMuted} self-center w-3`}>→</span>
                              {allTables ? (
                                <select value={editingRelData.toTable} onChange={e => setEditingRelData(d => d ? { ...d, toTable: e.target.value, toColumn: allTables.find(t => t.name === e.target.value)?.columns[0]?.name ?? '' } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`}>
                                  {allTables.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                </select>
                              ) : (
                                <input value={editingRelData.toTable} onChange={e => setEditingRelData(d => d ? { ...d, toTable: e.target.value } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`} placeholder="tabela destino" />
                              )}
                              {allTables ? (
                                <select value={editingRelData.toColumn} onChange={e => setEditingRelData(d => d ? { ...d, toColumn: e.target.value } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`}>
                                  {(allTables.find(t => t.name === editingRelData.toTable)?.columns ?? []).map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                              ) : (
                                <input value={editingRelData.toColumn} onChange={e => setEditingRelData(d => d ? { ...d, toColumn: e.target.value } : d)} className={`flex-1 text-xs px-1.5 py-0.5 rounded border ${darkInputCls(p)} focus:outline-none`} placeholder="coluna destino" />
                              )}
                            </div>
                            <div className="flex gap-1 pt-0.5">
                              <button onClick={handleSaveRelation} className="text-xs px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">Salvar</button>
                              <button onClick={() => { setEditingRelIdx(null); setEditingRelData(null) }} className={`text-xs px-2 py-0.5 ${p.btn} rounded transition-colors`}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => navigateTo(r.fromTable)} className="flex-1 flex items-center gap-2 px-3 py-2 text-left">
                              <span className="text-gray-900 dark:text-white text-xs font-medium shrink-0">{r.fromTable}</span>
                              <span className={`${p.textMuted} text-xs shrink-0`}>.{r.fromColumn}</span>
                              <span className={`${p.textMuted} text-xs shrink-0`}>→</span>
                              <span className="text-green-500 dark:text-green-400 font-mono text-xs shrink-0">{r.toColumn}</span>
                              <span className={`ml-auto ${p.text} text-xs font-mono shrink-0`}>{r.relation}</span>
                            </button>
                            {onUpdateRelation && (
                              <button onClick={() => startEditRelation(r, relIdx)} className={`opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-1 ${p.btn} text-xs rounded mr-0.5`} title="Editar relação">
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z"/></svg>
                              </button>
                            )}
                            {onDeleteRelation && (
                              <button onClick={() => onDeleteRelation(r)} className={`opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-1 ${p.btn} hover:text-red-400 text-xs rounded mr-1`} title="Excluir relação">
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/></svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {outgoing.length === 0 && incoming.length === 0 && (
              <p className={`${p.textMuted} text-xs text-center py-8`}>Nenhuma relação</p>
            )}
          </div>
        )}

        {/* ── Notes tab ── */}
        {tab === 'notes' && (
          <div className="p-3">
            {notes.length === 0 && <p className={`text-xs ${p.textMuted} italic text-center py-4`}>Nenhuma nota ainda.</p>}
            {notes.map((note, i) => (
              <NoteCard key={note.id} note={note} index={i} onSave={handleSaveNote} onDelete={handleDeleteNote} p={p} />
            ))}
            <button onClick={handleAddNote} className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs ${p.btn} border border-dashed ${p.header} rounded-lg transition-colors`}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="5" y1="1" x2="5" y2="9"/><line x1="1" y1="5" x2="9" y2="5"/></svg>
              Nova nota
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
