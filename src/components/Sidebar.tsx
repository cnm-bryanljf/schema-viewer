import { useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import type { TableVisibilityRow, DocsMap } from '../types'
import { generateDocTemplate } from '../hooks/useDocParser'

type Group = { name: string; color: string }

type WorkspaceEntry = { id: string; name: string; saved_at: string }

type SidebarProps = {
  collapsed: boolean
  onToggleCollapse: () => void

  // File
  onOpenFile: () => void
  onSavePng: () => void
  schemaHistory: { id: string; label: string }[]
  onLoadHistory: (id: string) => void

  // View
  showEdges: boolean
  onToggleEdges: () => void
  showLabels: boolean
  onToggleLabels: () => void

  // Layout
  onReset: () => void
  onGroupLayout: () => void
  onSnowflakeLayout: () => void

  // Undo / Redo
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean

  // Groups
  groups: Group[]
  activeGroups: Set<string>
  onToggleGroup: (name: string, shift: boolean) => void
  onFocusGroup: (name: string) => void
  onToggleGroupVisibility: (name: string) => void
  hiddenGroups: Set<string>

  // Search + Tables
  search: string
  onSearch: (v: string) => void
  tables: TableVisibilityRow[]
  onToggleTableVisibility: (name: string) => void
  onFocusTable: (name: string) => void

  // Documentation
  docs: DocsMap
  onImportDocs: () => void

  // Workspace
  workspaces: WorkspaceEntry[]
  onSaveWorkspace: (name: string) => void
  onLoadWorkspace: (id: string) => void
  onDeleteWorkspace: (id: string) => void

  // Theme
  darkMode: boolean
  onToggleDarkMode: () => void

  // Fullscreen
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

const STORAGE_KEY = 'schema-viewer-sidebar-sections'

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw))
  } catch {}
  return new Set()
}

function saveCollapsed(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

function TriangleDown({ className }: { className?: string }) {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className={className}>
      <polygon points="0,1 8,1 4,7" />
    </svg>
  )
}

function TriangleRight({ className }: { className?: string }) {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className={className}>
      <polygon points="1,0 7,4 1,8" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0">
      <circle cx="8" cy="8" r="3" />
      <line x1="8" y1="1" x2="8" y2="3" />
      <line x1="8" y1="13" x2="8" y2="15" />
      <line x1="1" y1="8" x2="3" y2="8" />
      <line x1="13" y1="8" x2="15" y2="8" />
      <line x1="3.05" y1="3.05" x2="4.46" y2="4.46" />
      <line x1="11.54" y1="11.54" x2="12.95" y2="12.95" />
      <line x1="12.95" y1="3.05" x2="11.54" y2="4.46" />
      <line x1="4.46" y1="11.54" x2="3.05" y2="12.95" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M13 10.5A6 6 0 0 1 5.5 3a6 6 0 1 0 7.5 7.5z" />
    </svg>
  )
}

function EyeOpen() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 dark:text-slate-400">
      <ellipse cx="8" cy="8" rx="6" ry="3.5" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

function EyeClosed() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 opacity-35 dark:text-slate-500">
      <path d="M2 8c1.5-3 9.5-3 12 0" />
      <line x1="3.5" y1="10.5" x2="2.5" y2="12" />
      <line x1="8" y1="11" x2="8" y2="12.5" />
      <line x1="12.5" y1="10.5" x2="13.5" y2="12" />
    </svg>
  )
}

function Section({
  id, title, children, collapsed, onToggle,
}: {
  id: string; title: string; children: React.ReactNode; collapsed: boolean; onToggle: (id: string) => void
}) {
  return (
    <div className="border-b border-gray-200 dark:border-slate-700/60">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
      >
        <span>{title}</span>
        {collapsed
          ? <TriangleRight className="text-gray-300 dark:text-slate-600" />
          : <TriangleDown className="text-gray-400 dark:text-slate-500" />
        }
      </button>
      {!collapsed && <div className="pb-2">{children}</div>}
    </div>
  )
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors rounded-sm ${
        active
          ? 'bg-slate-700 text-white dark:bg-slate-700 dark:text-white'
          : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

export default function Sidebar(props: SidebarProps) {
  const {
    collapsed, onToggleCollapse,
    onOpenFile, onSavePng,
    schemaHistory, onLoadHistory,
    showEdges, onToggleEdges,
    showLabels, onToggleLabels,
    onReset, onGroupLayout, onSnowflakeLayout,
    onUndo, onRedo, canUndo, canRedo,
    groups, activeGroups, onToggleGroup, onFocusGroup, onToggleGroupVisibility, hiddenGroups,
    search, onSearch,
    tables, onToggleTableVisibility, onFocusTable,
    docs, onImportDocs,
    workspaces, onSaveWorkspace, onLoadWorkspace, onDeleteWorkspace,
    darkMode, onToggleDarkMode,
    isFullscreen, onToggleFullscreen,
  } = props

  const { fitView, zoomIn, zoomOut } = useReactFlow()
  const [savingPng, setSavingPng] = useState(false)
  const [wsNameInput, setWsNameInput] = useState('')
  const [showWsSave, setShowWsSave] = useState(false)
  const [openingFolder, setOpeningFolder] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(loadCollapsed)
  const hasDocs = Object.keys(docs).length > 0

  const isSectionCollapsed = (id: string) => collapsedSections.has(id)
  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      saveCollapsed(next)
      return next
    })
  }

  const handleOpenFolder = async () => {
    setOpeningFolder(true)
    try { await fetch('/api/docs/open-folder', { method: 'POST' }) } finally { setOpeningFolder(false) }
  }

  const handleSavePng = async () => {
    setSavingPng(true)
    try { await onSavePng() } finally { setSavingPng(false) }
  }

  const handleDownloadTemplate = () => {
    const content = generateDocTemplate()
    const blob = new Blob([content], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'nome_da_tabela.md'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const visibleCount = tables.filter(t => t.visible).length

  // ── Collapsed sidebar ──────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <aside className="flex flex-col items-center bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 h-full w-10 shrink-0 py-2 gap-2">
        <button onClick={onToggleCollapse} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white p-1 flex items-center justify-center" title="Expandir">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><polygon points="1,0 7,4 1,8" /></svg>
        </button>
        <button onClick={onOpenFile} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white text-sm p-1" title="Abrir DBML">📂</button>
        <button onClick={handleSavePng} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white text-sm p-1" title="Salvar PNG">💾</button>
        <div className="w-6 h-px bg-gray-200 dark:bg-slate-700" />
        <button onClick={onUndo} disabled={!canUndo} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 p-1" title="Desfazer">↺</button>
        <button onClick={onRedo} disabled={!canRedo} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 p-1" title="Refazer">↻</button>
        <div className="w-6 h-px bg-gray-200 dark:bg-slate-700" />
        <button onClick={() => fitView({ duration: 400 })} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white text-xs p-1" title="Fit">⊞</button>
        <button onClick={() => zoomIn({ duration: 200 })} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white text-xs p-1">+</button>
        <button onClick={() => zoomOut({ duration: 200 })} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white text-xs p-1">−</button>
        <div className="mt-auto flex flex-col gap-1 pb-1">
          <button onClick={onToggleDarkMode} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white text-xs p-1" title={darkMode ? 'Modo claro' : 'Modo escuro'}>
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          <button onClick={onToggleFullscreen} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white text-xs p-1" title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>
            {isFullscreen ? '⊡' : '⊞'}
          </button>
        </div>
      </aside>
    )
  }

  // ── Expanded sidebar ───────────────────────────────────────────────────────
  return (
    <aside className="flex flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 h-full shrink-0 overflow-hidden" style={{ width: 280 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-slate-700 shrink-0">
        <span className="font-bold text-gray-900 dark:text-white text-sm">Schema Viewer</span>
        <div className="flex items-center gap-1">
          {/* Dark mode toggle */}
          <button
            onClick={onToggleDarkMode}
            className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-sm"
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          {/* Fullscreen toggle */}
          <button
            onClick={onToggleFullscreen}
            className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 4V1h3M8 1h3v3M11 8v3H8M4 11H1V8" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 4.5V1h3.5M7.5 1H11v3.5M11 7.5V11H7.5M4.5 11H1V7.5" />
              </svg>
            )}
          </button>
          {/* Collapse */}
          <button onClick={onToggleCollapse} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><polygon points="7,0 1,4 7,8" /></svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* Arquivo */}
        <Section id="arquivo" title="Arquivo" collapsed={isSectionCollapsed('arquivo')} onToggle={toggleSection}>
          <div className="px-2 space-y-1">
            <button onClick={onOpenFile} className="w-full flex items-center gap-2 px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors">
              <span>📂</span> Abrir arquivo .dbml
            </button>
            <button onClick={handleSavePng} disabled={savingPng} className="w-full flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50 text-gray-700 dark:text-slate-200 text-xs font-medium rounded-lg transition-colors">
              <span>💾</span> {savingPng ? 'Salvando...' : 'Salvar como PNG'}
            </button>
            {schemaHistory.length > 0 && (
              <select onChange={e => { if (e.target.value) onLoadHistory(e.target.value); e.target.value = '' }} value=""
                className="w-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-xs rounded-lg px-2 py-1.5 border border-gray-200 dark:border-slate-700 focus:outline-none cursor-pointer">
                <option value="">Histórico recente...</option>
                {schemaHistory.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
              </select>
            )}
          </div>
        </Section>

        {/* Documentação */}
        <Section id="documentacao" title="Documentação" collapsed={isSectionCollapsed('documentacao')} onToggle={toggleSection}>
          <div className="px-2 space-y-1">
            {hasDocs ? (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/40 rounded-lg">
                <span className="text-green-500 dark:text-green-400 text-xs">✓</span>
                <span className="text-green-700 dark:text-green-300 text-xs flex-1">{Object.keys(docs).length} arquivo(s) em docs/</span>
                <button onClick={onImportDocs} className="text-xs text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors" title="Recarregar docs">↺</button>
              </div>
            ) : (
              <div className="px-2 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-300">Pasta <code className="font-mono">docs/</code> sem arquivos.</p>
                <p className="text-xs text-amber-500 mt-0.5">Adicione arquivos .md e clique em carregar.</p>
              </div>
            )}
            <button onClick={onImportDocs} className="w-full flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs rounded-lg border border-dashed border-gray-300 dark:border-slate-600 transition-colors">
              <span>📂</span> Usar pasta docs/
            </button>
            <button onClick={handleOpenFolder} disabled={openingFolder} className="w-full flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 text-gray-500 dark:text-slate-400 text-xs rounded-lg transition-colors">
              <span>📁</span> {openingFolder ? 'Abrindo...' : 'Abrir pasta docs/ no explorador'}
            </button>
            <button onClick={handleDownloadTemplate} className="w-full flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 text-xs rounded-lg transition-colors">
              <span>⬇</span> Baixar modelo .md
            </button>
          </div>
        </Section>

        {/* Workspace */}
        <Section id="workspace" title="Workspace" collapsed={isSectionCollapsed('workspace')} onToggle={toggleSection}>
          <div className="px-2 space-y-1">
            {!showWsSave ? (
              <button onClick={() => setShowWsSave(true)} className="w-full flex items-center gap-2 px-2 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg transition-colors">
                <span>💿</span> Salvar workspace
              </button>
            ) : (
              <div className="space-y-1">
                <input
                  autoFocus
                  value={wsNameInput}
                  onChange={e => setWsNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && wsNameInput.trim()) { onSaveWorkspace(wsNameInput.trim()); setWsNameInput(''); setShowWsSave(false) } if (e.key === 'Escape') setShowWsSave(false) }}
                  placeholder="Nome do workspace..."
                  className="w-full bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-indigo-400 dark:border-indigo-600 focus:outline-none"
                />
                <div className="flex gap-1">
                  <button onClick={() => { if (wsNameInput.trim()) { onSaveWorkspace(wsNameInput.trim()); setWsNameInput(''); setShowWsSave(false) } }} disabled={!wsNameInput.trim()} className="flex-1 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-colors">Salvar</button>
                  <button onClick={() => { setShowWsSave(false); setWsNameInput('') }} className="px-3 py-1 text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 rounded-lg transition-colors">✕</button>
                </div>
              </div>
            )}
            {workspaces.length > 0 && (
              <div className="space-y-0.5 mt-1">
                {workspaces.map(ws => (
                  <div key={ws.id} className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 group">
                    <button onClick={() => onLoadWorkspace(ws.id)} className="flex-1 text-left text-xs text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white truncate">{ws.name}</button>
                    <span className="text-[10px] text-gray-400 dark:text-slate-600 shrink-0">{new Date(ws.saved_at).toLocaleDateString('pt-BR')}</span>
                    <button onClick={() => onDeleteWorkspace(ws.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity px-1">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* Visualização */}
        <Section id="visualizacao" title="Visualização" collapsed={isSectionCollapsed('visualizacao')} onToggle={toggleSection}>
          <ToggleBtn active={showEdges} onClick={onToggleEdges}><span>⟷</span> Relações</ToggleBtn>
          <ToggleBtn active={showLabels} onClick={onToggleLabels}><span>🏷</span> Labels das relações</ToggleBtn>
        </Section>

        {/* Navegação */}
        <Section id="navegacao" title="Navegação" collapsed={isSectionCollapsed('navegacao')} onToggle={toggleSection}>
          <div className="flex items-center gap-1 px-2 mb-1">
            <button onClick={() => fitView({ duration: 400 })} className="flex-1 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 rounded transition-colors">⊞ Fit</button>
            <button onClick={() => zoomIn({ duration: 200 })} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 rounded transition-colors">+</button>
            <button onClick={() => zoomOut({ duration: 200 })} className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 rounded transition-colors">−</button>
          </div>
          <div className="flex items-center gap-1 px-2">
            <button onClick={onUndo} disabled={!canUndo} title="Desfazer (Ctrl+Z)" className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-slate-300 rounded transition-colors">
              <span className="text-base leading-none">↺</span> Desfazer
            </button>
            <button onClick={onRedo} disabled={!canRedo} title="Refazer (Ctrl+Shift+Z)" className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-slate-300 rounded transition-colors">
              <span className="text-base leading-none">↻</span> Refazer
            </button>
          </div>
        </Section>

        {/* Layout */}
        <Section id="layout" title="Layout" collapsed={isSectionCollapsed('layout')} onToggle={toggleSection}>
          <div className="px-2 space-y-1">
            <button onClick={onReset} className="w-full flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs rounded-lg transition-colors">
              <span>↺</span> Reorganizar (dagre)
            </button>
            <button onClick={onGroupLayout} className="w-full flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs rounded-lg transition-colors">
              <span>🔲</span> Agrupar por tipo
            </button>
            <button onClick={onSnowflakeLayout} className="w-full flex items-center gap-2 px-2 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs rounded-lg transition-colors">
              <span>❄</span> Snowflake schema
            </button>
          </div>
        </Section>

        {/* Grupos */}
        {groups.length > 0 && (
          <Section id="grupos" title="Grupos" collapsed={isSectionCollapsed('grupos')} onToggle={toggleSection}>
            <div className="px-2 space-y-1">
              {groups.map(g => {
                const isHidden = hiddenGroups.has(g.name)
                const isActive = activeGroups.has(g.name)
                return (
                  <div key={g.name} className="flex items-center gap-1 rounded-lg border overflow-hidden transition-colors"
                    style={{ borderColor: g.color + '55', background: isActive ? g.color + '15' : 'transparent' }}>
                    <button
                      onClick={() => onFocusGroup(g.name)}
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 text-xs text-left transition-colors"
                      style={{ color: isActive ? g.color : isHidden ? '#94a3b8' : '#64748b' }}
                      title="Focar grupo no canvas"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0 transition-opacity" style={{ background: g.color, opacity: isHidden ? 0.3 : 1 }} />
                      <span className={isHidden ? 'line-through opacity-40' : ''}>{g.name}</span>
                    </button>
                    <button onClick={() => onToggleGroupVisibility(g.name)} className="px-2 py-1.5 flex items-center justify-center transition-colors shrink-0" title={isHidden ? 'Mostrar grupo' : 'Ocultar grupo'}>
                      {isHidden ? <EyeClosed /> : <EyeOpen />}
                    </button>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Tabelas */}
        <Section id="tabelas" title={`Tabelas (${visibleCount}/${tables.length})`} collapsed={isSectionCollapsed('tabelas')} onToggle={toggleSection}>
          <div className="px-2 mb-2">
            <input type="text" value={search} onChange={e => onSearch(e.target.value)} placeholder="Filtrar tabelas..."
              className="w-full bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-200 text-xs rounded-lg px-3 py-1.5 border border-gray-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>
          <div className="px-1">
            {tables.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-600 text-center py-3 italic">Sem resultados</p>
            ) : (
              tables.map(row => (
                <div key={row.name} className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 group">
                  <button onClick={() => onFocusTable(row.name)} className={`flex-1 text-left text-xs truncate px-1 py-0.5 transition-colors ${row.visible ? 'text-gray-700 dark:text-slate-200 hover:text-gray-900 dark:hover:text-white' : 'text-gray-400 dark:text-slate-600 line-through'}`} title="Focar tabela no canvas">
                    {row.name}
                  </button>
                  {docs[row.name] && (
                    <span className="text-[9px] text-green-500 dark:text-green-600 shrink-0" title="Documentação disponível">●</span>
                  )}
                  <button onClick={() => onToggleTableVisibility(row.name)} className="px-1 py-0.5 flex items-center justify-center shrink-0 transition-colors" title={row.visible ? 'Ocultar tabela' : 'Mostrar tabela'}>
                    {row.visible ? <EyeOpen /> : <EyeClosed />}
                  </button>
                </div>
              ))
            )}
          </div>
        </Section>

      </div>
    </aside>
  )
}
