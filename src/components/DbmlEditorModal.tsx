import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'

type Props = {
  content: string
  darkMode: boolean
  onApply: (content: string) => void
  onClose: () => void
}

export default function DbmlEditorModal({ content, darkMode, onApply, onClose }: Props) {
  const [value, setValue] = useState(content)

  // Sync if the parent content changes while modal is closed then reopened
  useEffect(() => { setValue(content) }, [content])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onApply(value) }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
    >
      <div
        className={`flex flex-col rounded-xl shadow-2xl overflow-hidden ${
          darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-gray-200'
        }`}
        style={{ width: '82vw', height: '84vh' }}
      >
        {/* Titlebar */}
        <div
          className={`flex items-center gap-3 px-4 py-2.5 border-b shrink-0 ${
            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
          }`}
        >
          {/* VSCode-style coloured dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span
            className={`text-sm font-semibold flex-1 ${
              darkMode ? 'text-slate-200' : 'text-gray-800'
            }`}
          >
            Editar DBML
          </span>
          <span
            className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-gray-400'} hidden sm:block`}
          >
            Ctrl+Enter para aplicar &nbsp;·&nbsp; Esc para fechar
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              Cancelar
            </button>
            <button
              onClick={() => onApply(value)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language="sql"
            value={value}
            theme={darkMode ? 'vs-dark' : 'vs'}
            onChange={v => setValue(v ?? '')}
            loading={
              <div
                className={`flex items-center justify-center h-full text-sm ${
                  darkMode ? 'text-slate-400 bg-[#1e1e1e]' : 'text-gray-500 bg-white'
                }`}
              >
                Carregando editor...
              </div>
            }
            options={{
              fontSize: 13,
              fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
              lineNumbers: 'on',
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              tabSize: 2,
              renderWhitespace: 'none',
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              bracketPairColorization: { enabled: true },
            }}
          />
        </div>
      </div>
    </div>
  )
}
