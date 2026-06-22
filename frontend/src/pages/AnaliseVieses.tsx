import { useState } from 'react'
import {
  AlertTriangle, TrendingDown, Users, BarChart2, RefreshCw,
  Loader2, Plus, Pencil, Trash2, CheckCircle, X, Save,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { analisesService } from '../services/analisesService'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import api from '../services/api'

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface ViésRegistro {
  id: number
  titulo: string
  descricao: string
  categoria: string
  severidade: 'baixa' | 'media' | 'alta'
  status: 'aberto' | 'monitorando' | 'resolvido'
  vaga_id?: number
  responsavel?: string
  acao?: string
  criado_em: string
  atualizado_em: string
}

interface ViésForm {
  titulo: string; descricao: string; categoria: string
  severidade: string; status: string
  responsavel: string; acao: string
}

// ── Constantes ─────────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { value: 'genero',        label: 'Gênero' },
  { value: 'etnia',         label: 'Etnia / Raça' },
  { value: 'idade',         label: 'Idade' },
  { value: 'escolaridade',  label: 'Escolaridade' },
  { value: 'origem',        label: 'Origem / Regionalismo' },
  { value: 'aparencia',     label: 'Aparência' },
  { value: 'afinidade',     label: 'Afinidade / Simpatia' },
  { value: 'confirmacao',   label: 'Confirmação (Viés Cognitivo)' },
  { value: 'ancoragem',     label: 'Ancoragem (Primeira Impressão)' },
  { value: 'outro',         label: 'Outro' },
]

const SEV_STYLE: Record<string, string> = {
  baixa: 'bg-blue-100 text-blue-700',
  media: 'bg-amber-100 text-amber-700',
  alta:  'bg-red-100 text-red-700',
}

const STATUS_STYLE: Record<string, string> = {
  aberto:       'bg-red-100 text-red-700',
  monitorando:  'bg-amber-100 text-amber-700',
  resolvido:    'bg-emerald-100 text-emerald-700',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  aberto:      <AlertTriangle className="w-3 h-3" />,
  monitorando: <RefreshCw className="w-3 h-3" />,
  resolvido:   <CheckCircle className="w-3 h-3" />,
}

// ── Componente ─────────────────────────────────────────────────────────────────
export function AnaliseVieses() {
  const qc = useQueryClient()
  const toast = useToast()
  const [modalOpen, setModalOpen]   = useState(false)
  const [editando, setEditando]     = useState<ViésRegistro | null>(null)
  const [filtroStatus, setFiltroStatus] = useState('todos')

  const { data: relatorio, isLoading: loadingRelatorio, refetch, isRefetching } = useQuery({
    queryKey: ['analise-vieses'],
    queryFn: () => analisesService.geral(),
  })

  const { data: vieses = [], isLoading: loadingVieses } = useQuery<ViésRegistro[]>({
    queryKey: ['vieses'],
    queryFn: () => api.get('/vieses/').then(r => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ViésForm>()

  const criar = useMutation({
    mutationFn: (d: ViésForm) => api.post('/vieses/', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vieses'] })
      toast.success('Viés registrado com sucesso')
      setModalOpen(false); reset()
    },
    onError: () => toast.error('Erro ao registrar viés'),
  })

  const atualizar = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ViésForm }) =>
      api.put(`/vieses/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vieses'] })
      toast.success('Viés atualizado')
      setEditando(null); reset()
    },
    onError: () => toast.error('Erro ao atualizar viés'),
  })

  const excluir = useMutation({
    mutationFn: (id: number) => api.delete(`/vieses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vieses'] })
      toast.success('Registro excluído')
    },
    onError: () => toast.error('Erro ao excluir'),
  })

  function abrirEditar(v: ViésRegistro) {
    setEditando(v)
    reset({
      titulo: v.titulo, descricao: v.descricao, categoria: v.categoria,
      severidade: v.severidade, status: v.status,
      responsavel: v.responsavel ?? '', acao: v.acao ?? '',
    })
    setModalOpen(true)
  }

  function fecharModal() { setModalOpen(false); setEditando(null); reset() }

  function onSubmit(data: ViésForm) {
    if (editando) atualizar.mutate({ id: editando.id, data })
    else criar.mutate(data)
  }

  const viesesFiltrados = filtroStatus === 'todos'
    ? vieses
    : vieses.filter(v => v.status === filtroStatus)

  // ── Métricas do relatório automático ──────────────────────────────────────
  const m = relatorio?.metricas

  const alertas = m ? [
    m.decisoes_sem_justificativa_clara > 0 && {
      icon: AlertTriangle, color: 'bg-orange-50 border-orange-200 text-orange-700',
      title: `${m.decisoes_sem_justificativa_clara} decisões sem justificativa clara`,
      desc: 'Reprovações sem critério documentado elevam o risco de viés não intencional.',
    },
    m.score_medio_ia < 70 && {
      icon: TrendingDown, color: 'bg-amber-50 border-amber-200 text-amber-700',
      title: `Score médio abaixo do ideal (${m.score_medio_ia})`,
      desc: 'Considere revisar os critérios da vaga ou ampliar o pool de candidatos.',
    },
    m.reprovados_ia > m.aprovados_ia && {
      icon: Users, color: 'bg-blue-50 border-blue-200 text-blue-700',
      title: 'Alta taxa de reprovação na triagem',
      desc: `${m.reprovados_ia} reprovados vs. ${m.aprovados_ia} aprovados pela IA.`,
    },
  ].filter(Boolean) as { icon: any; color: string; title: string; desc: string }[] : []

  const etapaData = m
    ? Object.entries(m.distribuicao_etapas || {}).map(([name, value]) => ({
        name: name.replace('_', ' '), candidatos: value as number,
      }))
    : []

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Análise de Padrões e Vieses</h1>
          <p className="page-subtitle">Monitore seu processo seletivo e registre vieses observados</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Atualizando...' : 'Atualizar Análise'}
          </button>
          <button className="btn-primary" onClick={() => { setEditando(null); reset({ severidade: 'media', status: 'aberto', categoria: 'outro' }); setModalOpen(true) }}>
            <Plus className="w-4 h-4" /> Registrar Viés
          </button>
        </div>
      </div>

      {/* ── Análise Automática IA ── */}
      {loadingRelatorio ? (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Gerando análise com IA...
        </div>
      ) : relatorio && m ? (
        <>
          {alertas.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Alertas Automáticos do Processo
              </h3>
              {alertas.map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className={`flex items-start gap-3 p-4 rounded-xl border ${color}`}>
                  <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs mt-0.5 opacity-80">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Candidatos', value: m.total_candidatos },
              { label: 'Score Médio IA',   value: m.score_medio_ia },
              { label: 'Aprovados IA',     value: m.aprovados_ia },
              { label: 'Reprovados IA',    value: m.reprovados_ia },
            ].map(({ label, value }) => (
              <div key={label} className="card text-center">
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary-500" /> Candidatos por Etapa
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={etapaData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="candidatos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Análise da IA
              </h3>
              <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
                {relatorio.analise}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* ── Vieses Manuais ── */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Vieses Registrados Manualmente
            <span className="text-xs font-normal text-slate-400">({vieses.length} total)</span>
          </h2>
          <div className="flex gap-1">
            {['todos', 'aberto', 'monitorando', 'resolvido'].map(s => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  filtroStatus === s ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {s === 'todos' ? 'Todos' : s}
              </button>
            ))}
          </div>
        </div>

        {loadingVieses ? (
          <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : viesesFiltrados.length === 0 ? (
          <div className="card text-center py-12 text-slate-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Nenhum viés registrado{filtroStatus !== 'todos' ? ` com status "${filtroStatus}"` : ''}.</p>
            <p className="text-xs mt-1 opacity-60">Use "Registrar Viés" para documentar padrões observados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {viesesFiltrados.map(v => {
              const cat = CATEGORIAS.find(c => c.value === v.categoria)
              return (
                <div key={v.id} className="card flex items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{v.titulo}</p>
                        {cat && <p className="text-xs text-slate-400">{cat.label}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`badge flex items-center gap-1 ${SEV_STYLE[v.severidade]}`}>
                          {v.severidade === 'alta' ? '🔴' : v.severidade === 'media' ? '🟡' : '🔵'} {v.severidade}
                        </span>
                        <span className={`badge flex items-center gap-1 ${STATUS_STYLE[v.status]}`}>
                          {STATUS_ICON[v.status]} {v.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-600">{v.descricao}</p>

                    {v.acao && (
                      <div className="p-2.5 bg-primary-50 border border-primary-100 rounded-lg text-xs text-primary-800">
                        <strong>Ação:</strong> {v.acao}
                      </div>
                    )}

                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400">
                      <span>
                        {v.responsavel && <>Por: <strong className="text-slate-600">{v.responsavel}</strong> · </>}
                        {new Date(v.criado_em).toLocaleDateString('pt-BR')}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => abrirEditar(v)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm('Excluir este registro?')) excluir.mutate(v.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Nota LGPD */}
      <div className="card bg-slate-50 border-slate-200 text-xs text-slate-500">
        <strong>Nota de privacidade:</strong> Este relatório utiliza apenas dados agregados. Nenhuma informação pessoal dos candidatos é exposta. Em conformidade com a LGPD.
      </div>

      {/* ── Modal Criar/Editar Viés ── */}
      <Modal
        open={modalOpen}
        onClose={fecharModal}
        title={editando ? `Editar — ${editando.titulo}` : 'Registrar Viés Observado'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Título *</label>
            <input
              className="input"
              placeholder="Ex: Preferência por candidatos da mesma região"
              {...register('titulo', { required: 'Obrigatório' })}
            />
            {errors.titulo && <p className="text-xs text-red-500 mt-1">{errors.titulo.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoria</label>
              <select className="input" {...register('categoria')}>
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Severidade</label>
              <select className="input" {...register('severidade')}>
                <option value="baixa">🔵 Baixa</option>
                <option value="media">🟡 Média</option>
                <option value="alta">🔴 Alta</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Descrição *</label>
            <textarea
              className="input resize-none min-h-20"
              placeholder="Descreva o padrão observado, quando ocorreu e quem foi afetado..."
              {...register('descricao', { required: 'Obrigatório' })}
            />
            {errors.descricao && <p className="text-xs text-red-500 mt-1">{errors.descricao.message}</p>}
          </div>

          <div>
            <label className="label">Ação corretiva <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Ex: Criar checklist de avaliação padronizado para reduzir subjetividade"
              {...register('acao')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Responsável</label>
              <input className="input" placeholder="Nome do recrutador" {...register('responsavel')} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" {...register('status')}>
                <option value="aberto">🔴 Aberto</option>
                <option value="monitorando">🟡 Monitorando</option>
                <option value="resolvido">🟢 Resolvido</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={fecharModal}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={criar.isPending || atualizar.isPending}>
              {(criar.isPending || atualizar.isPending)
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                : <><Save className="w-4 h-4" /> {editando ? 'Salvar' : 'Registrar'}</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
