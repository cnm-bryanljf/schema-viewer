import { useState } from 'react'
import { Panel, useReactFlow } from '@xyflow/react'
import type { ParsedRef, ParsedSchema } from '../types'
import { defaultRelationCols } from '../hooks/useDbmlMutator'

type RelationType = ParsedRef['relation']

type PendingRelation = {
  fromTable: string
  toTable: string
}

type Props = {
  schema: ParsedSchema | null
  relationMode: boolean
  drawingFrom: string | null
  relationType: RelationType
  pendingRelation: PendingRelation | null
  tableCount: number
  darkMode: boolean
  groups: { name: string; color: string }[]
  onToggleRelationMode: () => void
  onSetRelationType: (t: RelationType) => void
  onCancelRelation: () => void
  onConfirmRelation: (fromTable: string, fromCol: string, toTable: string, toCol: string, type: RelationType) => void
  onAddTable: (name: string, x: number, y: number, group?: string | null) => void
  onAddGroup: (name: string, color: string) => void
}

const REL_TYPES: { value: RelationType; label: string; title: string }[] = [
  { value: '1-N', label: '1→N', title: 'Um para muitos' },
  { value: 'N-1', label: 'N→1', title: 'Muitos para um' },
  { value: '1-1', label: '1→1', title: 'Um para um' },
  { value: 'N-N', label: 'N↔N', title: 'Muitos para muitos' },
]

export default function CanvasToolbar({
  schema,
  relationMode,
  drawingFrom,
  relationType,
  pendingRelation,
  tableCount,
  darkMode,
  groups,
  onToggleRelationMode,
  onSetRelationType,
  onCancelRelation,
  onConfirmRelation,
  onAddTable,
  onAddGroup,
}: Props) {
  const { screenToFlowPosition } = useReactFlow()
  const [addingTable, setAddingTable] = useState(false)
  const [newTableName, setNewTableName] = useState('')
  const [newTableGroup, setNewTableGroup] = useState<string>('__none__')
  // Adding group state
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState('#3b82f6')
  // Inline new-group from table form
  const [creatingGroupInline, setCreatingGroupInline] = useState(false)
  const [inlineGroupName, setInlineGroupName] = useState('')
  const [inlineGroupColor, setInlineGroupColor] = useState('#3b82f6')

  // Pending relation column state
  const defaultCols = pendingRelation && schema
    ? defaultRelationCols(schema, pendingRelation.fromTable, pendingRelation.toTable)
    : { fromColumn: 'id', toColumn: 'id' }
  const [fromCol, setFromCol] = useState(defaultCols.fromColumn)
  const [toCol, setToCol] = useState(defaultCols.toColumn)
  const [pendingType, setPendingType] = useState<RelationType>(relationType)

  // Update defaults when pendingRelation changes
  if (pendingRelation && schema) {
    const d = defaultRelationCols(schema, pendingRelation.fromTable, pendingRelation.toTable)
    if (fromCol === defaultCols.fromColumn && fromCol !== d.fromColumn) setFromCol(d.fromColumn)
    if (toCol === defaultCols.toColumn && toCol !== d.toColumn) setToCol(d.toColumn)
  }

  const base = darkMode
    ? 'bg-slate-900 border-slate-700 text-slate-300'
    : 'bg-white border-gray-200 text-gray-700'
  const btnBase = darkMode
    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
    : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-600 hover:text-gray-900'
  const btnActive = 'bg-red-600 hover:bg-red-500 border-red-500 text-white'
  const selectCls = darkMode
    ? 'bg-slate-800 border-slate-600 text-slate-200 focus:outline-none text-xs rounded px-1.5 py-0.5'
    : 'bg-white border-gray-300 text-gray-700 focus:outline-none text-xs rounded px-1.5 py-0.5'

  const handleAddTable = () => {
    const name = newTableName.trim() || `nova_tabela_${tableCount + 1}`
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    const group = newTableGroup === '__none__' ? null : newTableGroup
    onAddTable(name, center.x - 80, center.y - 60, group)
    setNewTableName('')
    setNewTableGroup('__none__')
    setCreatingGroupInline(false)
    setInlineGroupName('')
    setAddingTable(false)
  }

  const handleAddGroup = () => {
    const name = newGroupName.trim()
    if (!name) return
    onAddGroup(name, newGroupColor)
    setNewGroupName('')
    setNewGroupColor('#3b82f6')
    setAddingGroup(false)
  }

  const handleCreateInlineGroup = () => {
    const name = inlineGroupName.trim()
    if (!name) return
    onAddGroup(name, inlineGroupColor)
    setNewTableGroup(name)
    setCreatingGroupInline(false)
    setInlineGroupName('')
    setInlineGroupColor('#3b82f6')
  }

  const handleConfirm = () => {
    if (!pendingRelation) return
    onConfirmRelation(
      pendingRelation.fromTable, fromCol,
      pendingRelation.toTable, toCol,
      pendingType
    )
  }

  const fromTableCols = schema?.tables.find(t => t.name === pendingRelation?.fromTable)?.columns ?? []
  const toTableCols   = schema?.tables.find(t => t.name === pendingRelation?.toTable)?.columns ?? []

  return (
    <Panel position="top-left" className="flex flex-col gap-1.5 !m-3 !pointer-events-auto">
      <div className={`flex items-center gap-1 p-1 rounded-xl border shadow-lg ${base}`}>
        {/* Add Table */}
        {!addingTable ? (
          <>
            <button
              onClick={() => setAddingTable(true)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-colors ${btnBase}`}
              title="Adicionar tabela"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="14" height="10" rx="1"/>
                <line x1="1" y1="7" x2="15" y2="7"/>
                <line x1="8" y1="10" x2="8" y2="14"/>
                <line x1="6" y1="12" x2="10" y2="12"/>
              </svg>
              <span>+ Tabela</span>
            </button>
            <button
              onClick={() => setAddingGroup(true)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-colors ${btnBase}`}
              title="Adicionar grupo"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
              </svg>
              <span>+ Grupo</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newTableName}
                onChange={e => setNewTableName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddTable(); if (e.key === 'Escape') { setAddingTable(false); setNewTableName(''); setNewTableGroup('__none__'); setCreatingGroupInline(false) } }}
                placeholder={`nova_tabela_${tableCount + 1}`}
                className={`text-xs rounded px-2 py-1 border focus:outline-none focus:border-blue-500 w-36 ${darkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-gray-300 text-gray-800'}`}
              />
              <button onClick={handleAddTable} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">OK</button>
              <button onClick={() => { setAddingTable(false); setNewTableName(''); setNewTableGroup('__none__'); setCreatingGroupInline(false) }} className={`px-1.5 py-1 text-xs rounded transition-colors ${btnBase}`}>✕</button>
            </div>
            {/* Group selector */}
            {!creatingGroupInline ? (
              <select
                value={newTableGroup}
                onChange={e => {
                  if (e.target.value === '__new__') { setCreatingGroupInline(true); setNewTableGroup('__none__') }
                  else setNewTableGroup(e.target.value)
                }}
                className={`text-xs rounded px-1.5 py-0.5 border focus:outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-gray-300 text-gray-700'}`}
              >
                <option value="__none__">Sem grupo</option>
                {groups.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
                <option value="__new__">+ Criar novo grupo...</option>
              </select>
            ) : (
              <div className="flex items-center gap-1">
                <input autoFocus value={inlineGroupName} onChange={e => setInlineGroupName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateInlineGroup(); if (e.key === 'Escape') { setCreatingGroupInline(false) } }} placeholder="Nome do grupo" className={`flex-1 text-xs rounded px-1.5 py-0.5 border focus:outline-none ${darkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-gray-300 text-gray-700'}`} />
                <input type="color" value={inlineGroupColor} onChange={e => setInlineGroupColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" title="Cor do grupo" />
                <button onClick={handleCreateInlineGroup} className="px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">OK</button>
                <button onClick={() => setCreatingGroupInline(false)} className={`px-1.5 py-0.5 text-xs rounded ${btnBase}`}>✕</button>
              </div>
            )}
          </div>
        )}

        {/* Adding group standalone */}
        {addingGroup && (
          <div className={`flex items-center gap-1 px-1 py-1 rounded-lg border ${darkMode ? 'border-slate-600' : 'border-gray-200'}`}>
            <input autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddGroup(); if (e.key === 'Escape') setAddingGroup(false) }} placeholder="Nome do grupo" className={`text-xs rounded px-2 py-1 border focus:outline-none w-28 ${darkMode ? 'bg-slate-800 border-slate-600 text-slate-200' : 'bg-white border-gray-300 text-gray-800'}`} />
            <input type="color" value={newGroupColor} onChange={e => setNewGroupColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" title="Cor do grupo" />
            <button onClick={handleAddGroup} disabled={!newGroupName.trim()} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded transition-colors">OK</button>
            <button onClick={() => { setAddingGroup(false); setNewGroupName('') }} className={`px-1.5 py-1 text-xs rounded ${btnBase}`}>✕</button>
          </div>
        )}

        <div className={`w-px h-5 ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />

        {/* Relation mode toggle */}
        <button
          onClick={onToggleRelationMode}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs transition-colors ${relationMode ? btnActive : btnBase}`}
          title={relationMode ? 'Sair do modo de relação (Esc)' : 'Modo de relação'}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="3" cy="8" r="2"/>
            <circle cx="13" cy="8" r="2"/>
            <line x1="5" y1="8" x2="11" y2="8"/>
            <line x1="9" y1="6" x2="11" y2="8"/>
            <line x1="9" y1="10" x2="11" y2="8"/>
          </svg>
          {relationMode ? (
            <span className="font-medium">{drawingFrom ? `De: ${drawingFrom}` : 'Clique na origem'}</span>
          ) : (
            <span>Relação</span>
          )}
        </button>

        {/* Relation type selector (only when in relation mode) */}
        {relationMode && (
          <>
            <div className={`w-px h-5 ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
            <div className="flex gap-0.5">
              {REL_TYPES.map(rt => (
                <button
                  key={rt.value}
                  onClick={() => onSetRelationType(rt.value)}
                  title={rt.title}
                  className={`px-2 py-1 text-[10px] rounded border transition-colors font-mono ${
                    relationType === rt.value
                      ? 'bg-red-700 border-red-600 text-white'
                      : btnBase
                  }`}
                >
                  {rt.label}
                </button>
              ))}
            </div>
            {(drawingFrom || pendingRelation) && (
              <>
                <div className={`w-px h-5 ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`} />
                <button
                  onClick={onCancelRelation}
                  className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${btnBase}`}
                  title="Cancelar (Esc)"
                >✕</button>
              </>
            )}
          </>
        )}
      </div>

      {/* Pending relation confirmation panel */}
      {pendingRelation && (
        <div className={`p-3 rounded-xl border shadow-xl text-xs space-y-2.5 ${base}`}>
          <div className="font-semibold text-sm flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="3" cy="8" r="2"/><circle cx="13" cy="8" r="2"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="9" y1="6" x2="11" y2="8"/><line x1="9" y1="10" x2="11" y2="8"/></svg>
            Nova relação
          </div>

          {/* From */}
          <div className="space-y-1">
            <div className={`text-[10px] uppercase tracking-wide font-semibold ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>De</div>
            <div className="flex items-center gap-1.5">
              <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{pendingRelation.fromTable}</span>
              <span className={darkMode ? 'text-slate-500' : 'text-gray-400'}>/</span>
              <select value={fromCol} onChange={e => setFromCol(e.target.value)} className={`border ${selectCls}`}>
                {fromTableCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Type */}
          <div className="space-y-1">
            <div className={`text-[10px] uppercase tracking-wide font-semibold ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Tipo</div>
            <div className="flex gap-1">
              {REL_TYPES.map(rt => (
                <button
                  key={rt.value}
                  onClick={() => setPendingType(rt.value)}
                  title={rt.title}
                  className={`flex-1 py-1 text-[10px] rounded border transition-colors font-mono ${
                    pendingType === rt.value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : btnBase
                  }`}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>

          {/* To */}
          <div className="space-y-1">
            <div className={`text-[10px] uppercase tracking-wide font-semibold ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>Para</div>
            <div className="flex items-center gap-1.5">
              <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>{pendingRelation.toTable}</span>
              <span className={darkMode ? 'text-slate-500' : 'text-gray-400'}>/</span>
              <select value={toCol} onChange={e => setToCol(e.target.value)} className={`border ${selectCls}`}>
                {toTableCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-1 pt-1">
            <button
              onClick={handleConfirm}
              className="flex-1 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
            >
              Criar relação
            </button>
            <button
              onClick={onCancelRelation}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${btnBase}`}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </Panel>
  )
}
