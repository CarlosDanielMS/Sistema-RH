import { useState } from 'react'
import { Save, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function Configuracoes() {
  const { user } = useAuth()
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:8000')
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')

  const [nome, setNome] = useState(user?.name || '')
  const [cargo, setCargo] = useState(user?.role || 'Recrutador(a)')
  const [empresa, setEmpresa] = useState('')
  const [saved, setSaved] = useState(false)

  async function testarConexao() {
    setConnectionStatus('checking')
    try {
      const r = await fetch(`${apiUrl}/health`)
      setConnectionStatus(r.ok ? 'ok' : 'error')
    } catch {
      setConnectionStatus('error')
    }
  }

  function salvarPerfil() {
    const updated = { name: nome, email: user?.email || '', role: cargo }
    localStorage.setItem('rh_user', JSON.stringify(updated))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Preferências da plataforma</p>
      </div>

      {/* Conexão backend */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-800">Conexão com Backend</h3>
        <div>
          <label className="label">URL da API</label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
            />
            <button
              onClick={testarConexao}
              className="btn-secondary whitespace-nowrap"
              disabled={connectionStatus === 'checking'}
            >
              {connectionStatus === 'checking'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : 'Testar'}
            </button>
          </div>
          {connectionStatus === 'ok' && (
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
              <CheckCircle className="w-3.5 h-3.5" /> Backend conectado com sucesso
            </p>
          )}
          {connectionStatus === 'error' && (
            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
              <XCircle className="w-3.5 h-3.5" /> Sem conexão com o backend — verifique se o Docker está rodando
            </p>
          )}
        </div>

        <div>
          <label className="label">Modelo de IA</label>
          <select className="input">
            <option>llama-3.3-70b-versatile (Groq)</option>
            <option>llama-3.1-8b-instant (Groq)</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">Configurado via variável GROQ_MODEL no backend (.env)</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Score mínimo — Aprovação</label>
            <input type="number" className="input" defaultValue={80} min={50} max={100} />
          </div>
          <div>
            <label className="label">Score mínimo — Pendente</label>
            <input type="number" className="input" defaultValue={50} min={0} max={79} />
          </div>
          <p className="col-span-2 text-xs text-slate-400">Configurado via SCORE_APROVADO e SCORE_PENDENTE no .env do backend</p>
        </div>
      </div>

      {/* Perfil */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-slate-800">Perfil do Usuário</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nome</label>
            <input
              className="input"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          <div>
            <label className="label">Cargo</label>
            <input
              className="input"
              value={cargo}
              onChange={e => setCargo(e.target.value)}
              placeholder="Ex: Recrutador Sênior"
            />
          </div>
          <div>
            <label className="label">Empresa</label>
            <input
              className="input"
              value={empresa}
              onChange={e => setEmpresa(e.target.value)}
              placeholder="Nome da empresa"
            />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" value={user?.email || ''} disabled />
          </div>
        </div>
      </div>

      {/* SMTP info */}
      <div className="card space-y-2 bg-slate-50 border-slate-200">
        <h3 className="font-semibold text-slate-700 text-sm">E-mail automático (SMTP)</h3>
        <p className="text-xs text-slate-500">
          Configure as variáveis <code className="bg-slate-200 px-1 rounded">SMTP_HOST</code>, <code className="bg-slate-200 px-1 rounded">SMTP_USER</code> e <code className="bg-slate-200 px-1 rounded">SMTP_PASSWORD</code> no arquivo <strong>.env</strong> do projeto e reinicie o backend com <code className="bg-slate-200 px-1 rounded">docker compose restart backend</code>.
        </p>
        <p className="text-xs text-slate-400">Para Gmail: use uma Senha de App em myaccount.google.com/apppasswords</p>
      </div>

      <button
        onClick={salvarPerfil}
        className="btn-primary flex items-center gap-2"
      >
        {saved
          ? <><CheckCircle className="w-4 h-4" /> Salvo!</>
          : <><Save className="w-4 h-4" /> Salvar Configurações</>}
      </button>
    </div>
  )
}
