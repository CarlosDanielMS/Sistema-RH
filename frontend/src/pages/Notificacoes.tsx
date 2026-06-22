import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, CheckCircle, XCircle, Clock, Edit3, Save,
  X, ChevronDown, ChevronUp, Zap, AlertCircle, Bell,
} from 'lucide-react'
import { notificacoesService, Template } from '../services/notificacoesService'

const ETAPA_LABELS: Record<string, string> = {
  triado: 'CV Recebido',
  entrevista_rh: 'Entrevista RH',
  entrevista_tecnica: 'Entrevista Técnica',
  teste_pratico: 'Teste Prático',
  oferta: 'Proposta Enviada',
  contratado: 'Contratado',
  reprovado: 'Reprovado',
}

const ETAPA_CORES: Record<string, string> = {
  triado: 'bg-blue-100 text-blue-700',
  entrevista_rh: 'bg-indigo-100 text-indigo-700',
  entrevista_tecnica: 'bg-purple-100 text-purple-700',
  teste_pratico: 'bg-amber-100 text-amber-700',
  oferta: 'bg-emerald-100 text-emerald-700',
  contratado: 'bg-green-100 text-green-700',
  reprovado: 'bg-red-100 text-red-700',
}

const VARIAVEIS_DISPONIVEIS = [
  { var: '$nome', desc: 'Primeiro nome do candidato' },
  { var: '$nome_completo', desc: 'Nome completo' },
  { var: '$vaga', desc: 'Título da vaga' },
  { var: '$empresa', desc: 'Nome da empresa' },
  { var: '$data_entrevista', desc: 'Data e hora da entrevista' },
  { var: '$link_entrevista', desc: 'Link ou local da entrevista' },
  { var: '$responsavel', desc: 'Responsável pelo processo' },
  { var: '$email_rh', desc: 'E-mail de contato do RH' },
]

function StatusBadge({ status }: { status: string }) {
  if (status === 'enviado') return (
    <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
      <CheckCircle className="w-3.5 h-3.5" /> Enviado
    </span>
  )
  if (status === 'falhou') return (
    <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
      <XCircle className="w-3.5 h-3.5" /> Falhou
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-amber-500 text-xs font-medium">
      <Clock className="w-3.5 h-3.5" /> Pendente
    </span>
  )
}

function TemplateCard({ template }: { template: Template }) {
  const qc = useQueryClient()
  const [expandido, setExpandido] = useState(false)
  const [editando, setEditando] = useState(false)
  const [assunto, setAssunto] = useState(template.assunto_email)
  const [corpo, setCorpo] = useState(template.corpo_email)

  const salvar = useMutation({
    mutationFn: () => notificacoesService.atualizarTemplate(template.etapa, {
      assunto_email: assunto,
      corpo_email: corpo,
      ativo: template.ativo,
      canal_email: template.canal_email,
      canal_whatsapp: template.canal_whatsapp,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      setEditando(false)
    },
  })

  const toggleAtivo = useMutation({
    mutationFn: () => notificacoesService.atualizarTemplate(template.etapa, {
      assunto_email: template.assunto_email,
      corpo_email: template.corpo_email,
      ativo: !template.ativo,
      canal_email: template.canal_email,
      canal_whatsapp: template.canal_whatsapp,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })

  const cancelar = () => {
    setAssunto(template.assunto_email)
    setCorpo(template.corpo_email)
    setEditando(false)
  }

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${template.ativo ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${ETAPA_CORES[template.etapa] ?? 'bg-slate-100 text-slate-600'}`}>
            {ETAPA_LABELS[template.etapa] ?? template.etapa}
          </span>
          {template.canal_email && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Mail className="w-3 h-3" /> E-mail
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleAtivo.mutate()}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${template.ativo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {template.ativo ? 'Ativo' : 'Inativo'}
          </button>
          <button onClick={() => { setEditando(!editando); setExpandido(true) }}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={() => setExpandido(!expandido)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {expandido && (
        <div className="px-5 pb-4 border-t border-slate-100 pt-4 space-y-3">
          {editando ? (
            <>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Assunto do e-mail</label>
                <input
                  value={assunto}
                  onChange={e => setAssunto(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Corpo do e-mail</label>
                <textarea
                  value={corpo}
                  onChange={e => setCorpo(e.target.value)}
                  rows={10}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={cancelar} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <X className="w-3.5 h-3.5" /> Cancelar
                </button>
                <button onClick={() => salvar.mutate()} disabled={salvar.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                  <Save className="w-3.5 h-3.5" />
                  {salvar.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 font-medium">Assunto: <span className="text-slate-700">{template.assunto_email}</span></p>
              <pre className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 leading-relaxed">{template.corpo_email}</pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function Notificacoes() {
  const [aba, setAba] = useState<'templates' | 'historico' | 'integracao'>('templates')

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: notificacoesService.listarTemplates,
  })

  const { data: historico = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ['historico-notificacoes'],
    queryFn: () => notificacoesService.historico(),
    enabled: aba === 'historico',
  })

  const { data: webhookStatus } = useQuery({
    queryKey: ['webhook-status'],
    queryFn: notificacoesService.statusWebhook,
    enabled: aba === 'integracao',
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notificações & E-mail</h1>
        <p className="text-slate-500 text-sm mt-0.5">Templates automáticos e histórico de envios para candidatos</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'templates', label: 'Templates de E-mail', icon: Mail },
          { id: 'historico', label: 'Histórico de Envios', icon: Bell },
          { id: 'integracao', label: 'Integração n8n', icon: Zap },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id as typeof aba)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Templates ────────────────────────────────────────────────── */}
      {aba === 'templates' && (
        <div className="space-y-4">
          {/* Variáveis disponíveis */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Variáveis disponíveis nos templates
            </p>
            <div className="flex flex-wrap gap-2">
              {VARIAVEIS_DISPONIVEIS.map(v => (
                <span key={v.var} className="font-mono text-xs bg-white border border-amber-200 rounded px-2 py-0.5 text-amber-700" title={v.desc}>
                  {v.var}
                </span>
              ))}
            </div>
          </div>

          {loadingTemplates ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(t => <TemplateCard key={t.etapa} template={t} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Histórico ────────────────────────────────────────────────── */}
      {aba === 'historico' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loadingHistorico ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : historico.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Nenhuma notificação enviada ainda.</p>
              <p className="text-slate-400 text-xs mt-1">Os envios aparecerão aqui conforme candidatos avançam no pipeline.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Data', 'Candidato ID', 'Etapa', 'Canal', 'Destinatário', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historico.map(n => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(n.enviado_em).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">#{n.candidato_id}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ETAPA_CORES[n.etapa] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ETAPA_LABELS[n.etapa] ?? n.etapa}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-slate-600">
                        <Mail className="w-3 h-3" /> {n.canal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px] truncate">{n.destinatario}</td>
                    <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Integração n8n ───────────────────────────────────────────── */}
      {aba === 'integracao' && (
        <div className="space-y-4">
          {/* Status */}
          {webhookStatus && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">SMTP (E-mail)</p>
                <div className="flex items-center gap-2">
                  {webhookStatus.smtp_configurado
                    ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                    : <XCircle className="w-5 h-5 text-red-400" />}
                  <span className="text-sm font-medium text-slate-800">
                    {webhookStatus.smtp_configurado ? 'Configurado' : 'Não configurado'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{webhookStatus.smtp_host}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">n8n Webhook</p>
                <div className="flex items-center gap-2">
                  {webhookStatus.n8n_webhook_configurado
                    ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                    : <XCircle className="w-5 h-5 text-red-400" />}
                  <span className="text-sm font-medium text-slate-800">
                    {webhookStatus.n8n_webhook_configurado ? 'Configurado' : 'Não configurado'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 truncate">{webhookStatus.n8n_webhook_url}</p>
              </div>
            </div>
          )}

          {/* Guia de configuração n8n */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-500" /> Como configurar a integração com n8n
            </h3>

            <div className="space-y-5">
              <Step num={1} title="n8n recebe e-mail do candidato (IMAP Trigger)">
                <p className="text-sm text-slate-600">
                  No n8n, adicione um node <strong>Email Trigger (IMAP)</strong> apontando para a caixa de entrada de recrutamento.
                  Quando chegar um e-mail com CV, o n8n extrai os dados e chama o sistema.
                </p>
              </Step>

              <Step num={2} title="n8n chama o sistema para criar o candidato">
                <p className="text-sm text-slate-600 mb-2">
                  Adicione um node <strong>HTTP Request</strong> com as configurações abaixo:
                </p>
                <CodeBlock>{`Method: POST
URL: http://localhost:8000/webhooks/email-candidato

Body (JSON):
{
  "nome": "{{ $json.fromName }}",
  "email": "{{ $json.from }}",
  "cv_texto": "{{ $json.text }}",
  "vaga_id": 1,
  "email_assunto": "{{ $json.subject }}"
}`}</CodeBlock>
                <p className="text-xs text-slate-400 mt-2">
                  O sistema cria o candidato, dispara a análise de IA e envia e-mail de confirmação automaticamente.
                </p>
              </Step>

              <Step num={3} title="n8n recebe eventos do pipeline (Webhook Trigger)">
                <p className="text-sm text-slate-600 mb-2">
                  Adicione um node <strong>Webhook</strong> no n8n. O sistema enviará um POST sempre que um candidato mudar de etapa:
                </p>
                <CodeBlock>{`Endpoint n8n: {N8N_WEBHOOK_URL}/pipeline-evento

Payload recebido:
{
  "evento": "mudanca_etapa",
  "candidato_id": 42,
  "candidato_nome": "João Silva",
  "candidato_email": "joao@email.com",
  "vaga_titulo": "Dev Backend Pleno",
  "etapa": "entrevista_rh",
  "data_entrevista": "25/06/2026 às 14:00",
  "link_entrevista": "https://meet.google.com/abc-xyz",
  "responsavel": "Ana Lima"
}`}</CodeBlock>
              </Step>

              <Step num={4} title="n8n envia e-mail / WhatsApp / Slack ao candidato">
                <p className="text-sm text-slate-600">
                  A partir do payload recebido, use nodes de <strong>Gmail</strong>, <strong>WhatsApp Business</strong> ou <strong>Slack</strong>
                  para enviar a comunicação personalizada. O sistema já mantém o histórico de todos os envios em <em>Histórico de Envios</em>.
                </p>
              </Step>
            </div>
          </div>

          {/* Endpoint de teste */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-600 mb-1">Endpoints disponíveis para o n8n</p>
            <div className="space-y-2">
              {[
                { method: 'POST', path: '/webhooks/email-candidato', desc: 'Receber candidato por e-mail' },
                { method: 'POST', path: '/webhooks/teste-pipeline', desc: 'Simular evento de etapa (teste)' },
                { method: 'GET', path: '/webhooks/status', desc: 'Status da integração' },
              ].map(e => (
                <div key={e.path} className="flex items-center gap-2 text-xs">
                  <span className={`px-1.5 py-0.5 rounded font-mono font-bold ${e.method === 'POST' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{e.method}</span>
                  <code className="font-mono text-slate-700">{e.path}</code>
                  <span className="text-slate-400">— {e.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Step({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {num}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-800 mb-1">{title}</p>
        {children}
      </div>
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto leading-relaxed">
      {children}
    </pre>
  )
}
