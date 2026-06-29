import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Mail, CheckCircle, XCircle, Clock, Edit3, Save,
  X, ChevronDown, ChevronUp, AlertCircle, Bell,
} from 'lucide-react'
import { notificacoesService, Template } from '../services/notificacoesService'

const ETAPA_LABELS: Record<string, string> = {
  triado:             'CV Recebido',
  entrevista_rh:      'Entrevista RH',
  entrevista_tecnica: 'Entrevista Técnica',
  teste_pratico:      'Teste Prático',
  oferta:             'Proposta Enviada',
  contratado:         'Contratado',
  reprovado:          'Reprovado',
}

const ETAPA_CORES: Record<string, string> = {
  triado:             'bg-blue-100 text-blue-700',
  entrevista_rh:      'bg-indigo-100 text-indigo-700',
  entrevista_tecnica: 'bg-purple-100 text-purple-700',
  teste_pratico:      'bg-amber-100 text-amber-700',
  oferta:             'bg-emerald-100 text-emerald-700',
  contratado:         'bg-green-100 text-green-700',
  reprovado:          'bg-red-100 text-red-700',
}

const VARIAVEIS_DISPONIVEIS = [
  { var: '$nome',            desc: 'Primeiro nome do candidato' },
  { var: '$nome_completo',   desc: 'Nome completo' },
  { var: '$vaga',            desc: 'Título da vaga' },
  { var: '$empresa',         desc: 'Nome da empresa' },
  { var: '$data_entrevista', desc: 'Data e hora da entrevista' },
  { var: '$link_entrevista', desc: 'Link ou local da entrevista' },
  { var: '$responsavel',     desc: 'Responsável pelo processo' },
  { var: '$email_rh',        desc: 'E-mail de contato do RH' },
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
  const [editando, setEditando]   = useState(false)
  const [assunto, setAssunto]     = useState(template.assunto_email)
  const [corpo, setCorpo]         = useState(template.corpo_email)

  const salvar = useMutation({
    mutationFn: () => notificacoesService.atualizarTemplate(template.etapa, {
      assunto_email:    assunto,
      corpo_email:      corpo,
      ativo:            template.ativo,
      canal_email:      template.canal_email,
      canal_whatsapp:   template.canal_whatsapp,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setEditando(false) },
  })

  const toggleAtivo = useMutation({
    mutationFn: () => notificacoesService.atualizarTemplate(template.etapa, {
      assunto_email:  template.assunto_email,
      corpo_email:    template.corpo_email,
      ativo:          !template.ativo,
      canal_email:    template.canal_email,
      canal_whatsapp: template.canal_whatsapp,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })

  const cancelar = () => { setAssunto(template.assunto_email); setCorpo(template.corpo_email); setEditando(false) }

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${template.ativo ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
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

      {expandido && (
        <div className="px-5 pb-4 border-t border-slate-100 pt-4 space-y-3">
          {editando ? (
            <>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Assunto do e-mail</label>
                <input value={assunto} onChange={e => setAssunto(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Corpo do e-mail</label>
                <textarea value={corpo} onChange={e => setCorpo(e.target.value)} rows={10}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y" />
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
  const [aba, setAba] = useState<'templates' | 'historico'>('templates')

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: notificacoesService.listarTemplates,
  })

  const { data: historico = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ['historico-notificacoes'],
    queryFn: () => notificacoesService.historico(),
    enabled: aba === 'historico',
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notificações & E-mail</h1>
        <p className="text-slate-500 text-sm mt-0.5">Templates automáticos e histórico de envios para candidatos</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { id: 'templates', label: 'Templates de E-mail', icon: Mail },
          { id: 'historico', label: 'Histórico de Envios', icon: Bell },
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

      {/* ── Templates ── */}
      {aba === 'templates' && (
        <div className="space-y-4">
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

      {/* ── Histórico ── */}
      {aba === 'historico' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loadingHistorico ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : historico.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Nenhuma notificação enviada ainda.</p>
              <p className="text-slate-400 text-xs mt-1">Os envios aparecerão aqui conforme candidatos avançam no fluxo.</p>
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
    </div>
  )
}
