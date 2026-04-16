import { memo, useCallback, useRef } from 'react'
import { useNodes, useViewport, useReactFlow } from '@xyflow/react'
import type { GroupNodeData } from '../types'

// Must match the header height rendered inside GroupNode (py-1.5 + text ≈ 32px)
const HEADER_H = 32

interface Props {
  editableGroups: Set<string>
  onToggleEdit: (groupId: string) => void
  onDragStart: () => void
}

function GroupHeadersOverlay({ editableGroups, onToggleEdit, onDragStart }: Props) {
  const nodes = useNodes()
  const viewport = useViewport()
  const { setNodes } = useReactFlow()

  // Keep viewport in a ref so drag handlers always use the latest zoom
  const vpRef = useRef(viewport)
  vpRef.current = viewport

  const groupNodes = nodes.filter(n => n.type === 'groupNode' && !n.hidden)

  const startDrag = useCallback(
    (e: React.MouseEvent, groupId: string, startPos: { x: number; y: number }) => {
      if (!editableGroups.has(groupId)) return
      e.preventDefault()
      e.stopPropagation()
      onDragStart()

      const startMouseX = e.clientX
      const startMouseY = e.clientY

      const onMove = (me: MouseEvent) => {
        const { zoom } = vpRef.current
        const dx = (me.clientX - startMouseX) / zoom
        const dy = (me.clientY - startMouseY) / zoom
        setNodes(nds =>
          nds.map(n =>
            n.id === groupId
              ? { ...n, position: { x: startPos.x + dx, y: startPos.y + dy } }
              : n
          )
        )
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [editableGroups, onDragStart, setNodes]
  )

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {groupNodes.map(gNode => {
        const { groupName, color } = gNode.data as GroupNodeData
        const editable = editableGroups.has(gNode.id)
        const nodeW = (gNode.style?.width as number) ?? 200
        const { zoom, x: vpX, y: vpY } = viewport

        // Convert React Flow canvas coordinates → screen coordinates within the container
        const screenX = gNode.position.x * zoom + vpX
        const screenY = gNode.position.y * zoom + vpY

        return (
          <div
            key={gNode.id}
            className="absolute overflow-hidden"
            style={{
              left: screenX,
              top: screenY,
              width: nodeW * zoom,
              height: HEADER_H * zoom,
              borderTopLeftRadius: 12 * zoom,
              borderTopRightRadius: 12 * zoom,
              pointerEvents: 'auto',
            }}
            onMouseDown={e => startDrag(e, gNode.id, gNode.position)}
          >
            {/* Scale inner content with zoom using transform so sizes/text scale naturally */}
            <div
              style={{
                width: nodeW,
                height: HEADER_H,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
              }}
            >
              <div
                className="flex items-center gap-2 select-none w-full h-full px-3"
                style={{
                  background: color + (editable ? '50' : '30'),
                  cursor: editable ? 'grab' : 'default',
                }}
              >
                {editable && (
                  <span className="text-white/50 text-xs shrink-0">⠿</span>
                )}
                <span className="font-semibold text-xs text-white/80 truncate flex-1">
                  {groupName}
                </span>

                {/* Edit toggle button */}
                <button
                  className="shrink-0 flex items-center justify-center w-5 h-5 rounded hover:bg-white/20 transition-colors"
                  title={editable ? 'Fixar grupo (desabilitar edição)' : 'Habilitar mover/redimensionar grupo'}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); onToggleEdit(gNode.id) }}
                >
                  {editable ? (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="8" height="6" rx="1" />
                      <path d="M4 5V3.5a2 2 0 0 1 4 0" />
                    </svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="8" height="6" rx="1" />
                      <path d="M4 5V3.5a2 2 0 0 1 4 0v1.5" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default memo(GroupHeadersOverlay)
