import dagre from '@dagrejs/dagre'
import type { ParsedSchema, ParsedTable } from '../types'

const NODE_WIDTH = 220
const HEADER_HEIGHT = 44
const ROW_HEIGHT = 22
const GROUP_PADDING = 60
const GROUP_GAP = 80

function tableHeight(t: ParsedTable): number {
  return HEADER_HEIGHT + Math.min(t.columns.length, 8) * ROW_HEIGHT
}

function layoutSubgraph(
  tables: ParsedTable[],
  refs: { fromTable: string; toTable: string }[]
): Record<string, { x: number; y: number }> {
  if (tables.length === 0) return {}

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', ranksep: 60, nodesep: 30 })
  g.setDefaultEdgeLabel(() => ({}))

  const nameSet = new Set(tables.map(t => t.name))
  tables.forEach(t => g.setNode(t.name, { width: NODE_WIDTH, height: tableHeight(t) }))
  refs
    .filter(r => nameSet.has(r.fromTable) && nameSet.has(r.toTable))
    .forEach(r => g.setEdge(r.fromTable, r.toTable))

  dagre.layout(g)

  const pos: Record<string, { x: number; y: number }> = {}
  tables.forEach(t => {
    const n = g.node(t.name)
    if (n) pos[t.name] = { x: n.x - NODE_WIDTH / 2, y: n.y - tableHeight(t) / 2 }
  })
  return pos
}

function getBBox(pos: Record<string, { x: number; y: number }>, tables: ParsedTable[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  tables.forEach(t => {
    const p = pos[t.name]
    if (!p) return
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + NODE_WIDTH)
    maxY = Math.max(maxY, p.y + tableHeight(t))
  })
  if (!isFinite(minX)) return { minX: 0, minY: 0, width: NODE_WIDTH, height: HEADER_HEIGHT }
  return { minX, minY, width: maxX - minX, height: maxY - minY }
}

export type LayoutResult = {
  tablePositions: Record<string, { x: number; y: number }>
  groupBoxes: Record<string, { x: number; y: number; width: number; height: number }>
}

function placeGroupsInGrid(
  groups: string[],
  getGroupLocalData: (g: string) => {
    localPos: Record<string, { x: number; y: number }>
    bbox: ReturnType<typeof getBBox>
    tables: ParsedTable[]
  }
): LayoutResult {
  const cols = groups.length > 4 ? 3 : 2
  const tablePositions: Record<string, { x: number; y: number }> = {}
  const groupBoxes: Record<string, { x: number; y: number; width: number; height: number }> = {}

  // Collect per-group sizes
  const sizes = groups.map(g => {
    const { bbox } = getGroupLocalData(g)
    return {
      width: bbox.width + GROUP_PADDING * 2,
      height: bbox.height + GROUP_PADDING * 2,
    }
  })

  // Compute column widths and row heights
  const colWidths: number[] = Array(cols).fill(0)
  const rowHeights: number[] = []
  groups.forEach((_, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    colWidths[col] = Math.max(colWidths[col], sizes[i].width)
    if (!rowHeights[row]) rowHeights[row] = 0
    rowHeights[row] = Math.max(rowHeights[row], sizes[i].height)
  })

  // Cumulative offsets
  const colOffsets = colWidths.map((_, i) =>
    colWidths.slice(0, i).reduce((a, b) => a + b + GROUP_GAP, 0)
  )
  const rowOffsets = rowHeights.map((_, i) =>
    rowHeights.slice(0, i).reduce((a, b) => a + b + GROUP_GAP, 0)
  )

  groups.forEach((gName, i) => {
    const { localPos, bbox, tables } = getGroupLocalData(gName)
    const col = i % cols
    const row = Math.floor(i / cols)
    const gx = colOffsets[col]
    const gy = rowOffsets[row]

    const offsetX = gx + GROUP_PADDING - bbox.minX
    const offsetY = gy + GROUP_PADDING - bbox.minY

    tables.forEach(t => {
      const lp = localPos[t.name]
      if (lp) tablePositions[t.name] = { x: lp.x + offsetX, y: lp.y + offsetY }
    })

    groupBoxes[gName] = {
      x: gx,
      y: gy,
      width: sizes[i].width,
      height: sizes[i].height,
    }
  })

  return { tablePositions, groupBoxes }
}

// ── GROUP LAYOUT ──────────────────────────────────────────────────────────────

export function computeGroupLayout(schema: ParsedSchema): LayoutResult {
  const groupMap = new Map<string, ParsedTable[]>()
  schema.tables.forEach(t => {
    const g = t.group ?? 'Sem grupo'
    if (!groupMap.has(g)) groupMap.set(g, [])
    groupMap.get(g)!.push(t)
  })

  // Pre-compute local layouts
  const cache = new Map<string, { localPos: Record<string, { x: number; y: number }>; bbox: ReturnType<typeof getBBox>; tables: ParsedTable[] }>()
  groupMap.forEach((tables, gName) => {
    const localPos = layoutSubgraph(tables, schema.refs)
    const bbox = getBBox(localPos, tables)
    cache.set(gName, { localPos, bbox, tables })
  })

  const groups = [...groupMap.keys()].sort((a, b) =>
    groupMap.get(b)!.length - groupMap.get(a)!.length
  )

  return placeGroupsInGrid(groups, g => cache.get(g)!)
}

// ── SNOWFLAKE LAYOUT ──────────────────────────────────────────────────────────

export function computeSnowflakeLayout(schema: ParsedSchema): LayoutResult {
  const groupMap = new Map<string, ParsedTable[]>()
  schema.tables.forEach(t => {
    const g = t.group ?? 'Sem grupo'
    if (!groupMap.has(g)) groupMap.set(g, [])
    groupMap.get(g)!.push(t)
  })

  // Global degree map
  const degree: Record<string, number> = {}
  schema.tables.forEach(t => { degree[t.name] = 0 })
  schema.refs.forEach(r => {
    degree[r.fromTable] = (degree[r.fromTable] ?? 0) + 1
    degree[r.toTable] = (degree[r.toTable] ?? 0) + 1
  })

  // Build adjacency for quick ring-1 lookup
  const adjacent = new Map<string, Set<string>>()
  schema.tables.forEach(t => adjacent.set(t.name, new Set()))
  schema.refs.forEach(r => {
    adjacent.get(r.fromTable)?.add(r.toTable)
    adjacent.get(r.toTable)?.add(r.fromTable)
  })

  const cache = new Map<string, { localPos: Record<string, { x: number; y: number }>; bbox: ReturnType<typeof getBBox>; tables: ParsedTable[] }>()

  groupMap.forEach((tables, gName) => {
    if (tables.length === 0) return

    // Main table: highest degree
    const main = tables.reduce((a, b) => (degree[a.name] ?? 0) >= (degree[b.name] ?? 0) ? a : b)
    const others = tables.filter(t => t.name !== main.name)

    // Ring 1: in same group AND adjacent to main
    const ring1 = others.filter(t => adjacent.get(main.name)?.has(t.name))
    // Ring 2: rest
    const ring2 = others.filter(t => !adjacent.get(main.name)?.has(t.name))

    const localPos: Record<string, { x: number; y: number }> = {}

    // Center
    localPos[main.name] = { x: -NODE_WIDTH / 2, y: -tableHeight(main) / 2 }

    const r1 = Math.max(320, ring1.length * 130)
    ring1.forEach((t, i) => {
      const angle = (i / Math.max(ring1.length, 1)) * 2 * Math.PI - Math.PI / 2
      localPos[t.name] = {
        x: Math.cos(angle) * r1 - NODE_WIDTH / 2,
        y: Math.sin(angle) * r1 - tableHeight(t) / 2,
      }
    })

    const r2 = r1 + Math.max(220, ring2.length * 65)
    ring2.forEach((t, i) => {
      const angle = (i / Math.max(ring2.length, 1)) * 2 * Math.PI - Math.PI / 4
      localPos[t.name] = {
        x: Math.cos(angle) * r2 - NODE_WIDTH / 2,
        y: Math.sin(angle) * r2 - tableHeight(t) / 2,
      }
    })

    const bbox = getBBox(localPos, tables)
    cache.set(gName, { localPos, bbox, tables })
  })

  const groups = [...groupMap.keys()].sort((a, b) =>
    groupMap.get(b)!.length - groupMap.get(a)!.length
  )

  return placeGroupsInGrid(groups, g => cache.get(g)!)
}
