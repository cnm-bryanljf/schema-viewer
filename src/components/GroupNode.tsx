import { memo } from 'react'
import { NodeResizer } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { GroupNodeData } from '../types'

function GroupNode({ data }: NodeProps) {
  const { color, editable } = data as GroupNodeData

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
      {/* Body only — header is rendered by GroupHeadersOverlay above the edge layer */}
      <div
        className="w-full h-full rounded-xl border-2 select-none"
        style={{ background: bg, borderColor: editable ? color : border }}
      />
    </>
  )
}

export default memo(GroupNode)
