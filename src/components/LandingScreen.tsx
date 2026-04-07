import { useState, useRef, useCallback } from 'react'

type Props = {
  onParse: (content: string, filename?: string) => void
  parseError: string | null
  onOpenEditor: () => void
  onImportSvx: (data: string) => void
}

export default function LandingScreen({ onParse, parseError, onOpenEditor, onImportSvx }: Props) {
  const [mode, setMode] = useState<'idle' | 'paste'>('idle')
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const svxRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const content = e.target?.result as string
      onParse(content, file.name)
    }
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
      className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8"
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className="fixed inset-0 bg-blue-500/10 border-4 border-dashed border-blue-500 rounded-2xl z-50 flex items-center justify-center pointer-events-none">
          <p className="text-blue-400 text-2xl font-bold">Solte o arquivo .dbml aqui</p>
        </div>
      )}

      {parseError && mode === 'idle' && (
        <div className="mb-6 w-full max-w-2xl p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm font-mono whitespace-pre-wrap">
          {parseError}
        </div>
      )}

      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 dark:text-blue-400">
            <rect x="4" y="8" width="56" height="48" rx="4"/>
            <path d="M4 20h56"/>
            <path d="M16 32h10M38 32h10M16 40h10M38 40h10M16 48h10M38 48h10"/>
            <path d="M26 32v16M42 32v16"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Visualizador de Schema DBML</h1>
        <p className="text-gray-500 dark:text-slate-400">Abra ou cole um arquivo <code className="text-blue-500 dark:text-blue-400">.dbml</code> para visualizar seu schema</p>
      </div>

      {mode === 'idle' && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-900/30"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4a1 1 0 0 1 1-1h3.586a1 1 0 0 1 .707.293L8.707 4.7A1 1 0 0 0 9.414 5H13a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z"/></svg>
              Abrir arquivo .dbml
            </button>
            <button
              onClick={onOpenEditor}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 font-semibold rounded-xl border border-gray-200 dark:border-slate-700 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="1" width="8" height="3" rx="1"/><path d="M3 3h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M5 8h6M5 11h4"/></svg>
              Colar DBML
            </button>
          </div>
          <button
            onClick={() => svxRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl border border-slate-700 hover:border-slate-500 transition-colors text-sm"
          >
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="15" height="15" className="shrink-0">
              <defs>
                <linearGradient id="landingCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor:'#00d2ff',stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'#3a7bd5',stopOpacity:1}} />
                </linearGradient>
              </defs>
              <g stroke="url(#landingCyanGrad)" strokeWidth="1.5" fill="none">
                <path d="M50 15 L80 32.5 L80 67.5 L50 85 L20 67.5 L20 32.5 Z" />
                <line x1="50" y1="15" x2="50" y2="35" /><line x1="80" y1="32.5" x2="62" y2="40" />
                <line x1="80" y1="67.5" x2="62" y2="60" /><line x1="50" y1="85" x2="50" y2="65" />
                <line x1="20" y1="67.5" x2="38" y2="60" /><line x1="20" y1="32.5" x2="38" y2="40" />
              </g>
              <g stroke="url(#landingCyanGrad)" strokeWidth="1.5" fill="none">
                <ellipse cx="50" cy="40" rx="12" ry="5" />
                <line x1="38" y1="40" x2="38" y2="60" /><line x1="62" y1="40" x2="62" y2="60" />
                <path d="M38 60 Q50 65 62 60" /><path d="M38 47 Q50 52 62 47" /><path d="M38 54 Q50 59 62 54" />
              </g>
              <g fill="white" stroke="url(#landingCyanGrad)" strokeWidth="1.5">
                <circle cx="50" cy="15" r="3" /><circle cx="80" cy="32.5" r="3" /><circle cx="80" cy="67.5" r="3" />
                <circle cx="50" cy="85" r="3" /><circle cx="20" cy="67.5" r="3" /><circle cx="20" cy="32.5" r="3" />
              </g>
            </svg>
            Abrir arquivo .svx
          </button>
        </div>
      )}

      {mode === 'paste' && (
        <div className="w-full max-w-2xl">
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
            className="w-full h-64 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-200 text-sm font-mono rounded-xl p-4 border border-gray-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => onParse(text)}
              disabled={!text.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors"
            >
              Carregar
            </button>
            <button
              onClick={() => { setMode('idle'); setText('') }}
              className="px-5 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <p className="mt-8 text-gray-400 dark:text-slate-600 text-sm">Arraste um arquivo .dbml para qualquer lugar da tela</p>

      <input
        ref={fileRef}
        type="file"
        accept=".dbml"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <input
        ref={svxRef}
        type="file"
        accept=".svx"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = ev => onImportSvx(ev.target?.result as string)
          reader.readAsText(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
