import { useReactFlow } from '@xyflow/react'
import type { ParsedTable } from '../types'

type Props = {
  onOpenFile: () => void
  onReset: () => void
  showEdges: boolean
  onToggleEdges: () => void
  showLabels: boolean
  onToggleLabels: () => void
  search: string
  onSearch: (v: string) => void
  groups: { name: string; color: string }[]
  activeGroups: Set<string>
  onToggleGroup: (name: string, shift: boolean) => void
  tables: ParsedTable[]
  schemaHistory: { id: string; label: string }[]
  onLoadHistory: (id: string) => void
}

export default function Toolbar({
  onOpenFile,
  onReset,
  showEdges,
  onToggleEdges,
  showLabels,
  onToggleLabels,
  search,
  onSearch,
  groups,
  activeGroups,
  onToggleGroup,
  schemaHistory,
  onLoadHistory,
}: Props) {
  const { fitView, zoomIn, zoomOut } = useReactFlow()

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-slate-900/95 border border-slate-700 rounded-xl px-3 py-2 shadow-2xl backdrop-blur-sm">
      {/* File actions */}
      <button
        onClick={onOpenFile}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
      >
        <span>📂</span> Abrir DBML
      </button>

      {schemaHistory.length > 0 && (
        <select
          onChange={e => e.target.value && onLoadHistory(e.target.value)}
          value=""
          className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1.5 border border-slate-700 focus:outline-none cursor-pointer"
        >
          <option value="">Histórico</option>
          {schemaHistory.map(h => (
            <option key={h.id} value={h.id}>{h.label}</option>
          ))}
        </select>
      )}

      <div className="w-px h-5 bg-slate-700" />

      {/* Zoom controls */}
      <button onClick={() => fitView({ duration: 400 })} title="Fit view" className="px-2 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-xs transition-colors">
        ⊞
      </button>
      <button onClick={() => zoomIn({ duration: 200 })} title="Zoom in" className="px-2 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-xs transition-colors">
        +
      </button>
      <button onClick={() => zoomOut({ duration: 200 })} title="Zoom out" className="px-2 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-xs transition-colors">
        −
      </button>

      <div className="w-px h-5 bg-slate-700" />

      {/* Toggles */}
      <button
        onClick={onToggleEdges}
        title={showEdges ? 'Ocultar relações' : 'Mostrar relações'}
        className={`px-2 py-1.5 text-xs rounded-lg transition-colors ${showEdges ? 'text-white bg-slate-700' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
      >
        ⟷
      </button>
      <button
        onClick={onToggleLabels}
        title={showLabels ? 'Ocultar labels' : 'Mostrar labels'}
        className={`px-2 py-1.5 text-xs rounded-lg transition-colors ${showLabels ? 'text-white bg-slate-700' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
      >
        🏷
      </button>
      <button
        onClick={onReset}
        title="Reset layout"
        className="px-2 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
      >
        ↺
      </button>

      <div className="w-px h-5 bg-slate-700" />

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Buscar tabela..."
        className="bg-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-blue-500 w-36 placeholder-slate-500"
      />

      {/* Group pills */}
      {groups.length > 0 && (
        <>
          <div className="w-px h-5 bg-slate-700" />
          <div className="flex gap-1 flex-wrap max-w-72">
            {groups.map(g => (
              <button
                key={g.name}
                onClick={e => onToggleGroup(g.name, e.shiftKey)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors border`}
                style={{
                  background: activeGroups.has(g.name) ? g.color + '33' : 'transparent',
                  borderColor: g.color + '66',
                  color: activeGroups.has(g.name) ? g.color : '#94a3b8',
                }}
              >
                {g.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
