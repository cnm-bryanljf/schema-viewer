import { useState, useRef, useCallback } from 'react'

type WorkspaceEntry = { id: string; name: string; saved_at: string }

type Props = {
  onParse: (content: string, filename?: string) => void
  parseError: string | null
  onOpenEditor: () => void
  onImportSvx: (data: string) => void
  workspaces: WorkspaceEntry[]
  onLoadWorkspace: (id: string) => void
  onDeleteWorkspace: (id: string) => void
  darkMode: boolean
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export default function LandingScreen({
  onParse, parseError, onOpenEditor, onImportSvx,
  workspaces, onLoadWorkspace, onDeleteWorkspace, darkMode,
}: Props) {
  const [mode, setMode] = useState<'idle' | 'paste'>('idle')
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [deletePending, setDeletePending] = useState<WorkspaceEntry | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const svxRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => onParse(e.target?.result as string, file.name)
    reader.readAsText(file)
  }, [onParse])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-8 ${
        darkMode ? 'bg-slate-950' : 'bg-gray-50'
      }`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className="fixed inset-0 bg-blue-500/10 border-4 border-dashed border-blue-500 rounded-2xl z-50 flex items-center justify-center pointer-events-none">
          <p className="text-blue-400 text-2xl font-bold">Solte o arquivo .dbml aqui</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="flex justify-center mb-4">
          <svg width="52" height="52" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            <rect x="4" y="8" width="56" height="48" rx="4"/>
            <path d="M4 20h56"/>
            <path d="M16 32h10M38 32h10M16 40h10M38 40h10M16 48h10M38 48h10"/>
            <path d="M26 32v16M42 32v16"/>
          </svg>
        </div>
        <h1 className={`text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Visualizador de Schema DBML
        </h1>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
          Selecione um projeto salvo ou abra um novo arquivo
        </p>
      </div>

      {parseError && mode === 'idle' && (
        <div className="mb-6 w-full max-w-3xl p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm font-mono whitespace-pre-wrap">
          {parseError}
        </div>
      )}

      <div className="w-full max-w-3xl">

        {/* ── Novo projeto ─────────────────────────────────────────────── */}
        {mode === 'idle' && (
          <div className={`rounded-xl border mb-6 overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              Novo projeto
            </div>
            <div className="p-4 flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm shadow shadow-blue-900/30"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4a1 1 0 0 1 1-1h3.586a1 1 0 0 1 .707.293L8.707 4.7A1 1 0 0 0 9.414 5H13a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z"/>
                </svg>
                Abrir arquivo .dbml
              </button>
              <button
                onClick={onOpenEditor}
                className={`flex items-center gap-2 px-5 py-2.5 font-semibold rounded-lg border transition-colors text-sm ${
                  darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="1" width="8" height="3" rx="1"/>
                  <path d="M3 3h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
                  <path d="M5 8h6M5 11h4"/>
                </svg>
                Colar DBML
              </button>
              <button
                onClick={() => svxRef.current?.click()}
                className={`flex items-center gap-2 px-5 py-2.5 font-medium rounded-lg border transition-colors text-sm ${
                  darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    : 'bg-white hover:bg-gray-100 text-gray-600 border-gray-200'
                }`}
              >
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="shrink-0">
                  <defs>
                    <linearGradient id="svxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor:'#00d2ff',stopOpacity:1}} />
                      <stop offset="100%" style={{stopColor:'#3a7bd5',stopOpacity:1}} />
                    </linearGradient>
                  </defs>
                  <g stroke="url(#svxGrad)" strokeWidth="1.5" fill="none">
                    <path d="M50 15 L80 32.5 L80 67.5 L50 85 L20 67.5 L20 32.5 Z" />
                    <line x1="50" y1="15" x2="50" y2="35" /><line x1="80" y1="32.5" x2="62" y2="40" />
                    <line x1="80" y1="67.5" x2="62" y2="60" /><line x1="50" y1="85" x2="50" y2="65" />
                    <line x1="20" y1="67.5" x2="38" y2="60" /><line x1="20" y1="32.5" x2="38" y2="40" />
                    <ellipse cx="50" cy="40" rx="12" ry="5" />
                    <line x1="38" y1="40" x2="38" y2="60" /><line x1="62" y1="40" x2="62" y2="60" />
                    <path d="M38 60 Q50 65 62 60" />
                  </g>
                </svg>
                Abrir arquivo .svx
              </button>
            </div>
          </div>
        )}

        {/* ── Paste mode ───────────────────────────────────────────────── */}
        {mode === 'paste' && (
          <div className={`rounded-xl border mb-6 overflow-hidden ${
            darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider ${
              darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              Colar DBML
            </div>
            <div className="p-4">
              {parseError && (
                <div className="mb-3 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm font-mono whitespace-pre-wrap">
                  {parseError}
                </div>
              )}
              <textarea
                autoFocus
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Cole seu conteúdo DBML aqui..."
                className={`w-full h-52 text-sm font-mono rounded-lg p-3 border focus:outline-none focus:border-blue-500 resize-none ${
                  darkMode
                    ? 'bg-slate-800 text-slate-200 border-slate-600'
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
              />
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => onParse(text)}
                  disabled={!text.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Carregar
                </button>
                <button
                  onClick={() => { setMode('idle'); setText('') }}
                  className={`px-5 py-2 rounded-lg transition-colors text-sm ${
                    darkMode
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Projetos salvos ───────────────────────────────────────────── */}
        <div className={`rounded-xl border overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className={`px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider ${
            darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            Projetos salvos
          </div>

          {workspaces.length === 0 ? (
            <div className={`px-4 py-8 text-center text-sm ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              Nenhum projeto salvo ainda
            </div>
          ) : (
            <ul className="divide-y divide-slate-700/50 dark:divide-slate-700/50">
              {workspaces.map(ws => (
                <li
                  key={ws.id}
                  className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    darkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onLoadWorkspace(ws.id)}
                >
                  {/* icon */}
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    darkMode ? 'bg-slate-700' : 'bg-blue-50'
                  }`}>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                      <rect x="1" y="3" width="14" height="11" rx="1.5"/>
                      <path d="M1 7h14"/>
                      <path d="M5 11h2M9 11h2"/>
                    </svg>
                  </div>

                  {/* name + date */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>
                      {ws.name}
                    </p>
                    <p className={`text-xs truncate ${darkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                      {formatDate(ws.saved_at)}
                    </p>
                  </div>

                  {/* open button (visible on hover) */}
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                    darkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}>
                    Abrir
                  </span>

                  {/* delete button */}
                  <button
                    onClick={e => { e.stopPropagation(); setDeletePending(ws) }}
                    className={`shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                      darkMode ? 'hover:bg-red-900/40 text-slate-500 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                    }`}
                    title="Excluir workspace"
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2,4 14,4"/><path d="M5 4V2h6v2"/><path d="M3 4l1 10h8l1-10"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className={`mt-6 text-center text-xs ${darkMode ? 'text-slate-600' : 'text-gray-400'}`}>
          Arraste um arquivo .dbml para qualquer lugar da tela
        </p>
      </div>

      {/* ── Delete confirm modal ──────────────────────────────────────────── */}
      {deletePending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDeletePending(null)}
        >
          <div
            className={`w-80 rounded-xl shadow-2xl border overflow-hidden ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${
              darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0">
                <path d="M8 2L1 14h14L8 2z"/><line x1="8" y1="7" x2="8" y2="10"/><line x1="8" y1="12" x2="8" y2="12.5"/>
              </svg>
              <span className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>
                Excluir workspace
              </span>
            </div>
            <div className="px-4 py-3">
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Tem certeza que deseja excluir o workspace{' '}
                <span className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                  "{deletePending.name}"
                </span>?
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className={`flex justify-end gap-2 px-4 py-2.5 border-t ${
              darkMode ? 'border-slate-700' : 'border-gray-100'
            }`}>
              <button
                onClick={() => setDeletePending(null)}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >Cancelar</button>
              <button
                onClick={() => {
                  onDeleteWorkspace(deletePending.id)
                  setDeletePending(null)
                }}
                className="px-4 py-1.5 text-xs font-medium rounded-lg transition-colors bg-red-600 hover:bg-red-500 text-white"
              >Excluir</button>
            </div>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept=".dbml" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      <input ref={svxRef} type="file" accept=".svx" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]; if (!f) return
          const r = new FileReader(); r.onload = ev => onImportSvx(ev.target?.result as string); r.readAsText(f)
          e.target.value = ''
        }} />
    </div>
  )
}
