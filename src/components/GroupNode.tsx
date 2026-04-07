import { memo } from 'react'
import { NodeResizer } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { GroupNodeData } from '../types'

function GroupNode({ id, data }: NodeProps) {
  const { groupName, color, editable, onToggleEdit } = data as GroupNodeData

  const bg = color + '18'
  const border = color + '55'

  return (
    <>
      {editable && (
        <NodeResizer
          color={color}
          isVisible={editable}
          minWidth={120}
          minHeight={60}
          handleStyle={{ width: 10, height: 10, borderRadius: 3 }}
        />
      )}
      <div
        className="w-full h-full rounded-xl border-2 select-none"
        style={{ background: bg, borderColor: editable ? color : border }}
      >
        <div
          className={`group-drag-handle group-interaction px-3 py-1.5 rounded-t-xl flex items-center gap-2 select-none ${editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
          style={{ background: color + (editable ? '50' : '30') }}
          title={editable ? 'Arraste aqui para mover o grupo' : groupName}
        >
          {editable && (
            <span className="text-white/50 text-xs shrink-0">⠿</span>
          )}
          <span className="font-semibold text-xs text-white/80 truncate flex-1">{groupName}</span>

          {/* Edit toggle icon */}
          <button
            className="group-interaction shrink-0 flex items-center justify-center w-5 h-5 rounded hover:bg-white/20 transition-colors"
            title={editable ? 'Fixar grupo (desabilitar edição)' : 'Habilitar mover/redimensionar grupo'}
            onClick={(e) => {
              e.stopPropagation()
              onToggleEdit?.(id)
            }}
          >
            {editable ? (
              /* unlock icon – group is editable */
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="8" height="6" rx="1" />
                <path d="M4 5V3.5a2 2 0 0 1 4 0" />
              </svg>
            ) : (
              /* lock icon – group is fixed */
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="8" height="6" rx="1" />
                <path d="M4 5V3.5a2 2 0 0 1 4 0v1.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

export default memo(GroupNode)
