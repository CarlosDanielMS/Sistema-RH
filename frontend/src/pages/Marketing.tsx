import { useState } from 'react'
import {
  Mail, MessageSquare, Settings, Send, CheckCircle, XCircle,
  Bell, Save, Calendar, Loader2, AlertTriangle, Eye, Zap,
  ToggleLeft, ToggleRight, RefreshCw,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Modal } from '../components/ui/Modal'
import api from '../services/api'
import { LABEL_ETAPA } from '../utils/helpers'
import type { EtapaPipeline } from '../types'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Template {
  id: number; etapa: string; assunto_email: string; corpo_email: string
  ativo: boolean; canal_email: boolean; canal_whatsapp: boolean; atualizado_em: string
}
interface Notificacao {
  id: number; candidato_id: number; vaga_id: number; etapa: string
  canal: string; destinatario: string; assunto?: string; mensagem: string
  status: string; erro?: string; enviado_em: string
}
interface SmtpStatus {
  configurado: boolean; host: string | null; porta: number
  usuario: string | null; tls: boolean; empresa: string
}
interface Stats {
  total_enviados: number; sucesso: number; falhas: number
  taxa_sucesso: number; por_etapa: Record<string, number>
  por_canal: Record<string, number>; entrevistas_agendadas: number
}

interface TemplateForm {
  assunto_email: string; corpo_email: string
  canal_email: boolean; canal_whatsapp: boolean; ativo: boolean
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export function Marketing() {
  const qc = useQueryClient()
  const [tab, setTab]                     = useState<'templates' | 'historico'>('templates')
  const [editandoEtapa, setEditandoEtapa] = useState<string | null>(null)
  const [smtpMsg, setSmtpMsg]             = useState<{ ok: boolean; texto: string } | null>(null)
  const [previewData, setPreviewData]     = useState<{ assunto: string; corpo: string } | null>(null)
  const [previewOpen, setPreviewOpen]     = useState(false)

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: templates = [], isLoading: loadingTemplates } = useQuery<Template[]>({
    queryKey: ['marketing-templates'],
    queryFn: () => api.get('/marketing/templates').then(r => r.data),
  })

  const { data: notifs = [], isLoading: loadingNotifs } = useQuery<Notificacao[]>({
    queryKey: ['marketing-notifs'],
    queryFn: () => api.get('/marketing/notificacoes?limit=100').then(r => r.data),
    enabled: tab === 'historico',
  })

  const { data: stats } = useQuery<Stats>({
    queryKey: ['marketing-stats'],
    queryFn: () => api.get('/marketing/stats').then(r => r.data),
  })

  const { data: smtp } = useQuery<SmtpStatus>({
    queryKey: ['smtp-status'],
    queryFn: () => api.get('/marketing/smtp-status').then(r => r.data),
  })

  const templateEditando = templates.find(t => t.etapa === editandoEtapa)

  const { register, handleSubmit, reset } = useForm<TemplateForm>()

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const salvarTemplate = useMutation({
    mutationFn: (data: TemplateForm) =>
      api.put(`/marketing/templates/${editandoEtapa}`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-templates'] })
      setEditandoEtapa(null)
    },
  })

  const toggleAtivo = useMutation({
    mutationFn: ({ etapa, ativo }: { etapa: string; ativo: boolean }) =>
      api.put(`/marketing/templates/${etapa}`, { ativo }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-templates'] }),
  })

  const testarSmtp = useMutation({
    mutationFn: () => api.post('/marketing/testar-smtp').then(r => r.data),
    onSuccess: (res) => setSmtpMsg({ ok: true, texto: res.mensagem }),
    onError: (e: any) => {
      const detalhe = e?.response?.data?.detail || ''
      let msg = detalhe
      if (detalhe.includes('BadCredentials') || detalhe.includes('535')) {
        msg = 'Credenciais inválidas (535 BadCredentials). A Senha de App do Gmail expirou ou foi revogada. Gere uma nova em: Conta Google → Segurança → Verificação em duas etapas → Senhas de app. Cole no .env sem espaços e reinicie: docker restart rh_ia_backend'
      } else if (detalhe.includes('Connection refused') || detalhe.includes('ECONNREFUSED')) {
        msg = 'Conexão recusada. Verifique se SMTP_HOST e SMTP_PORT estão corretos no .env.'
      } else if (detalhe.includes('534') || detalhe.includes('5.7.9')) {
        msg = 'Gmail exige Verificação em 2 Etapas para usar Senhas de App. Ative em: Conta Google → Segurança.'
      }
      setSmtpMsg({ ok: false, texto: msg || 'Falha no envio de teste.' })
    },
  })

  // ── Funções ──────────────────────────────────────────────────────────────────
  function abrirEditar(etapa: string) {
    const t = templates.find(t => t.etapa === etapa)
    if (t) reset({ assunto_email: t.assunto_email, corpo_email: t.corpo_email, canal_email: t.canal_email, canal_whatsapp: t.canal_whatsapp, ativo: t.ativo })
    setEditandoEtapa(etapa)
  }

  async function verPrevia(etapa: string) {
    const t = templates.find(t => t.etapa === etapa)
    if (!t) return
    setPreviewData({ assunto: t.assunto_email, corpo: t.corpo_email })
    setPreviewOpen(true)
  }

  const taxaSucesso = stats ? `${stats.taxa_sucesso}%` : '—'
  const totalEnviados = stats?.total_enviados ?? '—'
  const sucesso = stats?.sucesso ?? '—'
  const falhas = stats?.falhas ?? '—'

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Marketing & Notificações</h1>
          <p className="page-subtitle">Mensagens automáticas enviadas aos candidatos a cada mudança de etapa</p>
        </div>
        <div className="flex items-center gap-2">
          {smtp?.configurado ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-emerald-700">SMTP ativo — {smtp.usuario}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-medium text-red-700">SMTP não configurado</span>
            </div>
          )}
          <button
            onClick={() => { setSmtpMsg(null); testarSmtp.mutate() }}
            disabled={testarSmtp.isPending || !smtp?.configurado}
            className="btn-secondary text-sm flex items-center gap-1.5 disabled:opacity-50"
            title="Envia um e-mail de teste para o endereço configurado"
          >
            {testarSmtp.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Testar SMTP
          </button>
        </div>
      </div>

      {/* Resultado do teste SMTP */}
      {smtpMsg && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${smtpMsg.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          {smtpMsg.ok
            ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
          <p className={`text-sm ${smtpMsg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{smtpMsg.texto}</p>
          <button onClick={() => setSmtpMsg(null)} className="ml-auto text-slate-400 hover:text-slate-600"><XCircle className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* SMTP não configurado — instrução */}
      {smtp && !smtp.configurado && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">Configure o SMTP para ativar envio de e-mails</p>
            <p className="text-xs">Edite o arquivo <code className="bg-amber-100 px-1 rounded">.env</code> na raiz do projeto e defina:</p>
            <pre className="mt-2 text-xs bg-amber-100 p-2 rounded-lg font-mono">
{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu@email.com
SMTP_PASSWORD=sua_senha_de_app
SMTP_TLS=true`}
            </pre>
            <p className="text-xs mt-2">Para Gmail: ative a autenticação de 2 fatores e crie uma <strong>Senha de app</strong> em <em>Conta Google → Segurança</em>.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Send}        label="Total Enviados"  value={totalEnviados}  color="bg-blue-50 text-blue-600" />
        <StatCard icon={CheckCircle} label="Entregues"       value={sucesso}         color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={XCircle}     label="Falhas"          value={falhas}          color="bg-red-50 text-red-500" />
        <StatCard icon={Mail}        label="Taxa de Sucesso" value={taxaSucesso}     color="bg-violet-50 text-violet-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'templates', label: 'Templates',  icon: Settings },
          { key: 'historico', label: 'Histórico',  icon: Bell },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Aba Templates ── */}
      {tab === 'templates' && (
        <div className="space-y-3">
          <div className="card bg-blue-50 border-blue-200 text-sm text-blue-700">
            <strong>Como funciona:</strong> Quando um candidato muda de etapa no Fluxo, o sistema envia automaticamente o e-mail do template correspondente (se estiver ativo).
            Variáveis: <code className="bg-blue-100 px-1 rounded">$nome</code> <code className="bg-blue-100 px-1 rounded">$vaga</code> <code className="bg-blue-100 px-1 rounded">$empresa</code> <code className="bg-blue-100 px-1 rounded">$data_entrevista</code> <code className="bg-blue-100 px-1 rounded">$link_entrevista</code>
          </div>

          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Carregando templates...
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map(t => (
                <div key={t.etapa} className={`card flex items-center justify-between gap-4 ${t.ativo ? '' : 'opacity-60'}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Toggle ativo */}
                    <button
                      onClick={() => toggleAtivo.mutate({ etapa: t.etapa, ativo: !t.ativo })}
                      disabled={toggleAtivo.isPending}
                      className="flex-shrink-0"
                      title={t.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {t.ativo
                        ? <ToggleRight className="w-8 h-8 text-primary-500" />
                        : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                    </button>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm">
                        {LABEL_ETAPA[t.etapa as EtapaPipeline] ?? t.etapa}
                        {!t.ativo && <span className="ml-2 text-xs text-slate-400">(inativo)</span>}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{t.assunto_email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {t.canal_email    && <span className="badge bg-blue-100 text-blue-700 flex items-center gap-1"><Mail className="w-3 h-3" /> E-mail</span>}
                    {t.canal_whatsapp && <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> WhatsApp</span>}
                    <button onClick={() => verPrevia(t.etapa)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors" title="Visualizar template">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => abrirEditar(t.etapa)} className="btn-secondary py-1 px-2.5 text-xs">
                      <Settings className="w-3.5 h-3.5" /> Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Aba Histórico ── */}
      {tab === 'historico' && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-700">Histórico de Envios</p>
            <button onClick={() => qc.invalidateQueries({ queryKey: ['marketing-notifs'] })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {loadingNotifs ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Carregando histórico...
            </div>
          ) : notifs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum envio registrado ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Candidato', 'Etapa', 'Canal', 'Destinatário', 'Status', 'Erro', 'Enviado em'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {notifs.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 text-xs">#{n.candidato_id}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{LABEL_ETAPA[n.etapa as EtapaPipeline] ?? n.etapa}</td>
                      <td className="px-4 py-3">
                        {n.canal === 'email'
                          ? <span className="badge bg-blue-100 text-blue-700 flex items-center gap-1 w-fit"><Mail className="w-3 h-3" /> E-mail</span>
                          : <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit"><MessageSquare className="w-3 h-3" /> WhatsApp</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[160px]">{n.destinatario}</td>
                      <td className="px-4 py-3">
                        {n.status === 'enviado'
                          ? <span className="badge bg-emerald-100 text-emerald-700 flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" /> Enviado</span>
                          : <span className="badge bg-red-100 text-red-600 flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> Falhou</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-red-500 max-w-[200px] truncate" title={n.erro ?? ''}>{n.erro ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(n.enviado_em).toLocaleString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Visualizar Template */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Prévia do Template" size="lg">
        {previewData && (
          <div className="space-y-4">
            <div>
              <p className="label">Assunto</p>
              <p className="text-sm font-medium text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">{previewData.assunto}</p>
            </div>
            <div>
              <p className="label">Corpo</p>
              <pre className="text-sm text-slate-700 bg-slate-50 px-3 py-3 rounded-lg font-sans whitespace-pre-wrap leading-relaxed">{previewData.corpo}</pre>
            </div>
            <p className="text-xs text-slate-400">As variáveis como $nome, $vaga, $empresa serão substituídas pelos dados reais ao enviar.</p>
          </div>
        )}
      </Modal>

      {/* Modal: Editar Template */}
      <Modal
        open={!!editandoEtapa}
        onClose={() => setEditandoEtapa(null)}
        title={`Editar Template — ${editandoEtapa ? (LABEL_ETAPA[editandoEtapa as EtapaPipeline] ?? editandoEtapa) : ''}`}
        size="lg"
      >
        {templateEditando && (
          <form onSubmit={handleSubmit(d => salvarTemplate.mutate(d))} className="space-y-4">
            <div>
              <label className="label">Assunto do E-mail</label>
              <input className="input" {...register('assunto_email')} />
            </div>
            <div>
              <label className="label">Corpo da Mensagem</label>
              <p className="text-xs text-slate-400 mb-1">Variáveis: $nome $vaga $empresa $data_entrevista $link_entrevista $responsavel $email_rh</p>
              <textarea className="input min-h-52 resize-y font-mono text-xs" {...register('corpo_email')} />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register('canal_email')} className="rounded" />
                <Mail className="w-4 h-4 text-blue-500" /> E-mail
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register('canal_whatsapp')} className="rounded" />
                <MessageSquare className="w-4 h-4 text-emerald-500" /> WhatsApp
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" {...register('ativo')} className="rounded" />
                Ativo
              </label>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEditandoEtapa(null)}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={salvarTemplate.isPending}>
                {salvarTemplate.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                  : <><Save className="w-4 h-4" /> Salvar Template</>}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
