import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User, Briefcase, Loader2, X } from 'lucide-react'
import api from '../../services/api'

interface Resultado {
  candidatos: { id: number; nome: string; email: string; etapa: string; score?: number }[]
  vagas:      { id: number; titulo: string; status: string; responsavel: string }[]
  total: number
}

export function BuscaGlobal() {
  const [aberta, setAberta]   = useState(false)
  const [query, setQuery]     = useState('')
  const [dados, setDados]     = useState<Resultado | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const nav = useNavigate()

  // Atalho Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); setAberta(a => !a)
      }
      if (e.key === 'Escape') { setAberta(false); setQuery('') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (aberta) setTimeout(() => inputRef.current?.focus(), 50)
  }, [aberta])

  useEffect(() => {
    if (query.length < 2) { setDados(null); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.get('/buscar/', { params: { q: query } })
        setDados(res.data)
      } catch { setDados(null) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  function navegar(url: string) {
    nav(url); setAberta(false); setQuery(''); setDados(null)
  }

  return (
    <>
      {/* Botão da barra lateral */}
      <button
        onClick={() => setAberta(true)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white text-sm font-medium transition-colors"
      >
        <Search className="w-4 h-4" />
        Buscar...
        <span className="ml-auto text-xs opacity-50 font-mono">⌘K</span>
      </button>

      {/* Overlay */}
      {aberta && (
        <div
          className="fixed inset-0 z-[9000] bg-black/50 flex items-start justify-center pt-20 px-4"
          onClick={e => { if (e.target === e.currentTarget) setAberta(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
              {loading ? <Loader2 className="w-5 h-5 text-slate-400 animate-spin flex-shrink-0" /> : <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />}
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 outline-none text-sm text-slate-800 placeholder:text-slate-400"
                placeholder="Buscar candidatos, vagas..."
              />
              {query && (
                <button onClick={() => { setQuery(''); setDados(null) }} className="text-slate-300 hover:text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="text-xs text-slate-300 font-mono border border-slate-200 rounded px-1.5 py-0.5">Esc</kbd>
            </div>

            {/* Resultados */}
            <div className="max-h-72 overflow-y-auto">
              {!dados && !loading && query.length < 2 && (
                <p className="text-xs text-slate-400 text-center py-8">Digite pelo menos 2 caracteres</p>
              )}
              {dados?.total === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">Nenhum resultado para "{query}"</p>
              )}

              {dados && dados.candidatos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2 bg-slate-50">Candidatos</p>
                  {dados.candidatos.map(c => (
                    <button
                      key={c.id}
                      onClick={() => navegar(`/candidatos/${c.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors"
                    >
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary-600">{c.nome.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{c.nome}</p>
                        <p className="text-xs text-slate-400 truncate">{c.email}</p>
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">{c.etapa?.replace('_', ' ')}</span>
                    </button>
                  ))}
                </div>
              )}

              {dados && dados.vagas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2 bg-slate-50">Vagas</p>
                  {dados.vagas.map(v => (
                    <button
                      key={v.id}
                      onClick={() => navegar(`/vagas/${v.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{v.titulo}</p>
                        <p className="text-xs text-slate-400">{v.responsavel}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${v.status === 'aberta' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{v.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
              <span>↑↓ navegar</span><span>↵ abrir</span><span>Esc fechar</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
