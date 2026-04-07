import { useState, useEffect, useRef, useCallback } from 'react'
import type { ParsedTable, ParsedRef, TableDoc, DocsMap, NoteItem } from '../types'
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
}

// ── Column row ────────────────────────────────────────────────────────────────

function ColumnRow({
  col,
  doc,
  editMode,
  onSummaryChange,
}: {
  col: { name: string; type: string; pk: boolean; nullable: boolean }
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
        {col.pk && <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" title="Primary Key" className="text-yellow-500 dark:text-yellow-400 shrink-0"><path d="M6 10.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M14 13.5l-3.5-3.5"/><path d="M11.5 11l1.5 1.5"/></svg>}
        {!col.pk && <span className="w-4 shrink-0" />}
        <span className="text-gray-800 dark:text-slate-200 font-medium truncate flex-1">{col.name}</span>
        <span className="text-gray-500 dark:text-slate-400 font-mono shrink-0">{col.type}</span>
        {!col.nullable && <span className="text-red-400 shrink-0" title="NOT NULL">*</span>}
        {hasSummary && (
          <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor" className={`ml-1 text-gray-400 dark:text-slate-500 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}>
            <polygon points="1,0 7,4 1,8" />
          </svg>
        )}
        {!hasSummary && <span className="w-3 shrink-0" />}
      </button>

      {open && (
        <div className="px-3 pb-2">
          {editMode ? (
            <textarea
              className="w-full text-xs bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300 border border-gray-300 dark:border-slate-600 rounded p-2 resize-none focus:outline-none focus:border-blue-500"
              rows={2}
              value={doc?.summary ?? ''}
              placeholder="Resumo da coluna..."
              onChange={e => onSummaryChange(col.name, e.target.value)}
            />
          ) : (
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed pl-6">
              {doc?.summary || <span className="italic text-gray-300 dark:text-slate-600">Sem informação</span>}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main SidePanel ────────────────────────────────────────────────────────────

// ── Note card (single note item) ─────────────────────────────────────────────

function NoteCard({
  note,
  index,
  onSave,
  onDelete,
  p,
}: {
  note: NoteItem
  index: number
  onSave: (updated: NoteItem) => Promise<void>
  onDelete: (id: string) => Promise<void>
  p: Record<string, string>
}) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [saving, setSaving] = useState(false)
  const dirty = title !== note.title || content !== note.content

  const handleSave = async () => {
    setSaving(true)
    await onSave({ ...note, title, content })
    setSaving(false)
  }

  return (
    <div className={`rounded-lg border ${p.header} mb-2 overflow-hidden`}>
      {/* Note header */}
      <div className={`flex items-center gap-1 px-2 py-1 border-b ${p.toolbar}`}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={`Nota ${index + 1}`}
          className={`flex-1 text-xs font-medium bg-transparent focus:outline-none placeholder-gray-400 dark:placeholder-slate-500 text-gray-800 dark:text-slate-200`}
        />
        <button
          onClick={() => onDelete(note.id)}
          className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${p.btn} hover:text-red-500 transition-colors`}
          title="Excluir nota"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      {/* Content */}
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Conteúdo da nota..."
        className={`w-full text-xs ${p.noteArea} px-2 py-1.5 resize-none focus:outline-none border-0`}
        rows={4}
      />
      {/* Save button */}
      <div className={`flex items-center justify-between px-2 py-1 border-t ${p.toolbar}`}>
        <span className={`text-[10px] ${p.textMuted}`}>
          {note.updatedAt ? new Date(note.updatedAt).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : ''}
        </span>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="text-xs px-3 py-0.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors"
        >
          {saving ? 'Salvando...' : dirty ? 'Salvar' : 'Salvo ✓'}
        </button>
      </div>
    </div>
  )
}

// ── Main SidePanel ────────────────────────────────────────────────────────────

export default function SidePanel({ table, refs, schemaId, docs, onClose, onFocusTable, onDocEdit, darkMode }: Props & { darkMode?: boolean }) {
  const [tab, setTab] = useState<Tab>('columns')
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [editMode, setEditMode] = useState(false)
  const [showAllSummaries, setShowAllSummaries] = useState(false)
  const [localDoc, setLocalDoc] = useState<Partial<TableDoc>>({})
  const [navStack, setNavStack] = useState<string[]>([])
  const { fetchNotes, saveNote, deleteNote } = usePositions(schemaId)

  // ── Markdown sync helper ───────────────────────────────────────────────────
  const patchTableMarkdown = useCallback(async (tableName: string, patch: {
    overview?: string
    columns?: { name: string; summary: string }[]
    notes?: NoteItem[]
  }) => {
    try {
      await fetch(`/api/docs/${encodeURIComponent(tableName)}/patch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overview: patch.overview,
          columns: patch.columns,
          notes: patch.notes?.map(n => ({ title: n.title, content: n.content })),
        }),
      })
    } catch { /* silent if no markdown file */ }
  }, [])

  useEffect(() => {
    if (!table) return
    fetchNotes(table.name).then(setNotes)
    setLocalDoc({})
    setEditMode(false)
    setShowAllSummaries(false)
  }, [table?.name, fetchNotes])

  const handleAddNote = useCallback(() => {
    if (!table) return
    const now = new Date().toISOString()
    const newNote: NoteItem = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: '',
      content: '',
      createdAt: now,
      updatedAt: now,
    }
    setNotes(prev => [...prev, newNote])
  }, [table])

  const handleSaveNote = useCallback(async (updated: NoteItem) => {
    if (!table) return
    const savedNote = { ...updated, updatedAt: new Date().toISOString() }
    await saveNote(table.name, savedNote)
    const newNotes = notes.map(n => n.id === updated.id ? savedNote : n)
    setNotes(newNotes)
    await patchTableMarkdown(table.name, { notes: newNotes })
  }, [table, saveNote, notes, patchTableMarkdown])

  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!table) return
    await deleteNote(table.name, noteId)
    const newNotes = notes.filter(n => n.id !== noteId)
    setNotes(newNotes)
    await patchTableMarkdown(table.name, { notes: newNotes })
  }, [table, deleteNote, notes, patchTableMarkdown])

  const handleSummaryChange = useCallback((colName: string, summary: string) => {
    setLocalDoc(prev => {
      const cols = [...(prev.columns ?? docs[table!.name]?.columns ?? [])]
      const idx = cols.findIndex(c => c.name === colName)
      if (idx >= 0) cols[idx] = { ...cols[idx], summary }
      else cols.push({ name: colName, summary })
      return { ...prev, columns: cols }
    })
  }, [docs, table])

  const handleOverviewChange = (overview: string) => {
    setLocalDoc(prev => ({ ...prev, overview }))
  }

  const handleSaveDoc = () => {
    if (!table) return
    onDocEdit(table.name, localDoc)
    setEditMode(false)
    // Sync to markdown file
    const markdownPatch: { overview?: string; columns?: { name: string; summary: string }[] } = {}
    if (localDoc.overview !== undefined) markdownPatch.overview = localDoc.overview
    if (localDoc.columns && localDoc.columns.length > 0) {
      markdownPatch.columns = localDoc.columns.map(c => ({ name: c.name, summary: c.summary }))
    }
    if (Object.keys(markdownPatch).length > 0) {
      patchTableMarkdown(table.name, markdownPatch)
    }
  }

  // Navigation history
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
  const hasBack = navStack.length > 0

  // Compute sidebar width based on longest relation text
  const allRelationTexts = [
    ...outgoing.map(r => `${r.fromColumn} → ${r.toTable}.${r.toColumn} (${r.relation})`),
    ...incoming.map(r => `${r.fromTable}.${r.fromColumn} → ${r.toColumn} (${r.relation})`),
  ]
  const maxLen = allRelationTexts.reduce((m, s) => Math.max(m, s.length), 0)
  const panelWidth = Math.max(320, Math.min(520, 280 + maxLen * 5.5))

  const p = darkMode === false
    ? { panel: 'bg-white border-gray-200', header: 'border-gray-200', overview: 'bg-gray-50 border-gray-200', tab: 'border-gray-200', tabActive: 'text-gray-900 border-blue-500', tabInactive: 'text-gray-400 hover:text-gray-600', toolbar: 'border-gray-100', btn: 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700', text: 'text-gray-700', textMuted: 'text-gray-400', rowHover: 'hover:bg-gray-50', relation: 'bg-gray-100 hover:bg-gray-200', noteArea: 'bg-gray-50 border-gray-200 text-gray-800', editArea: 'bg-gray-100 border-gray-300 text-gray-800' }
    : { panel: 'bg-slate-900 border-slate-700', header: 'border-slate-700', overview: 'bg-slate-800/30 border-slate-700/60', tab: 'border-slate-700', tabActive: 'text-white border-blue-500', tabInactive: 'text-slate-400 hover:text-slate-200', toolbar: 'border-slate-700/50', btn: 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200', text: 'text-slate-400', textMuted: 'text-slate-600', rowHover: 'hover:bg-slate-800/50', relation: 'bg-slate-800 hover:bg-slate-700', noteArea: 'bg-slate-800 border-slate-700 text-slate-200', editArea: 'bg-slate-800 border-slate-600 text-slate-300' }

  return (
    <div
      className={`fixed right-0 top-0 h-full ${p.panel} border-l flex flex-col z-50 shadow-2xl`}
      style={{ width: panelWidth }}
    >
      {/* Header */}
      <div className={`flex items-start justify-between px-4 py-3 border-b ${p.header} shrink-0 gap-2`}>
        <div className="flex items-start gap-2 min-w-0">
          {hasBack && (
            <button onClick={navigateBack} className={`mt-0.5 ${p.text} hover:text-gray-900 dark:hover:text-white text-sm shrink-0 p-0.5 rounded ${p.btn} transition-colors`} title="Voltar à tabela anterior">←</button>
          )}
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm truncate">{table.name}</h2>
            {table.group && (
              <span className="text-xs px-2 py-0.5 rounded-full mt-0.5 inline-block" style={{ background: (table.groupColor ?? '#64748b') + '33', color: table.groupColor ?? '#94a3b8' }}>{table.group}</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className={`${p.text} hover:text-gray-900 dark:hover:text-white text-lg leading-none shrink-0`}>✕</button>
      </div>

      {/* Overview from docs */}
      {(mergedDoc?.overview || editMode) && (
        <div className={`px-4 py-2 border-b ${p.overview} shrink-0`}>
          {editMode ? (
            <textarea className={`w-full text-xs ${p.editArea} border rounded p-2 resize-none focus:outline-none focus:border-blue-500`} rows={3} value={localDoc.overview ?? mergedDoc?.overview ?? ''} placeholder="Visão geral da tabela..." onChange={e => handleOverviewChange(e.target.value)} />
          ) : (
            <p className={`text-xs ${p.text} leading-relaxed`}>{mergedDoc?.overview}</p>
          )}
        </div>
      )}
      {!mergedDoc && !editMode && docs && Object.keys(docs).length > 0 && (
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
              <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full leading-none ${tab === 'notes' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                {notes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab toolbar (columns only) */}
      {tab === 'columns' && (
        <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${p.toolbar} shrink-0`}>
          <button onClick={() => setShowAllSummaries(v => !v)} className={`text-xs px-2 py-1 rounded transition-colors ${showAllSummaries ? 'bg-blue-700 text-white' : `${p.btn}`}`}>
            {showAllSummaries ? 'Ocultar Resumos' : 'Exibir Resumos'}
          </button>
          <div className="flex-1" />
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className={`text-xs px-2 py-1 ${p.btn} rounded transition-colors`}>✏ Editar</button>
          ) : (
            <div className="flex gap-1">
              <button onClick={handleSaveDoc} className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">Salvar</button>
              <button onClick={() => { setEditMode(false); setLocalDoc({}) }} className={`text-xs px-2 py-1 ${p.btn} rounded transition-colors`}>Cancelar</button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'columns' && (
          <div>
            {showAllSummaries ? (
              table.columns.map(col => {
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
                      {editMode ? (
                        <textarea className={`w-full text-xs ${p.editArea} border rounded p-2 resize-none focus:outline-none focus:border-blue-500`} rows={2} value={colDoc?.summary ?? ''} placeholder="Resumo da coluna..." onChange={e => handleSummaryChange(col.name, e.target.value)} />
                      ) : (
                        <p className={`text-xs ${p.text} leading-relaxed pl-6`}>
                          {colDoc?.summary || <span className={`italic ${p.textMuted}`}>Sem informação</span>}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              table.columns.map(col => {
                const colDoc = mergedDoc?.columns.find(c => c.name === col.name)
                return (
                  <ColumnRow key={col.name} col={col} doc={colDoc} editMode={editMode} onSummaryChange={handleSummaryChange} />
                )
              })
            )}
          </div>
        )}

        {tab === 'relations' && (
          <div className="p-3 space-y-4">
            {outgoing.length > 0 && (
              <div>
                <div className={`text-xs ${p.text} mb-2 font-semibold uppercase tracking-wide`}>Saída ({outgoing.length})</div>
                <div className="space-y-1">
                  {outgoing.map((r, i) => (
                    <button key={i} onClick={() => navigateTo(r.toTable)} className={`w-full flex items-center gap-2 px-3 py-2 rounded ${p.relation} text-left transition-colors`}>
                      <span className="text-blue-400 font-mono text-xs shrink-0">{r.fromColumn}</span>
                      <span className={`${p.textMuted} text-xs shrink-0`}>→</span>
                      <span className="text-gray-900 dark:text-white text-xs font-medium shrink-0">{r.toTable}</span>
                      <span className={`${p.textMuted} text-xs shrink-0`}>.{r.toColumn}</span>
                      <span className={`ml-auto ${p.text} text-xs font-mono shrink-0`}>{r.relation}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {incoming.length > 0 && (
              <div>
                <div className={`text-xs ${p.text} mb-2 font-semibold uppercase tracking-wide`}>Entrada ({incoming.length})</div>
                <div className="space-y-1">
                  {incoming.map((r, i) => (
                    <button key={i} onClick={() => navigateTo(r.fromTable)} className={`w-full flex items-center gap-2 px-3 py-2 rounded ${p.relation} text-left transition-colors`}>
                      <span className="text-gray-900 dark:text-white text-xs font-medium shrink-0">{r.fromTable}</span>
                      <span className={`${p.textMuted} text-xs shrink-0`}>.{r.fromColumn}</span>
                      <span className={`${p.textMuted} text-xs shrink-0`}>→</span>
                      <span className="text-green-500 dark:text-green-400 font-mono text-xs shrink-0">{r.toColumn}</span>
                      <span className={`ml-auto ${p.text} text-xs font-mono shrink-0`}>{r.relation}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {outgoing.length === 0 && incoming.length === 0 && (
              <p className={`${p.textMuted} text-xs text-center py-8`}>Nenhuma relação</p>
            )}
          </div>
        )}

        {tab === 'notes' && (
          <div className="p-3">
            {notes.length === 0 && (
              <p className={`text-xs ${p.textMuted} italic text-center py-4`}>Nenhuma nota ainda.</p>
            )}
            {notes.map((note, i) => (
              <NoteCard
                key={note.id}
                note={note}
                index={i}
                onSave={handleSaveNote}
                onDelete={handleDeleteNote}
                p={p}
              />
            ))}
            <button
              onClick={handleAddNote}
              className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs ${p.btn} border border-dashed ${p.header} rounded-lg transition-colors`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="5" y1="1" x2="5" y2="9" />
                <line x1="1" y1="5" x2="9" y2="5" />
              </svg>
              Nova nota
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
