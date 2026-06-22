import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Brain, Mail, Lock, Loader2, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const QUICK_ACCESS = [
  { label: 'Admin',   email: 'admin@rh.com', senha: 'admin123', icon: ShieldCheck, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { label: 'Usuário', email: 'user@rh.com',  senha: 'user123',  icon: User,        color: 'text-blue-600 bg-blue-50 border-blue-200' },
]

export function Login() {
  const { login, isAuthenticated } = useAuth()
  const nav = useNavigate()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await login(email, password)
      nav('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'E-mail ou senha inválidos.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function quickLogin(e: string, s: string) {
    setEmail(e); setPassword(s)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4 shadow-lg">
            <Brain className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">RH-IA Platform</h1>
          <p className="text-slate-400 mt-1.5 text-sm">Recrutamento inteligente com IA</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Entrar na plataforma</h2>
            <p className="text-slate-500 text-sm">Use as credenciais da sua conta</p>
          </div>

          {/* Acesso rápido */}
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACCESS.map(({ label, email: e, senha, icon: Icon, color }) => (
              <button
                key={label}
                type="button"
                onClick={() => quickLogin(e, senha)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors hover:opacity-90 ${color}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <div className="text-left">
                  <p className="font-semibold">{label}</p>
                  <p className="opacity-70 font-mono">{e}</p>
                </div>
              </button>
            ))}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email" className="input pl-9" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required
                />
              </div>
            </div>
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password" className="input pl-9" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
