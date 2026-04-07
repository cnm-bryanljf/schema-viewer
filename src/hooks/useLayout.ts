import dagre from '@dagrejs/dagre'
import type { ParsedSchema } from '../types'

const NODE_WIDTH = 220
const ROW_HEIGHT = 22
const HEADER_HEIGHT = 44

export function computeLayout(schema: ParsedSchema): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40 })
  g.setDefaultEdgeLabel(() => ({}))

  schema.tables.forEach(t => {
    const h = HEADER_HEIGHT + t.columns.length * ROW_HEIGHT
    g.setNode(t.name, { width: NODE_WIDTH, height: h })
  })

  schema.refs.forEach(r => {
    if (g.hasNode(r.fromTable) && g.hasNode(r.toTable)) {
      g.setEdge(r.fromTable, r.toTable)
    }
  })

  dagre.layout(g)

  const positions: Record<string, { x: number; y: number }> = {}
  schema.tables.forEach(t => {
    const node = g.node(t.name)
    if (node) {
      positions[t.name] = { x: node.x - NODE_WIDTH / 2, y: node.y - (HEADER_HEIGHT + t.columns.length * ROW_HEIGHT) / 2 }
    }
  })
  return positions
}
