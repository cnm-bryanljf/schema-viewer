import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'

function AnimatedDashedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const showLabel = label && (data as any)?.showLabel !== false

  return (
    <>
      {/* Glow / shadow line underneath */}
      <path
        d={edgePath}
        fill="none"
        stroke="#ef4444"
        strokeWidth={5}
        strokeOpacity={0.2}
        strokeLinecap="round"
      />
      {/* Animated dashed line */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: '#ef4444',
          strokeWidth: 2,
          strokeDasharray: '8 5',
          animation: 'dash-flow 0.45s linear infinite',
          filter: 'drop-shadow(0 0 3px #ef444488)',
        }}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            className="absolute pointer-events-none px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-950/90 text-red-300 border border-red-800/60 whitespace-nowrap"
          >
            {label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default memo(AnimatedDashedEdge)
