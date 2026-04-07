import { useState, memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { TableNodeData } from '../types'

const MAX_VISIBLE = 8

function TableNode({ data }: NodeProps) {
  const { table, dimmed, selectionDimmed, highlightedColumns = [] } = data as TableNodeData
  const [expanded, setExpanded] = useState(false)

  const color = table.groupColor ?? '#64748b'
  const visibleCols = expanded ? table.columns : table.columns.slice(0, MAX_VISIBLE)
  const hiddenCount = table.columns.length - MAX_VISIBLE

  const hasHighlight = highlightedColumns.length > 0
  const opacity = selectionDimmed ? 0.15 : dimmed ? 0.2 : 1

  const borderColor = hasHighlight ? '#ef4444' : 'rgba(255,255,255,0.1)'
  const boxShadow = hasHighlight ? '0 0 0 2px #ef4444, 0 0 12px #ef444455' : undefined

  return (
    <div
      className="rounded-lg shadow-lg overflow-hidden min-w-[200px] transition-all duration-150"
      style={{ opacity, background: 'var(--node-bg)', border: `1px solid ${borderColor}`, boxShadow }}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-2 !h-2" />

      {/* Header */}
      <div
        className="px-3 py-2 font-bold text-sm text-white truncate"
        style={{ background: color }}
        title={table.name}
      >
        {table.name}
      </div>

      {/* Columns */}
      <div style={{ borderColor: 'var(--node-divide)' }} className="divide-y">
        {visibleCols.map(col => {
          const isActive = highlightedColumns.includes(col.name)
          return (
            <div
              key={col.name}
              className={`flex items-center gap-2 px-3 py-1 text-xs transition-colors duration-100 ${
                isActive ? 'bg-red-950/60' : ''
              }`}
            >
              {col.pk ? (
                <span title="Primary Key" className="text-yellow-400 shrink-0">🔑</span>
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <span
                className={`truncate font-medium ${isActive ? 'text-red-300' : ''}`}
                style={isActive ? {} : { color: 'var(--node-text)' }}
              >
                {col.name}
              </span>
              <span
                className={`ml-auto shrink-0 font-mono ${isActive ? 'text-red-400' : ''}`}
                style={isActive ? {} : { color: 'var(--node-text-muted)' }}
              >
                {col.type}
              </span>
              {!col.nullable && (
                <span className="text-red-400 shrink-0" title="NOT NULL">*</span>
              )}
              {isActive && (
                <span className="shrink-0 text-red-400" title="Coluna com relação ativa">⟶</span>
              )}
            </div>
          )
        })}
      </div>

      {hiddenCount > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-xs py-1 px-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--node-text-muted)' }}
        >
          +{hiddenCount} colunas
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="w-full text-xs py-1 px-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--node-text-muted)' }}
        >
          Mostrar menos
        </button>
      )}
    </div>
  )
}

export default memo(TableNode)
