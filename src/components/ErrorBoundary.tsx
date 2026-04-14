import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches React render errors and shows a recovery UI instead of
 * crashing the whole app. Without this, any render error unmounts
 * the entire tree and resets all state (including `schema → null`),
 * which causes the app to jump to the LandingScreen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Render error caught:', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset)
      }
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-white z-50">
          <div className="max-w-lg w-full mx-4 p-6 bg-slate-800 rounded-xl border border-red-500/40 shadow-2xl">
            <h2 className="text-red-400 font-bold text-lg mb-2">Erro de renderização</h2>
            <p className="text-slate-300 text-sm mb-4">
              Ocorreu um erro inesperado. Clique em <strong>Tentar novamente</strong> para continuar sem perder o schema.
            </p>
            <pre className="bg-slate-900 rounded p-3 text-xs text-red-300 overflow-auto max-h-40 mb-4 whitespace-pre-wrap">
              {error.message}
            </pre>
            <button
              onClick={this.reset}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium text-sm transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
