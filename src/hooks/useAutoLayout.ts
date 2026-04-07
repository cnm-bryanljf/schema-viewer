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
  /** Names of the central (highest-degree) table per group — only set by snowflake layout */
  centerTables?: string[]
}

function placeGroupsInGrid(
  groups: string[],
  getGroupLocalData: (g: string) => {
    localPos: Record<string, { x: number; y: number }>
    bbox: ReturnType<typeof getBBox>
    tables: ParsedTable[]
  },
  padding = GROUP_PADDING,
  gap = GROUP_GAP
): Omit<LayoutResult, 'centerTables'> {
  const cols = groups.length > 4 ? 3 : 2
  const tablePositions: Record<string, { x: number; y: number }> = {}
  const groupBoxes: Record<string, { x: number; y: number; width: number; height: number }> = {}

  // Collect per-group sizes
  const sizes = groups.map(g => {
    const { bbox } = getGroupLocalData(g)
    return {
      width: bbox.width + padding * 2,
      height: bbox.height + padding * 2,
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
    colWidths.slice(0, i).reduce((a, b) => a + b + gap, 0)
  )
  const rowOffsets = rowHeights.map((_, i) =>
    rowHeights.slice(0, i).reduce((a, b) => a + b + gap, 0)
  )

  groups.forEach((gName, i) => {
    const { localPos, bbox, tables } = getGroupLocalData(gName)
    const col = i % cols
    const row = Math.floor(i / cols)
    const gx = colOffsets[col]
    const gy = rowOffsets[row]

    const offsetX = gx + padding - bbox.minX
    const offsetY = gy + padding - bbox.minY

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

// Snowflake-specific spacing constants (+15% vs previous values)
const SF_GROUP_PADDING = 46
const SF_GROUP_GAP = 63
const SF_CHORD_GAP = 32 // minimum pixel gap between edges of adjacent nodes in a ring

/**
 * Minimum circle radius so that `count` evenly-spaced nodes each `nodeW` wide
 * have at least `gap` pixels of clearance between them.
 */
function minRingRadius(count: number, nodeW: number, gap: number): number {
  if (count <= 1) return 0
  return (nodeW + gap) / (2 * Math.sin(Math.PI / count))
}

/**
 * Push overlapping rectangles apart using AABB + margin, multiple passes.
 * All positions are top-left corners; nodes have uniform width NODE_WIDTH and
 * variable height from tableHeight().
 */
function resolveOverlaps(
  localPos: Record<string, { x: number; y: number }>,
  tables: ParsedTable[],
  margin = SF_CHORD_GAP,
  iterations = 10
): void {
  const tableMap = new Map(tables.map(t => [t.name, t]))
  const names = tables.map(t => t.name).filter(n => localPos[n])

  for (let iter = 0; iter < iterations; iter++) {
    let hadOverlap = false
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const pa = localPos[names[i]], pb = localPos[names[j]]
        const ha = tableHeight(tableMap.get(names[i])!)
        const hb = tableHeight(tableMap.get(names[j])!)

        // Centers
        const cxa = pa.x + NODE_WIDTH / 2, cya = pa.y + ha / 2
        const cxb = pb.x + NODE_WIDTH / 2, cyb = pb.y + hb / 2

        const ovX = NODE_WIDTH + margin - Math.abs(cxa - cxb)
        const ovY = (ha + hb) / 2 + margin - Math.abs(cya - cyb)

        if (ovX > 0 && ovY > 0) {
          hadOverlap = true
          // Resolve along axis of least penetration; +1 to guarantee progress
          if (ovX <= ovY) {
            const half = ovX / 2 + 1
            if (cxa <= cxb) { pa.x -= half; pb.x += half } else { pa.x += half; pb.x -= half }
          } else {
            const half = ovY / 2 + 1
            if (cya <= cyb) { pa.y -= half; pb.y += half } else { pa.y += half; pb.y -= half }
          }
        }
      }
    }
    if (!hadOverlap) break
  }
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
  const centerTableNames: string[] = []

  groupMap.forEach((tables, gName) => {
    if (tables.length === 0) return

    const nameSet = new Set(tables.map(t => t.name))

    // Intra-group refs: only refs where both endpoints are in this group
    const intraRefs = schema.refs.filter(r => nameSet.has(r.fromTable) && nameSet.has(r.toTable))

    // If fewer than 2 intra-group relations, fall back to a flat dagre layout
    // (no snowflake structure — tables are placed independently)
    if (intraRefs.length < 2) {
      const localPos = layoutSubgraph(tables, intraRefs)
      const bbox = getBBox(localPos, tables)
      cache.set(gName, { localPos, bbox, tables })
      return
    }

    // Intra-group degree: count only relations within the group
    const intraDegree: Record<string, number> = {}
    tables.forEach(t => { intraDegree[t.name] = 0 })
    intraRefs.forEach(r => {
      intraDegree[r.fromTable] = (intraDegree[r.fromTable] ?? 0) + 1
      intraDegree[r.toTable] = (intraDegree[r.toTable] ?? 0) + 1
    })

    // Main table: highest intra-group degree (ties broken by global degree)
    const main = tables.reduce((a, b) => {
      const da = intraDegree[a.name] ?? 0, db = intraDegree[b.name] ?? 0
      if (da !== db) return da >= db ? a : b
      return (degree[a.name] ?? 0) >= (degree[b.name] ?? 0) ? a : b
    })
    centerTableNames.push(main.name)
    const others = tables.filter(t => t.name !== main.name)

    // Ring 1: in same group AND adjacent to main
    const ring1 = others.filter(t => adjacent.get(main.name)?.has(t.name))
    // Ring 2: rest
    const ring2 = others.filter(t => !adjacent.get(main.name)?.has(t.name))

    const localPos: Record<string, { x: number; y: number }> = {}

    // Center — keep node centred at origin
    localPos[main.name] = { x: -NODE_WIDTH / 2, y: -tableHeight(main) / 2 }

    // Ring-1: use the geometric formula so nodes never overlap regardless of count
    const r1 = Math.max(150, minRingRadius(ring1.length, NODE_WIDTH, SF_CHORD_GAP))

    const ring1Angles: Record<string, number> = {}
    ring1.forEach((t, i) => {
      const angle = (i / Math.max(ring1.length, 1)) * 2 * Math.PI - Math.PI / 2
      ring1Angles[t.name] = angle
      localPos[t.name] = {
        x: Math.cos(angle) * r1 - NODE_WIDTH / 2,
        y: Math.sin(angle) * r1 - tableHeight(t) / 2,
      }
    })

    // Cluster ring-2 tables near their ring-1 neighbours
    const ring2ByRing1 = new Map<string, ParsedTable[]>()
    const ring2Orphans: ParsedTable[] = []
    ring2.forEach(t => {
      const neighbour = ring1.find(
        r => adjacent.get(t.name)?.has(r.name) || adjacent.get(r.name)?.has(t.name)
      )
      if (neighbour) {
        if (!ring2ByRing1.has(neighbour.name)) ring2ByRing1.set(neighbour.name, [])
        ring2ByRing1.get(neighbour.name)!.push(t)
      } else {
        ring2Orphans.push(t)
      }
    })

    // Angular budget available per ring-1 sector (80% to leave gap between sectors)
    const sectorBudget = ring1.length > 0 ? (2 * Math.PI / ring1.length) * 0.8 : 2 * Math.PI

    // Compute r2: large enough so each child in the densest sector is non-overlapping
    let r2 = r1 + Math.max(100, NODE_WIDTH + SF_CHORD_GAP)

    ring1.forEach(r1t => {
      const n = (ring2ByRing1.get(r1t.name) ?? []).length
      if (n <= 1) return
      // Minimum angular step within sector: 2·asin(minChord / (2·r2))
      // Solve for r2: r2 = minChord / (2·sin(sectorBudget / (2*(n-1))))
      const minChord = NODE_WIDTH + SF_CHORD_GAP
      const halfStep = sectorBudget / (2 * (n - 1))
      const sinHalf = Math.sin(halfStep)
      if (sinHalf > 0) r2 = Math.max(r2, minChord / (2 * sinHalf))
    })

    // For orphans spread on full ring, also ensure non-overlap
    if (ring2Orphans.length > 1) {
      r2 = Math.max(r2, minRingRadius(ring2Orphans.length, NODE_WIDTH, SF_CHORD_GAP))
    }

    // Place ring-2 in sectors around their ring-1 parent
    ring1.forEach(r1t => {
      const children = ring2ByRing1.get(r1t.name) ?? []
      const baseAngle = ring1Angles[r1t.name]
      // Exact angular spread so children are just non-overlapping at r2
      const minChord = NODE_WIDTH + SF_CHORD_GAP
      const minAngStep = r2 > 0 ? 2 * Math.asin(Math.min(1, minChord / (2 * r2))) : 0
      const sectorSpread = children.length <= 1 ? 0 : Math.min(sectorBudget, (children.length - 1) * minAngStep)
      children.forEach((t, i) => {
        const offset = children.length > 1
          ? ((i / (children.length - 1)) - 0.5) * sectorSpread
          : 0
        const angle = baseAngle + offset
        localPos[t.name] = {
          x: Math.cos(angle) * r2 - NODE_WIDTH / 2,
          y: Math.sin(angle) * r2 - tableHeight(t) / 2,
        }
      })
    })

    // Place orphan ring-2 tables between ring-1 positions (angular offset to avoid edges)
    const orphanBaseAngle = ring1.length > 0 ? Math.PI / Math.max(ring1.length, 1) : 0
    ring2Orphans.forEach((t, i) => {
      const angle = (i / Math.max(ring2Orphans.length, 1)) * 2 * Math.PI + orphanBaseAngle
      localPos[t.name] = {
        x: Math.cos(angle) * r2 - NODE_WIDTH / 2,
        y: Math.sin(angle) * r2 - tableHeight(t) / 2,
      }
    })

    // Final pass: push apart any still-overlapping nodes
    resolveOverlaps(localPos, tables)

    const bbox = getBBox(localPos, tables)
    cache.set(gName, { localPos, bbox, tables })
  })

  const groups = [...groupMap.keys()].sort((a, b) =>
    groupMap.get(b)!.length - groupMap.get(a)!.length
  )

  return {
    ...placeGroupsInGrid(groups, g => cache.get(g)!, SF_GROUP_PADDING, SF_GROUP_GAP),
    centerTables: centerTableNames,
  }
}
