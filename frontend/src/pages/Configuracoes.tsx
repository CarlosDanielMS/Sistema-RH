import { useState, useEffect } from 'react'
import {
  Save, CheckCircle, XCircle, Loader2, Key, User, Server,
  Building2, Brain, GitBranch, Mail, Zap, Shield, RefreshCw,
  Eye, EyeOff, Clock,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { useToast } from '../components/ui/Toast'

type Tab = 'perfil' | 'empresa' | 'ia' | 'pipeline' | 'email' | 'sistema'

interface ConfigData {
  config: Record<string, { valor: string; descricao: string }>
  smtp: { host: string | null; porta: number; usuario: string | null; tls: boolean; configurado: boolean }
  groq: { modelo: string; chave_configurada: boolean; chave_preview: string | null }
  limites: { max_cv_mb: number; upload_dir: string }
}

function TabBtn({ tab, ativo, icon: Icon, label, onClick }: {
  tab: Tab; ativo: Tab; icon: any; label: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${
        tab === ativo ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  )
}

function Campo({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {desc && <span className="text-xs text-slate-400">{desc}</span>}
      </div>
      {children}
    </div>
  )
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  )
}

export function Configuracoes() {
  const { user, isAdmin } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const [abaAtiva, setAbaAtiva] = useState<Tab>('perfil')

  // Perfil
  const [nome, setNome]   = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')

  // Senha
  const [senhaAtual, setSenhaAtual]   = useState('')
  const [senhaNova, setSenhaNova]     = useState('')
  const [senhaConf, setSenhaConf]     = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  // Config do sistema
  const [cfg, setCfg] = useState<Record<string, string>>({})

  const { data: configData, isLoading: loadingConfig } = useQuery<ConfigData>({
    queryKey: ['config-sistema'],
    queryFn: () => api.get('/config/').then(r => r.data),
  })

  useEffect(() => {
    if (configData?.config) {
      const flat: Record<string, string> = {}
      Object.entries(configData.config).forEach(([k, v]) => { flat[k] = v.valor })
      setCfg(flat)
    }
  }, [configData])

  // ── Mutations ────────────────────────────────────────────────────────────────
  const salvarPerfil = useMutation({
    mutationFn: () => api.put('/auth/me/perfil', { nome, email }),
    onSuccess: (res) => {
      if (res.data.access_token) {
        localStorage.setItem('rh_token', res.data.access_token)
        const u = JSON.parse(localStorage.getItem('rh_user') || '{}')
        localStorage.setItem('rh_user', JSON.stringify({ ...u, name: res.data.usuario.nome, email: res.data.usuario.email }))
      }
      toast.success('Perfil atualizado!')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erro ao salvar perfil'),
  })

  const alterarSenha = useMutation({
    mutationFn: () => {
      if (senhaNova !== senhaConf) throw new Error('As senhas não coincidem')
      return api.put('/auth/me/senha', { senha_atual: senhaAtual, nova_senha: senhaNova })
    },
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!')
      setSenhaAtual(''); setSenhaNova(''); setSenhaConf('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || e?.message || 'Erro'),
  })

  const salvarConfig = useMutation({
    mutationFn: (itens: { chave: string; valor: string }[]) =>
      api.put('/config/batch', itens),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config-sistema'] })
      toast.success('Configurações salvas!')
    },
    onError: () => toast.error('Erro ao salvar configurações'),
  })

  const testarSmtp = useMutation({
    mutationFn: () => api.post('/config/testar-smtp'),
    onSuccess: (res) => toast.success(res.data.mensagem),
    onError: (e: any) => {
      const d = e?.response?.data?.detail || ''
      toast.error(d.includes('535') ? 'Credenciais inválidas (535). Verifique a Senha de App.' : d || 'Falha no SMTP')
    },
  })

  function salvarSecao(chaves: string[]) {
    const itens = chaves.map(k => ({ chave: k, valor: cfg[k] || '' }))
    salvarConfig.mutate(itens)
  }

  const smtp = configData?.smtp
  const groq = configData?.groq

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Gerencie perfil, empresa, IA e integrações do sistema</p>
      </div>

      <div className="flex gap-6">
        {/* Menu lateral */}
        <aside className="w-48 flex-shrink-0 space-y-1">
          <TabBtn tab="perfil"    ativo={abaAtiva} icon={User}      label="Meu Perfil"    onClick={() => setAbaAtiva('perfil')} />
          <TabBtn tab="empresa"   ativo={abaAtiva} icon={Building2} label="Empresa"        onClick={() => setAbaAtiva('empresa')} />
          <TabBtn tab="ia"        ativo={abaAtiva} icon={Brain}     label="IA & Triagem"  onClick={() => setAbaAtiva('ia')} />
          <TabBtn tab="pipeline"  ativo={abaAtiva} icon={GitBranch} label="Fluxo / SLA" onClick={() => setAbaAtiva('pipeline')} />
          <TabBtn tab="email"     ativo={abaAtiva} icon={Mail}      label="E-mail / SMTP"  onClick={() => setAbaAtiva('email')} />
          {isAdmin && <TabBtn tab="sistema" ativo={abaAtiva} icon={Server} label="Sistema" onClick={() => setAbaAtiva('sistema')} />}
        </aside>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* ── PERFIL ─────────────────────────────────────────────────────── */}
          {abaAtiva === 'perfil' && (
            <>
              <div className="card space-y-5">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-500" /> Dados Pessoais
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <Campo label="Nome completo">
                    <input className="input" value={nome} onChange={e => setNome(e.target.value)} />
                  </Campo>
                  <Campo label="E-mail">
                    <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                  </Campo>
                  <Campo label="Perfil">
                    <input className="input bg-slate-50 cursor-not-allowed" value={user?.role === 'admin' ? 'Administrador' : 'Recrutador'} disabled />
                  </Campo>
                  <Campo label="ID da conta">
                    <input className="input bg-slate-50 cursor-not-allowed" value={`#${user?.id}`} disabled />
                  </Campo>
                </div>
                <button onClick={() => salvarPerfil.mutate()} disabled={salvarPerfil.isPending || !nome.trim()} className="btn-primary flex items-center gap-2">
                  {salvarPerfil.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar Perfil</>}
                </button>
              </div>

              <div className="card space-y-4">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500" /> Alterar Senha
                </h2>
                <Campo label="Senha atual">
                  <div className="relative">
                    <input type={mostrarSenha ? 'text' : 'password'} className="input pr-10" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} placeholder="••••••••" />
                    <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Campo>
                <div className="grid grid-cols-2 gap-4">
                  <Campo label="Nova senha">
                    <input type="password" className="input" value={senhaNova} onChange={e => setSenhaNova(e.target.value)} placeholder="Mínimo 6 caracteres" />
                  </Campo>
                  <Campo label="Confirmar senha">
                    <input type="password" className="input" value={senhaConf} onChange={e => setSenhaConf(e.target.value)} placeholder="Repita a senha" />
                  </Campo>
                </div>
                {senhaNova && senhaConf && senhaNova !== senhaConf && (
                  <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> As senhas não coincidem</p>
                )}
                <button onClick={() => alterarSenha.mutate()} disabled={alterarSenha.isPending || !senhaAtual || !senhaNova || senhaNova !== senhaConf} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
                  {alterarSenha.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Alterando...</> : <><Shield className="w-4 h-4" /> Alterar Senha</>}
                </button>
              </div>
            </>
          )}

          {/* ── EMPRESA ────────────────────────────────────────────────────── */}
          {abaAtiva === 'empresa' && (
            <div className="card space-y-5">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-500" /> Identidade da Empresa
              </h2>
              <p className="text-xs text-slate-500">Estas informações aparecem nos e-mails enviados aos candidatos.</p>
              {loadingConfig ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Campo label="Nome da empresa" desc="Aparece em todos os e-mails">
                      <input className="input" value={cfg.empresa_nome || ''} onChange={e => setCfg({...cfg, empresa_nome: e.target.value})} placeholder="Ex: Acme Corp" />
                    </Campo>
                    <Campo label="Site" desc="Opcional">
                      <input className="input" value={cfg.empresa_site || ''} onChange={e => setCfg({...cfg, empresa_site: e.target.value})} placeholder="https://empresa.com.br" />
                    </Campo>
                  </div>
                  <Campo label="URL do Logo" desc="Link público para imagem (opcional)">
                    <input className="input" value={cfg.empresa_logo || ''} onChange={e => setCfg({...cfg, empresa_logo: e.target.value})} placeholder="https://empresa.com/logo.png" />
                    {cfg.empresa_logo && <img src={cfg.empresa_logo} alt="Logo preview" className="mt-2 h-10 object-contain rounded" onError={e => (e.currentTarget.style.display = 'none')} />}
                  </Campo>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                    <strong>Preview de assinatura de e-mail:</strong><br />
                    Equipe de RH — <strong>{cfg.empresa_nome || 'Empresa'}</strong>
                    {cfg.empresa_site && <> · <a href={cfg.empresa_site} className="underline">{cfg.empresa_site}</a></>}
                  </div>
                  <button onClick={() => salvarSecao(['empresa_nome', 'empresa_site', 'empresa_logo'])} disabled={salvarConfig.isPending} className="btn-primary flex items-center gap-2">
                    {salvarConfig.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar</>}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── IA & TRIAGEM ───────────────────────────────────────────────── */}
          {abaAtiva === 'ia' && (
            <div className="space-y-5">
              <div className="card space-y-5">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-500" /> Thresholds de Triagem
                </h2>
                <p className="text-xs text-slate-500">Define quando a IA classifica um candidato como aprovado, em análise ou reprovado.</p>
                {loadingConfig ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <div className="space-y-4">
                      <Campo label="Score mínimo — Aprovado" desc="0–100">
                        <input type="range" min="51" max="100" value={cfg.score_aprovado || '80'}
                          onChange={e => setCfg({...cfg, score_aprovado: e.target.value})} className="w-full" />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>51</span>
                          <span className="font-bold text-emerald-600">{cfg.score_aprovado || '80'}</span>
                          <span>100</span>
                        </div>
                      </Campo>
                      <Campo label="Score mínimo — Análise Humana" desc="0–100">
                        <input type="range" min="1" max="79" value={cfg.score_pendente || '50'}
                          onChange={e => setCfg({...cfg, score_pendente: e.target.value})} className="w-full" />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>1</span>
                          <span className="font-bold text-amber-500">{cfg.score_pendente || '50'}</span>
                          <span>79</span>
                        </div>
                      </Campo>
                    </div>

                    {/* Visualização das faixas */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                      <p className="font-medium text-slate-700">Faixas de classificação:</p>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded-lg text-center">
                          <p className="font-bold">Reprovado</p>
                          <p>0 – {Number(cfg.score_pendente || 50) - 1}</p>
                        </div>
                        <div className="flex-1 bg-amber-100 text-amber-700 px-3 py-2 rounded-lg text-center">
                          <p className="font-bold">Análise Humana</p>
                          <p>{cfg.score_pendente || 50} – {Number(cfg.score_aprovado || 80) - 1}</p>
                        </div>
                        <div className="flex-1 bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg text-center">
                          <p className="font-bold">Aprovado</p>
                          <p>{cfg.score_aprovado || 80} – 100</p>
                        </div>
                      </div>
                    </div>

                    <button onClick={() => salvarSecao(['score_aprovado', 'score_pendente'])} disabled={salvarConfig.isPending} className="btn-primary flex items-center gap-2">
                      {salvarConfig.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar Thresholds</>}
                    </button>
                  </>
                )}
              </div>

              <div className="card space-y-3">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Inteligência Artificial
                </h2>
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Motor de análise de currículos</p>
                    <p className="text-xs text-slate-500 mt-0.5">Análise de aderência candidato/vaga</p>
                  </div>
                  <StatusBadge ok={!!groq?.chave_configurada} label={groq?.chave_configurada ? 'Ativa' : 'Inativa'} />
                </div>
                <p className="text-xs text-slate-400">Para reconfigurar a IA, entre em contato com o administrador do sistema.</p>
              </div>
            </div>
          )}

          {/* ── PIPELINE / SLA ─────────────────────────────────────────────── */}
          {abaAtiva === 'pipeline' && (
            <div className="card space-y-5">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-primary-500" /> SLA por Etapa
              </h2>
              <p className="text-xs text-slate-500">Define quantos dias um candidato pode ficar em cada etapa antes de acionar o alerta visual (borda vermelha no Fluxo).</p>
              {loadingConfig ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { chave: 'sla_triado',     label: 'Triado',          icon: '🔵' },
                      { chave: 'sla_entrevista', label: 'Entrevistas',      icon: '📅' },
                      { chave: 'sla_teste',      label: 'Teste Prático',    icon: '📝' },
                      { chave: 'sla_oferta',     label: 'Oferta',           icon: '🎁' },
                    ].map(({ chave, label, icon }) => (
                      <Campo key={chave} label={`${icon} ${label}`} desc="dias">
                        <div className="flex items-center gap-2">
                          <input type="number" min="1" max="30" className="input w-20"
                            value={cfg[chave] || '7'}
                            onChange={e => setCfg({...cfg, [chave]: e.target.value})} />
                          <span className="text-sm text-slate-500">dias</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${Math.min(Number(cfg[chave] || 7) / 30 * 100, 100)}%` }} />
                          </div>
                        </div>
                      </Campo>
                    ))}
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    Candidatos que ultrapassam metade do SLA ficam com borda âmbar; ao ultrapassar o limite total ficam com borda vermelha e ícone ⚠️.
                  </div>

                  <Campo label="Tamanho máximo de CV" desc="MB">
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" max="50" className="input w-20"
                        value={cfg.max_cv_mb || '10'}
                        onChange={e => setCfg({...cfg, max_cv_mb: e.target.value})} />
                      <span className="text-sm text-slate-500">MB</span>
                    </div>
                  </Campo>

                  <button onClick={() => salvarSecao(['sla_triado','sla_entrevista','sla_teste','sla_oferta','max_cv_mb'])} disabled={salvarConfig.isPending} className="btn-primary flex items-center gap-2">
                    {salvarConfig.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar SLA</>}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── E-MAIL / SMTP ──────────────────────────────────────────────── */}
          {abaAtiva === 'email' && (
            <div className="space-y-5">
              <div className="card space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-500" /> Configuração SMTP
                  </h2>
                  <StatusBadge ok={!!smtp?.configurado} label={smtp?.configurado ? 'Configurado' : 'Não configurado'} />
                </div>

                {smtp ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Servidor</p>
                        <p className="text-sm font-medium text-slate-800">{smtp.host || '—'}</p>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="text-xs text-slate-400 mb-1">Porta</p>
                        <p className="text-sm font-medium text-slate-800">{smtp.porta} {smtp.tls ? '(TLS)' : ''}</p>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg col-span-2">
                        <p className="text-xs text-slate-400 mb-1">Usuário / Remetente</p>
                        <p className="text-sm font-medium text-slate-800">{smtp.usuario || '—'}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
                      <p className="font-semibold">Para atualizar as credenciais SMTP:</p>
                      <p>1. Edite o arquivo <code className="bg-blue-100 px-1 rounded">.env</code> na raiz do projeto</p>
                      <p>2. Atualize <code className="bg-blue-100 px-1 rounded">SMTP_HOST</code>, <code className="bg-blue-100 px-1 rounded">SMTP_USER</code> e <code className="bg-blue-100 px-1 rounded">SMTP_PASSWORD</code></p>
                      <p>3. Para Gmail: gere uma Senha de App em <strong>myaccount.google.com → Segurança → Senhas de app</strong></p>
                      <p>4. Execute: <code className="bg-blue-100 px-1 rounded">docker restart rh_ia_backend</code></p>
                    </div>

                    <button onClick={() => testarSmtp.mutate()} disabled={testarSmtp.isPending || !smtp.configurado} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
                      {testarSmtp.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Mail className="w-4 h-4" /> Enviar E-mail de Teste</>}
                    </button>
                  </div>
                ) : <Loader2 className="w-5 h-5 animate-spin text-slate-400" />}
              </div>

              <div className="card space-y-3">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-slate-500" /> Templates de E-mail
                </h2>
                <p className="text-xs text-slate-500">Configure os textos enviados automaticamente a cada etapa do pipeline.</p>
                <a href="/marketing" className="btn-secondary flex items-center gap-2 text-sm w-fit">
                  <Mail className="w-4 h-4" /> Ir para Marketing & Notificações →
                </a>
              </div>
            </div>
          )}

          {/* ── SISTEMA ────────────────────────────────────────────────────── */}
          {abaAtiva === 'sistema' && (
            <div className="space-y-5">
              <div className="card space-y-4">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-500" /> Status dos Serviços
                </h2>
                {loadingConfig ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <div className="space-y-2">
                    {[
                      { label: 'Backend API', ok: true, detail: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}` },
                      { label: 'Análise de IA',   ok: !!groq?.chave_configurada, detail: groq?.chave_configurada ? 'Motor ativo' : 'Não configurado' },
                      { label: 'SMTP (E-mail)',   ok: !!smtp?.configurado,        detail: smtp?.usuario },
                    ].map(({ label, ok, detail }) => (
                      <div key={label} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{label}</p>
                          {detail && <p className="text-xs text-slate-400">{detail}</p>}
                        </div>
                        <StatusBadge ok={ok} label={ok ? 'Online' : 'Offline'} />
                      </div>
                    ))}
                  </div>
                )}
                <a href="/admin/logs" className="btn-secondary flex items-center gap-2 text-sm w-fit">
                  <Server className="w-4 h-4" /> Monitor de Logs →
                </a>
              </div>

              <div className="card space-y-3">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-500" /> Armazenamento
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Diretório de CVs</p>
                    <p className="font-mono text-xs text-slate-700 break-all">{configData?.limites.upload_dir}</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">Limite por arquivo</p>
                    <p className="text-lg font-bold text-slate-800">{cfg.max_cv_mb || configData?.limites.max_cv_mb} MB</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">Para alterar o limite de upload, vá em <strong>Fluxo / SLA</strong>.</p>
              </div>

              <div className="card bg-slate-50 border-slate-200 space-y-3">
                <h2 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Variáveis de ambiente (.env)
                </h2>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['GROQ_API_KEY', 'Chave da IA Groq'],
                    ['GROQ_MODEL',   'Modelo de IA'],
                    ['SMTP_HOST',    'Servidor de e-mail'],
                    ['SMTP_USER',    'Remetente dos e-mails'],
                    ['N8N_WEBHOOK_URL', 'URL base do n8n'],
                    ['API_URL',      'URL pública da API'],
                  ].map(([var_, desc]) => (
                    <div key={var_} className="p-2 bg-white border border-slate-200 rounded">
                      <p className="font-mono font-medium text-slate-700">{var_}</p>
                      <p className="text-slate-400">{desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400">Arquivo: <code className="bg-slate-200 px-1 rounded">.env</code> na raiz do projeto. Reinicie com <code className="bg-slate-200 px-1 rounded">docker restart rh_ia_backend</code> após editar.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
