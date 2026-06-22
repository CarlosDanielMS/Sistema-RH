import { createContext, useCallback, useContext, useReducer, useRef } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info'
interface Toast { id: string; type: ToastType; message: string }
type Action =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string }

// ── Styles ─────────────────────────────────────────────────────────────────────
const STYLES: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
  success: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-800', icon: <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> },
  error:   { bg: 'bg-red-50 border-red-200 text-red-800',             icon: <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />       },
  warning: { bg: 'bg-amber-50 border-amber-200 text-amber-800',       icon: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" /> },
  info:    { bg: 'bg-blue-50 border-blue-200 text-blue-800',          icon: <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />          },
}

// ── Context ────────────────────────────────────────────────────────────────────
interface ToastContextType {
  toast:   (message: string, type?: ToastType) => void
  success: (message: string) => void
  error:   (message: string) => void
  warning: (message: string) => void
  info:    (message: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

function reducer(state: Toast[], action: Action): Toast[] {
  if (action.type === 'ADD')    return [...state, action.toast].slice(-5)
  if (action.type === 'REMOVE') return state.filter(t => t.id !== action.id)
  return state
}

// ── Provider ───────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, [])
  const counter = useRef(0)

  const add = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++counter.current}`
    dispatch({ type: 'ADD', toast: { id, type, message } })
    setTimeout(() => dispatch({ type: 'REMOVE', id }), 4000)
  }, [])

  const ctx: ToastContextType = {
    toast:   add,
    success: (m) => add(m, 'success'),
    error:   (m) => add(m, 'error'),
    warning: (m) => add(m, 'warning'),
    info:    (m) => add(m, 'info'),
  }

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Portal de toasts */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const s = STYLES[t.type]
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium max-w-sm animate-fade-in ${s.bg}`}
            >
              {s.icon}
              <span className="flex-1 leading-snug">{t.message}</span>
              <button
                onClick={() => dispatch({ type: 'REMOVE', id: t.id })}
                className="opacity-50 hover:opacity-100 transition-opacity mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
