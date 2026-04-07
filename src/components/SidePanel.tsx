import { useState, useEffect, useRef, useCallback } from 'react'
import type { ParsedTable, ParsedRef, TableDoc, DocsMap } from '../types'
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
        {col.pk && <span className="text-yellow-500 dark:text-yellow-400 shrink-0">🔑</span>}
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

export default function SidePanel({ table, refs, schemaId, docs, onClose, onFocusTable, onDocEdit, darkMode }: Props & { darkMode?: boolean }) {
  const [tab, setTab] = useState<Tab>('columns')
  const [note, setNote] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [showAllSummaries, setShowAllSummaries] = useState(false)
  const [localDoc, setLocalDoc] = useState<Partial<TableDoc>>({})
  const [navStack, setNavStack] = useState<string[]>([])
  const { fetchNote, saveNote } = usePositions(schemaId)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!table) return
    fetchNote(table.name).then(setNote)
    setLocalDoc({})
    setEditMode(false)
    setShowAllSummaries(false)
  }, [table?.name, fetchNote])

  const handleNoteChange = (val: string) => {
    setNote(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (table) saveNote(table.name, val)
    }, 500)
  }

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
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === t ? `${p.tabActive} border-b-2` : p.tabInactive}`}>
            {t === 'columns' ? 'Colunas' : t === 'relations' ? 'Relações' : 'Notas'}
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
                      {col.pk && <span className="text-yellow-400 shrink-0">🔑</span>}
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
            <textarea value={note} onChange={e => handleNoteChange(e.target.value)} placeholder="Adicione notas sobre esta tabela..." className={`w-full h-64 ${p.noteArea} border text-xs rounded p-2 focus:outline-none focus:border-blue-500 resize-none`} />
            <p className={`${p.textMuted} text-xs mt-1`}>Salvo automaticamente</p>
          </div>
        )}
      </div>
    </div>
  )
}
