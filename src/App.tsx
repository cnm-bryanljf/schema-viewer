import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
} from '@xyflow/react'
import { toPng } from 'html-to-image'
import '@xyflow/react/dist/style.css'

import TableNode from './components/TableNode'
import GroupNode from './components/GroupNode'
import AnimatedDashedEdge from './components/AnimatedDashedEdge'
import SidePanel from './components/SidePanel'
import Sidebar from './components/Sidebar'
import LandingScreen from './components/LandingScreen'
import DbmlEditorModal from './components/DbmlEditorModal'
import { useDbmlParser } from './hooks/useDbmlParser'
import { computeLayout } from './hooks/useLayout'
import { computeGroupLayout, computeSnowflakeLayout, type LayoutResult } from './hooks/useAutoLayout'
import { usePositions } from './hooks/usePositions'
import { verifyDocs, parseDocFile } from './hooks/useDocParser'
import { useWorkspace } from './hooks/useWorkspace'
import type { ParsedTable, ParsedRef, SchemaEntry, TableVisibilityRow, GroupNodeData, DocsMap, TableDoc, Workspace } from './types'

const nodeTypes = { tableNode: TableNode, groupNode: GroupNode }
const edgeTypes = { animatedDashed: AnimatedDashedEdge }

const GROUP_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  '#6366f1', '#84cc16',
]

function simpleHash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0 }
  return Math.abs(h).toString(16).slice(0, 8)
}

async function compressSvx(payload: object): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(bytes)
  writer.close()
  const buf = await new Response(cs.readable).arrayBuffer()
  // btoa with chunks to avoid call-stack limit on large payloads
  const u8 = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < u8.length; i += 8192) {
    bin += String.fromCharCode(...u8.subarray(i, i + 8192))
  }
  return `SVX1:${btoa(bin)}`
}

async function decompressSvx(data: string): Promise<object> {
  if (!data.startsWith('SVX1:')) throw new Error('Arquivo inválido: prefixo SVX1 ausente')
  const bin = atob(data.slice(5))
  const u8 = Uint8Array.from(bin, c => c.charCodeAt(0))
  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  writer.write(u8)
  writer.close()
  const text = await new Response(ds.readable).text()
  return JSON.parse(text)
}

// ── Main app ──────────────────────────────────────────────────────────────────

function AppInner() {
  const { schema, error: parseError, parse } = useDbmlParser()
  const [schemaId, setSchemaId] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedTable, setSelectedTable] = useState<ParsedTable | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showEdges, setShowEdges] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [search, setSearch] = useState('')
  const [activeGroups, setActiveGroups] = useState<Set<string>>(new Set())
  const [hiddenTables, setHiddenTables] = useState<Set<string>>(new Set())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [schemaHistory, setSchemaHistory] = useState<SchemaEntry[]>([])
  const [currentContent, setCurrentContent] = useState<string | null>(null)
  const [showDbmlEditor, setShowDbmlEditor] = useState(false)
  const [docsModal, setDocsModal] = useState<{ title: string; lines: string[]; ok: boolean } | null>(null)

  // Group drag/edit mode
  const [editableGroups, setEditableGroups] = useState<Set<string>>(new Set())

  // Theme
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem('schema-viewer-theme') !== 'light' } catch { return true }
  })

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Docs state
  const [docs, setDocs] = useState<DocsMap>({})
  const [docOverrides, setDocOverrides] = useState<Record<string, Partial<TableDoc>>>({})

  // Workspace state
  const [workspaceList, setWorkspaceList] = useState<{ id: string; name: string; saved_at: string }[]>([])
  const wsHook = useWorkspace()

  const filePickerRef = useRef<HTMLInputElement>(null)
  const { fitView } = useReactFlow()
  const positionsHook = usePositions(schemaId)
  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Theme ──────────────────────────────────────────────────────────────────
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const next = !prev
      try { localStorage.setItem('schema-viewer-theme', next ? 'dark' : 'light') } catch {}
      return next
    })
  }, [])

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setSidebarCollapsed(true)
      } else {
        await document.exitFullscreen()
      }
    } catch (e) { console.warn('Fullscreen error:', e) }
  }, [])

  // ── Undo / Redo ────────────────────────────────────────────────────────────
  type NodeSnapshot = { id: string; position: { x: number; y: number }; style?: React.CSSProperties }[]
  const undoStack = useRef<NodeSnapshot[]>([])
  const redoStack = useRef<NodeSnapshot[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const snapshotNodes = useCallback((nds: Node[]): NodeSnapshot =>
    nds.filter(n => n.type === 'tableNode' || n.type === 'groupNode')
       .map(n => ({ id: n.id, position: { ...n.position }, style: n.style ? { ...n.style } : undefined }))
  , [])

  const pushUndo = useCallback((snapshot: NodeSnapshot) => {
    undoStack.current.push(snapshot)
    if (undoStack.current.length > 60) undoStack.current.shift()
    redoStack.current = []
    setCanUndo(true)
    setCanRedo(false)
  }, [])

  const restoreSnapshot = useCallback((snapshot: NodeSnapshot) => {
    setNodes(nds => nds.map(n => {
      const s = snapshot.find(x => x.id === n.id)
      if (!s) return n
      return { ...n, position: s.position, style: s.style ?? n.style }
    }))
  }, [setNodes])

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return
    setNodes(nds => { redoStack.current.push(snapshotNodes(nds)); return nds })
    const snapshot = undoStack.current.pop()!
    restoreSnapshot(snapshot)
    setCanUndo(undoStack.current.length > 0)
    setCanRedo(true)
  }, [setNodes, snapshotNodes, restoreSnapshot])

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return
    setNodes(nds => { undoStack.current.push(snapshotNodes(nds)); return nds })
    const snapshot = redoStack.current.pop()!
    restoreSnapshot(snapshot)
    setCanUndo(true)
    setCanRedo(redoStack.current.length > 0)
  }, [setNodes, snapshotNodes, restoreSnapshot])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); handleRedo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleUndo, handleRedo])

  // ── History ────────────────────────────────────────────────────────────────
  useEffect(() => {
    try { setSchemaHistory(JSON.parse(localStorage.getItem('schema-history') ?? '[]')) } catch {}
  }, [])

  const saveHistory = useCallback((entry: SchemaEntry) => {
    setSchemaHistory(prev => {
      const next = [entry, ...prev.filter(e => e.id !== entry.id)].slice(0, 5)
      localStorage.setItem('schema-history', JSON.stringify(next))
      return next
    })
  }, [])

  // ── Workspace ──────────────────────────────────────────────────────────────
  const refreshWorkspaceList = useCallback(async () => {
    const list = await wsHook.listWorkspaces()
    setWorkspaceList(list)
  }, [wsHook])

  // Auto-load last workspace on mount
  useEffect(() => {
    const init = async () => {
      await refreshWorkspaceList()
      const lastId = await wsHook.getLastWorkspaceId()
      if (!lastId) return
      const ws = await wsHook.loadWorkspace(lastId)
      if (!ws) return
      await restoreWorkspace(ws)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const captureWorkspaceData = useCallback(async (): Promise<Omit<Workspace, 'id' | 'name' | 'savedAt'>> => {
    let nodePositions: Workspace['nodePositions'] = []
    setNodes(nds => {
      nodePositions = nds
        .filter(n => n.type === 'tableNode' || n.type === 'groupNode')
        .map(n => ({
          id: n.id,
          x: n.position.x,
          y: n.position.y,
          w: (n.style?.width as number) ?? undefined,
          h: (n.style?.height as number) ?? undefined,
        }))
      return nds
    })
    const notes = schemaId ? await positionsHook.fetchAllNotes() : {}
    return {
      schemaContent: currentContent ?? '',
      schemaId: schemaId ?? '',
      nodePositions,
      notes,
      docOverrides,
      hiddenTables: [...hiddenTables],
      hasDocs: Object.keys(docs).length > 0,
      docs,
    }
  }, [currentContent, schemaId, docOverrides, hiddenTables, docs, setNodes, positionsHook])

  const handleSaveWorkspace = useCallback(async (name: string, existingId?: string) => {
    const data = await captureWorkspaceData()
    const id = existingId ?? `ws_${simpleHash(name + Date.now())}`
    const ws: Workspace = { id, name, savedAt: new Date().toISOString(), ...data }
    await wsHook.saveWorkspace(ws)
    await refreshWorkspaceList()
  }, [captureWorkspaceData, wsHook, refreshWorkspaceList])

  const restoreWorkspace = useCallback(async (ws: Workspace) => {
    if (!ws.schemaContent) return
    setSchemaId(ws.schemaId ?? null)
    setCurrentContent(ws.schemaContent)
    setDocOverrides(ws.docOverrides ?? {})
    setHiddenTables(new Set(ws.hiddenTables ?? []))
    await buildGraph(ws.schemaContent, ws.schemaId, ws.nodePositions)
    // Re-apply hidden tables after buildGraph resets them
    if (ws.hiddenTables?.length) setHiddenTables(new Set(ws.hiddenTables))
    // Restore notes to DB
    if (ws.notes && ws.schemaId) {
      for (const [tableName, noteItems] of Object.entries(ws.notes)) {
        for (const note of noteItems as import('./types').NoteItem[]) {
          try {
            await fetch(`/api/notes/${encodeURIComponent(ws.schemaId)}/${encodeURIComponent(tableName)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(note),
            })
          } catch {}
        }
      }
    }
    // Restore embedded docs if present
    if (ws.docs && Object.keys(ws.docs).length > 0) setDocs(ws.docs)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoadWorkspace = useCallback(async (id: string) => {
    const ws = await wsHook.loadWorkspace(id)
    if (!ws) return
    await restoreWorkspace(ws)
  }, [wsHook, restoreWorkspace])

  const handleDeleteWorkspace = useCallback(async (id: string) => {
    await wsHook.deleteWorkspace(id)
    await refreshWorkspaceList()
  }, [wsHook, refreshWorkspaceList])

  const handleExportWorkspace = useCallback(async (id: string) => {
    const ws = await wsHook.loadWorkspace(id)
    if (!ws) return
    try {
      const svx = await compressSvx(ws)
      const blob = new Blob([svx], { type: 'text/plain' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${ws.name.replace(/[^a-z0-9]/gi, '_')}.svx`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      setDocsModal({ ok: false, title: 'Erro ao exportar', lines: [String(e)] })
    }
  }, [wsHook])

  const handleExportCurrentAsSvx = useCallback(async () => {
    const data = await captureWorkspaceData()
    const name = `schema_${new Date().toISOString().slice(0, 10)}`
    try {
      const svx = await compressSvx({ ...data, id: `ws_${simpleHash(name + Date.now())}`, name, savedAt: new Date().toISOString() })
      const blob = new Blob([svx], { type: 'text/plain' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${name}.svx`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      setDocsModal({ ok: false, title: 'Erro ao exportar', lines: [String(e)] })
    }
  }, [captureWorkspaceData])

  const handleImportWorkspace = useCallback(async (data: string) => {
    try {
      let ws: import('./types').Workspace
      if (data.startsWith('SVX1:')) {
        ws = await decompressSvx(data) as import('./types').Workspace
      } else {
        ws = JSON.parse(data) as import('./types').Workspace
      }
      if (!ws.schemaContent) throw new Error('Arquivo inválido')
      ws.id = `ws_${simpleHash((ws.name ?? 'import') + Date.now())}`
      ws.savedAt = new Date().toISOString()
      await wsHook.saveWorkspace(ws)
      await refreshWorkspaceList()
      await restoreWorkspace(ws)
    } catch (e) {
      setDocsModal({ ok: false, title: 'Erro ao importar', lines: [String(e)] })
    }
  }, [wsHook, refreshWorkspaceList, restoreWorkspace])

  // ── Group edit mode ────────────────────────────────────────────────────────
  const handleToggleGroupEdit = useCallback((groupId: string) => {
    setEditableGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  // ── Build graph ────────────────────────────────────────────────────────────
  function buildGroupColors(groupNames: string[]): Record<string, string> {
    const map: Record<string, string> = {}
    groupNames.forEach((name, i) => { map[name] = GROUP_PALETTE[i % GROUP_PALETTE.length] })
    return map
  }

  const buildGraph = useCallback(async (
    content: string,
    id: string,
    forcePositions?: { id: string; x: number; y: number; w?: number; h?: number }[]
  ) => {
    const parsed = parse(content)
    if (!parsed) return

    let savedPositions: Record<string, { x: number; y: number }> = {}
    if (!forcePositions) {
      try {
        const res = await fetch(`/api/positions/${encodeURIComponent(id)}`)
        if (res.ok) {
          const data: { table_name: string; x: number; y: number }[] = await res.json()
          savedPositions = Object.fromEntries(data.map(r => [r.table_name, { x: r.x, y: r.y }]))
        }
      } catch {}
    }

    const groupNames = [...new Set(parsed.tables.map(t => t.group).filter(Boolean) as string[])]
    const groupColors = buildGroupColors(groupNames)

    // When no saved positions exist and groups are declared, default to group layout
    let defaultGroupBoxes: Record<string, { x: number; y: number; width: number; height: number }> | null = null
    const layoutPositions = forcePositions
      ? Object.fromEntries(forcePositions.map(p => [p.id, { x: p.x, y: p.y }]))
      : Object.keys(savedPositions).length > 0
        ? savedPositions
        : groupNames.length > 0
          ? (() => {
              const r = computeGroupLayout(parsed)
              defaultGroupBoxes = r.groupBoxes
              return r.tablePositions
            })()
          : computeLayout(parsed)

    const newNodes: Node[] = []

    groupNames.forEach((gName, i) => {
      const forced = forcePositions?.find(p => p.id === `group__${gName}`)
      const autoBox = defaultGroupBoxes ? (defaultGroupBoxes as any)[gName] : null
      const gId = `group__${gName}`
      newNodes.push({
        id: gId,
        type: 'groupNode',
        position: forced
          ? { x: forced.x, y: forced.y }
          : autoBox
            ? { x: autoBox.x, y: autoBox.y }
            : { x: 0, y: 0 },
        zIndex: -1,
        data: {
          groupName: gName,
          color: GROUP_PALETTE[i % GROUP_PALETTE.length],
          editable: false,
          onToggleEdit: handleToggleGroupEdit,
        } satisfies GroupNodeData,
        draggable: false,
        selectable: false,
        style: {
          width: forced?.w ?? autoBox?.width ?? 200,
          height: forced?.h ?? autoBox?.height ?? 200,
        },
      })
    })

    parsed.tables.forEach(t => {
      const pos = layoutPositions[t.name] ?? { x: 0, y: 0 }
      const groupColor = t.group ? (groupColors[t.group] ?? null) : null
      newNodes.push({
        id: t.name,
        type: 'tableNode',
        position: pos,
        zIndex: 1,
        data: { table: { ...t, groupColor } },
        draggable: true,
      })
    })

    const newEdges: Edge[] = parsed.refs.map((r, i) => ({
      id: `edge-${i}-${r.fromTable}-${r.toTable}`,
      source: r.fromTable,
      target: r.toTable,
      type: 'smoothstep',
      animated: false,
      label: showLabels ? `${r.fromColumn} → ${r.toColumn}` : undefined,
      data: { ref: r },
      style: { stroke: '#475569', strokeWidth: 1.5 },
      zIndex: 0,
    }))

    setNodes(newNodes)
    setEdges(newEdges)
    setHiddenTables(new Set())
    setSelectedNodeId(null)
    setEditableGroups(new Set())
    undoStack.current = []
    redoStack.current = []
    setCanUndo(false)
    setCanRedo(false)
    setTimeout(() => fitView({ duration: 600, padding: 0.1 }), 100)
  }, [parse, showLabels, setNodes, setEdges, fitView, handleToggleGroupEdit])

  // ── Sync editable groups to node data ──────────────────────────────────────
  useEffect(() => {
    setNodes(nds => nds.map(n => {
      if (n.type !== 'groupNode') return n
      const editable = editableGroups.has(n.id)
      return {
        ...n,
        draggable: editable,
        dragHandle: editable ? '.group-drag-handle' : undefined,
        className: editable ? 'group-editable' : '',
        data: { ...n.data, editable, onToggleEdit: handleToggleGroupEdit },
      }
    }))
  }, [editableGroups, setNodes, handleToggleGroupEdit])

  const handleParse = useCallback(async (content: string, filename?: string) => {
    const id = filename ?? `hash_${simpleHash(content)}`
    const label = filename ?? `Colado em ${new Date().toLocaleTimeString('pt-BR')} ${new Date().toLocaleDateString('pt-BR')}`
    setSchemaId(id)
    setCurrentContent(content)
    saveHistory({ id, label, loadedAt: new Date().toISOString() })
    await buildGraph(content, id)
  }, [buildGraph, saveHistory])

  const handleLoadHistory = useCallback(async (id: string) => {
    if (currentContent && id) { setSchemaId(id); await buildGraph(currentContent, id) }
  }, [currentContent, buildGraph])

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleNodeDragStart = useCallback((_: unknown, node: Node) => {
    setNodes(nds => { pushUndo(snapshotNodes(nds)); return nds })
    return undefined
  }, [setNodes, pushUndo, snapshotNodes])

  const handleNodeDragStop = useCallback((_: unknown, node: Node) => {
    if (node.type !== 'tableNode') return
    if (pendingSave.current) clearTimeout(pendingSave.current)
    pendingSave.current = setTimeout(() => {
      positionsHook.savePosition(node.id, node.position.x, node.position.y)
    }, 300)
  }, [positionsHook])

  // ── Layout ─────────────────────────────────────────────────────────────────
  const applyLayout = useCallback((result: LayoutResult) => {
    setNodes(nds => { pushUndo(snapshotNodes(nds)); return nds })
    const centerSet = result.centerTables ? new Set(result.centerTables) : null
    setNodes(nds => nds.map(n => {
      if (n.type === 'tableNode') {
        const pos = result.tablePositions[n.id]
        // Update snowflake-center marker (clear for non-snowflake layouts)
        const newData = { ...n.data, isSnowflakeCenter: centerSet ? centerSet.has(n.id) : false }
        if (pos) {
          if (schemaId) fetch(`/api/positions/${encodeURIComponent(schemaId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table_name: n.id, x: pos.x, y: pos.y }) }).catch(() => {})
          return { ...n, position: pos, data: newData }
        }
        return { ...n, data: newData }
      }
      if (n.type === 'groupNode') {
        const key = n.id.replace('group__', '')
        const box = result.groupBoxes[key]
        // Set both top-level width/height AND style so React Flow resets
        // any internally tracked dimensions from NodeResizer edits.
        if (box) return {
          ...n,
          position: { x: box.x, y: box.y },
          width: box.width,
          height: box.height,
          style: { ...n.style, width: box.width, height: box.height },
        }
      }
      return n
    }))
    setTimeout(() => fitView({ duration: 700, padding: 0.08 }), 80)
  }, [setNodes, pushUndo, snapshotNodes, fitView, schemaId])

  const handleReset = useCallback(async () => {
    if (!schemaId || !currentContent) return
    await positionsHook.deletePositions()
    await buildGraph(currentContent, schemaId)
  }, [schemaId, currentContent, positionsHook, buildGraph])

  const handleGroupLayout = useCallback(() => { if (schema) applyLayout(computeGroupLayout(schema)) }, [schema, applyLayout])
  const handleSnowflakeLayout = useCallback(() => { if (schema) applyLayout(computeSnowflakeLayout(schema)) }, [schema, applyLayout])

  const handleEditDbml = useCallback(async (content: string) => {
    setCurrentContent(content)
    const id = schemaId ?? `hash_${simpleHash(content)}`
    setSchemaId(id)
    await buildGraph(content, id)
    setShowDbmlEditor(false)
  }, [schemaId, buildGraph])

  // ── PNG Export ─────────────────────────────────────────────────────────────
  const handleSavePng = useCallback(async () => {
    const el = document.querySelector('.react-flow') as HTMLElement | null
    if (!el) return
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: darkMode ? '#020617' : '#f1f5f9', pixelRatio: 2,
        filter: node => {
          if (node.classList?.contains('react-flow__minimap')) return false
          if (node.classList?.contains('react-flow__controls')) return false
          return true
        },
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `schema-${schemaId ?? 'export'}.png`
      a.click()
    } catch (e) { console.error('Erro ao gerar PNG:', e) }
  }, [schemaId, darkMode])

  // ── Groups & filters ───────────────────────────────────────────────────────
  const handleToggleGroup = useCallback((name: string, shift: boolean) => {
    setActiveGroups(prev => {
      const next = new Set(prev)
      if (!shift) { if (next.has(name) && next.size === 1) next.clear(); else { next.clear(); next.add(name) } }
      else { if (next.has(name)) next.delete(name); else next.add(name) }
      return next
    })
  }, [])

  const handleToggleTableVisibility = useCallback((name: string) => {
    setHiddenTables(prev => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); return next })
  }, [])

  const handleFocusTable = useCallback((name: string) => {
    fitView({ nodes: [{ id: name }], duration: 500, padding: 0.3 })
    setSelectedTable(schema?.tables.find(t => t.name === name) ?? null)
    setSelectedNodeId(name)
  }, [fitView, schema])

  const handleFocusGroup = useCallback((groupName: string) => {
    if (!schema) return
    const groupTableIds = schema.tables
      .filter(t => (t.group ?? 'Sem grupo') === groupName)
      .map(t => ({ id: t.name }))
    if (groupTableIds.length === 0) return
    fitView({ nodes: groupTableIds, duration: 600, padding: 0.15 })
  }, [fitView, schema])

  const handleToggleGroupVisibility = useCallback((groupName: string) => {
    if (!schema) return
    const groupTables = schema.tables
      .filter(t => (t.group ?? 'Sem grupo') === groupName)
      .map(t => t.name)
    setHiddenTables(prev => {
      const next = new Set(prev)
      const allHidden = groupTables.every(n => next.has(n))
      if (allHidden) groupTables.forEach(n => next.delete(n))
      else groupTables.forEach(n => next.add(n))
      return next
    })
  }, [schema])

  // ── Docs ──────────────────────────────────────────────────────────────────
  const handleImportDocs = useCallback(async (files: FileList) => {
    try {
      const newDocs: DocsMap = { ...docs }
      const readFile = (f: File): Promise<string> => new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = e => res(e.target?.result as string)
        r.onerror = rej
        r.readAsText(f)
      })
      for (const file of Array.from(files)) {
        if (!file.name.endsWith('.md')) continue
        const content = await readFile(file)
        const doc = parseDocFile(file.name, content)
        newDocs[doc.tableName] = doc
      }
      setDocs(newDocs)
      if (schema) {
        const { missing, extra } = verifyDocs(newDocs, schema.tables.map(t => t.name))
        const msgs: string[] = []
        if (missing.length) msgs.push(`Sem doc: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` +${missing.length - 5}` : ''}`)
        if (extra.length) msgs.push(`Extras: ${extra.slice(0, 3).join(', ')}${extra.length > 3 ? ` +${extra.length - 3}` : ''}`)
        const total = schema.tables.length
        const covered = total - missing.length
        setDocsModal({
          ok: true,
          title: `Documentação carregada: ${covered}/${total} tabelas`,
          lines: msgs.length ? msgs : ['Todas as tabelas têm documentação!'],
        })
      }
    } catch (e) {
      setDocsModal({ ok: false, title: 'Erro ao carregar docs', lines: [String(e)] })
    }
  }, [schema, docs])

  const handleDocEdit = useCallback((tableName: string, patch: Partial<TableDoc>) => {
    setDocOverrides(prev => ({ ...prev, [tableName]: { ...(prev[tableName] ?? {}), ...patch } }))
  }, [])

  // Merge docs with overrides
  const mergedDocs: DocsMap = {}
  Object.entries(docs).forEach(([k, v]) => {
    const ovr = docOverrides[k]
    mergedDocs[k] = ovr ? { ...v, ...ovr, columns: ovr.columns ?? v.columns } : v
  })

  // ── Selection highlight ────────────────────────────────────────────────────
  useEffect(() => {
    if (!schema) return
    if (!selectedNodeId) {
      setNodes(nds => nds.map(n => {
        if (n.type !== 'tableNode') return n
        const { selectionDimmed: _s, highlightedColumns: _h, ...rest } = n.data as any
        return { ...n, data: rest }
      }))
      setEdges(eds => eds.map(e => {
        if (e.type !== 'animatedDashed') return e
        return { ...e, type: 'smoothstep', style: { stroke: '#475569', strokeWidth: 1.5 }, zIndex: 0 }
      }))
      return
    }
    const activeRefs = schema.refs.filter(r => r.fromTable === selectedNodeId || r.toTable === selectedNodeId)
    const connectedNodeIds = new Set(activeRefs.flatMap(r => [r.fromTable, r.toTable]).filter(id => id !== selectedNodeId))
    const colMap = new Map<string, string[]>()
    const addCol = (table: string, col: string) => { if (!colMap.has(table)) colMap.set(table, []); colMap.get(table)!.push(col) }
    activeRefs.forEach((r: ParsedRef) => { addCol(r.fromTable, r.fromColumn); addCol(r.toTable, r.toColumn) })
    setNodes(nds => nds.map(n => {
      if (n.type !== 'tableNode') return n
      return { ...n, data: { ...n.data, selectionDimmed: n.id !== selectedNodeId && !connectedNodeIds.has(n.id), highlightedColumns: colMap.get(n.id) ?? [] } }
    }))
    setEdges(eds => eds.map(e => {
      const isActive = e.source === selectedNodeId || e.target === selectedNodeId
      // zIndex 0 keeps edges in SVG layer, below table nodes (zIndex 1) — lines pass behind nodes
      if (isActive) return { ...e, type: 'animatedDashed', zIndex: 0, data: { ...(e.data ?? {}), showLabel: true } }
      return { ...e, type: 'smoothstep', zIndex: 0, style: { stroke: '#475569', strokeWidth: 1, opacity: 0.15 } }
    }))
  }, [selectedNodeId, schema, setNodes, setEdges])

  // Search + group dim
  useEffect(() => {
    if (!schema) return
    setNodes(nds => nds.map(n => {
      if (n.type !== 'tableNode') return n
      const table = schema.tables.find(t => t.name === n.id)
      if (!table) return n
      const matchesSearch = !search || n.id.toLowerCase().includes(search.toLowerCase())
      const matchesGroup = activeGroups.size === 0 || activeGroups.has(table.group ?? 'Sem grupo')
      return { ...n, data: { ...n.data, dimmed: !matchesSearch || !matchesGroup } }
    }))
  }, [search, activeGroups, schema, setNodes])

  // Hidden tables
  useEffect(() => {
    setNodes(nds => nds.map(n => n.type !== 'tableNode' ? n : { ...n, hidden: hiddenTables.has(n.id) }))
  }, [hiddenTables, setNodes])

  // Edge visibility + labels
  useEffect(() => {
    setEdges(eds => eds.map(e => {
      if (e.type === 'animatedDashed') return { ...e, hidden: !showEdges }
      return {
        ...e,
        hidden: !showEdges,
        label: showLabels ? `${(e.data as any)?.ref?.fromColumn} → ${(e.data as any)?.ref?.toColumn}` : undefined,
      }
    }))
  }, [showEdges, showLabels, setEdges])

  // ── Derived data ───────────────────────────────────────────────────────────
  const groups = schema
    ? [...new Set(schema.tables.map(t => t.group).filter(Boolean) as string[])].map((name, i) => ({ name, color: GROUP_PALETTE[i % GROUP_PALETTE.length] }))
    : []

  const hiddenGroups = new Set<string>(
    groups.filter(g => {
      const groupTables = schema?.tables.filter(t => (t.group ?? 'Sem grupo') === g.name) ?? []
      return groupTables.length > 0 && groupTables.every(t => hiddenTables.has(t.name))
    }).map(g => g.name)
  )

  const tableVisibilityRows: TableVisibilityRow[] = schema
    ? schema.tables
        .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))
        .map(t => ({ name: t.name, visible: !hiddenTables.has(t.name) }))
    : []

  // ── Landing screen ─────────────────────────────────────────────────────────
  if (!schema) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <LandingScreen onParse={handleParse} parseError={parseError} onOpenEditor={() => setShowDbmlEditor(true)} onImportSvx={handleImportWorkspace} />
        {showDbmlEditor && (
          <DbmlEditorModal
            content={currentContent ?? ''}
            darkMode={darkMode}
            onApply={handleEditDbml}
            onClose={() => setShowDbmlEditor(false)}
          />
        )}
        {docsModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDocsModal(null)}>
            <div className="w-80 rounded-xl shadow-2xl border overflow-hidden bg-slate-900 border-slate-700" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-slate-800 border-slate-700">
                {docsModal.ok
                  ? <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 shrink-0"><polyline points="1.5,8 5.5,12 14.5,4"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-400 shrink-0"><circle cx="8" cy="8" r="7"/><line x1="8" y1="5" x2="8" y2="8.5"/><line x1="8" y1="11" x2="8" y2="11.5"/></svg>
                }
                <span className="text-sm font-semibold text-slate-100">{docsModal.title}</span>
              </div>
              <div className="px-4 py-3 space-y-1">
                {docsModal.lines.map((l, i) => <p key={i} className="text-xs text-slate-400">{l}</p>)}
              </div>
              <div className="flex justify-end px-4 py-2.5 border-t border-slate-700">
                <button onClick={() => setDocsModal(null)} className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">OK</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex w-screen h-screen ${darkMode ? 'dark bg-slate-950' : 'bg-gray-100'}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(v => !v)}
        onOpenFile={() => filePickerRef.current?.click()}
        onOpenDbmlEditor={() => setShowDbmlEditor(true)}
        onSavePng={handleSavePng}
        schemaHistory={schemaHistory}
        onLoadHistory={handleLoadHistory}
        showEdges={showEdges}
        onToggleEdges={() => setShowEdges(v => !v)}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels(v => !v)}
        onReset={handleReset}
        onGroupLayout={handleGroupLayout}
        onSnowflakeLayout={handleSnowflakeLayout}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        groups={groups}
        activeGroups={activeGroups}
        onToggleGroup={handleToggleGroup}
        onFocusGroup={handleFocusGroup}
        onToggleGroupVisibility={handleToggleGroupVisibility}
        hiddenGroups={hiddenGroups}
        search={search}
        onSearch={setSearch}
        tables={tableVisibilityRows}
        onToggleTableVisibility={handleToggleTableVisibility}
        onFocusTable={handleFocusTable}
        docs={mergedDocs}
        onImportDocs={handleImportDocs}
        workspaces={workspaceList}
        onSaveWorkspace={handleSaveWorkspace}
        onLoadWorkspace={handleLoadWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        onExportWorkspace={handleExportWorkspace}
        onExportCurrentAsSvx={handleExportCurrentAsSvx}
        onImportWorkspace={handleImportWorkspace}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      <div className="flex-1 relative min-w-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={params => setEdges(eds => addEdge(params, eds))}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onNodeClick={(_, node) => {
            if (node.type === 'tableNode') {
              setSelectedTable(schema.tables.find(t => t.name === node.id) ?? null)
              setSelectedNodeId(prev => prev === node.id ? null : node.id)
            }
          }}
          onEdgeClick={(_, edge) => {
            const refData = (edge.data as any)?.ref
            if (refData?.toTable) handleFocusTable(refData.toTable)
          }}
          onPaneClick={() => { setSelectedTable(null); setSelectedNodeId(null) }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          colorMode={darkMode ? 'dark' : 'light'}
          style={{ width: '100%', height: '100%' }}
        >
          <Background color={darkMode ? '#1e293b' : '#cbd5e1'} gap={20} />
          <Controls className={darkMode ? '!bg-slate-900 !border-slate-700' : '!bg-white !border-gray-200'} />
          <MiniMap
            className={darkMode ? '!bg-slate-900 !border-slate-700' : '!bg-white !border-gray-200'}
            nodeColor={n => {
              if (n.type === 'tableNode') return schema.tables.find(tb => tb.name === n.id)?.groupColor ?? '#475569'
              return '#334155'
            }}
            zoomable
            pannable
          />
        </ReactFlow>
      </div>

      <SidePanel
        table={selectedTable}
        refs={schema.refs}
        schemaId={schemaId}
        docs={mergedDocs}
        onClose={() => { setSelectedTable(null); setSelectedNodeId(null) }}
        onFocusTable={handleFocusTable}
        onDocEdit={handleDocEdit}
        darkMode={darkMode}
      />

      <input
        ref={filePickerRef}
        type="file"
        accept=".dbml"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = ev => handleParse(ev.target?.result as string, file.name)
          reader.readAsText(file)
          e.target.value = ''
        }}
      />

      {showDbmlEditor && (
        <DbmlEditorModal
          content={currentContent ?? ''}
          darkMode={darkMode}
          onApply={handleEditDbml}
          onClose={() => setShowDbmlEditor(false)}
        />
      )}

      {docsModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDocsModal(null)}>
          <div
            className={`w-80 rounded-xl shadow-2xl border overflow-hidden ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
            }`}>
              {docsModal.ok ? (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 shrink-0"><polyline points="1.5,8 5.5,12 14.5,4"/></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-400 shrink-0"><circle cx="8" cy="8" r="7"/><line x1="8" y1="5" x2="8" y2="8.5"/><line x1="8" y1="11" x2="8" y2="11.5"/></svg>
              )}
              <span className={`text-sm font-semibold ${
                darkMode ? 'text-slate-100' : 'text-gray-800'
              }`}>{docsModal.title}</span>
            </div>
            {/* Body */}
            <div className="px-4 py-3 space-y-1">
              {docsModal.lines.map((l, i) => (
                <p key={i} className={`text-xs ${
                  darkMode ? 'text-slate-400' : 'text-gray-500'
                }`}>{l}</p>
              ))}
            </div>
            {/* Footer */}
            <div className={`flex justify-end px-4 py-2.5 border-t ${
              darkMode ? 'border-slate-700' : 'border-gray-100'
            }`}>
              <button
                onClick={() => setDocsModal(null)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg transition-colors bg-blue-600 hover:bg-blue-500 text-white"
              >OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return <ReactFlowProvider><AppInner /></ReactFlowProvider>
}
