import { useState, useRef, useCallback } from 'react'

type Props = {
  onParse: (content: string, filename?: string) => void
  parseError: string | null
  onOpenEditor: () => void
}

export default function LandingScreen({ onParse, parseError, onOpenEditor }: Props) {
  const [mode, setMode] = useState<'idle' | 'paste'>('idle')
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
    </div>
  )
}
