import { Link } from 'react-router-dom'
import {
  Briefcase, Users, CheckCircle, Clock, XCircle, BookOpen,
  TrendingUp, ArrowRight, Brain, GitBranch, FileText,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { vagasService } from '../services/vagasService'
import { candidatosService } from '../services/candidatosService'
import { decisoesService } from '../services/decisoesService'
import { pipelineService } from '../services/pipelineService'
import { historicoService } from '../services/historicoService'
import { LABEL_CLASSIFICACAO, LABEL_ETAPA, scoreColor } from '../utils/helpers'
import type { EtapaPipeline } from '../types'

const ETAPA_COLORS: Record<string, string> = {
  triado:             '#94a3b8',
  entrevista_rh:      '#60a5fa',
  entrevista_tecnica: '#a78bfa',
  teste_pratico:      '#fbbf24',
  oferta:             '#34d399',
  contratado:         '#059669',
  reprovado:          '#f87171',
}

const TIPO_LABEL: Record<string, string> = {
  observacao: 'Observação',
  arquivo:    'Arquivo anexado',
  pipeline:   'Etapa alterada',
  analise_ia: 'Análise IA',
  cv_upload:  'CV enviado',
}

export function Dashboard() {
  const { data: vagas = [] }      = useQuery({ queryKey: ['vagas'],      queryFn: () => vagasService.listar() })
  const { data: candidatos = [] } = useQuery({ queryKey: ['candidatos'], queryFn: () => candidatosService.listar() })
  const { data: decisoes = [] }   = useQuery({ queryKey: ['decisoes'],   queryFn: () => decisoesService.listar() })
  const { data: stats }           = useQuery({ queryKey: ['pipeline-stats'], queryFn: () => pipelineService.stats() })

  const vagasAbertas    = vagas.filter(v => v.status === 'aberta').length
  const aprovadosIA     = candidatos.filter(c => c.status_triagem === 'aprovado').length
  const pendentesHumano = candidatos.filter(c => c.status_triagem === 'analise_humana').length
  const reprovadosIA    = candidatos.filter(c => c.status_triagem === 'reprovado').length
  const comCV           = candidatos.filter(c => c.cv_filename).length
  const scoresMedio     = candidatos.filter(c => c.score_aderencia != null)
  const scoreMedio      = scoresMedio.length
    ? Math.round(scoresMedio.reduce((s, c) => s + (c.score_aderencia ?? 0), 0) / scoresMedio.length)
    : 0

  const topStats = [
    { label: 'Vagas Abertas',      value: vagasAbertas,      icon: Briefcase,   color: 'bg-blue-50 text-blue-600',     to: '/vagas' },
    { label: 'Total Candidatos',   value: candidatos.length, icon: Users,       color: 'bg-violet-50 text-violet-600', to: '/candidatos' },
    { label: 'Com Currículo PDF',  value: comCV,             icon: FileText,    color: 'bg-slate-50 text-slate-600',   to: '/candidatos' },
    { label: 'Aprovados pela IA',  value: aprovadosIA,       icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600', to: '/candidatos' },
    { label: 'Pendente Avaliação', value: pendentesHumano,   icon: Clock,       color: 'bg-amber-50 text-amber-600',   to: '/candidatos' },
    { label: 'Reprovados pela IA', value: reprovadosIA,      icon: XCircle,     color: 'bg-red-50 text-red-500',       to: '/candidatos' },
    { label: 'Decisões',           value: decisoes.length,   icon: BookOpen,    color: 'bg-indigo-50 text-indigo-600', to: '/decisoes' },
    { label: 'Score Médio IA',     value: scoreMedio || '—', icon: TrendingUp,  color: 'bg-teal-50 text-teal-600',     to: '/candidatos' },
  ]

  // Funil do pipeline
  const funnelData = stats
    ? Object.entries(stats.funil).map(([etapa, qtd]) => ({
        name: LABEL_ETAPA[etapa as EtapaPipeline] ?? etapa,
        value: qtd,
        fill: ETAPA_COLORS[etapa] ?? '#94a3b8',
      })).filter(d => d.value > 0)
    : []

  // Candidatos por vaga
  const barData = vagas
    .filter(v => v.status === 'aberta')
    .slice(0, 6)
    .map(v => ({
      name: v.titulo.split(' ').slice(0, 3).join(' '),
      candidatos: candidatos.filter(c => c.vaga_id === v.id).length,
    }))

  // Últimas análises
  const ultimasAnalises = [...candidatos]
    .filter(c => c.score_aderencia != null)
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, 6)

  // Candidatos sem CV ou sem vaga (atenção necessária)
  const semCV    = candidatos.filter(c => !c.cv_filename && c.etapa_pipeline !== 'reprovado')
  const semVaga  = candidatos.filter(c => !c.vaga_id)

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral do processo seletivo</p>
        </div>
        <Link to="/pipeline" className="btn-secondary flex items-center gap-1.5 text-sm">
          <GitBranch className="w-4 h-4" /> Ver Pipeline
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topStats.map(({ label, value, icon: Icon, color, to }) => (
          <Link key={label} to={to} className="card flex items-center gap-4 hover:shadow-card-hover transition-shadow">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 leading-tight">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Alertas de atenção */}
      {(semCV.length > 0 || semVaga.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {semCV.length > 0 && (
            <Link to="/candidatos" className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors">
              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{semCV.length} candidato{semCV.length > 1 ? 's' : ''} sem currículo PDF</p>
                <p className="text-xs text-amber-600">Envie os CVs para habilitar a análise IA</p>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-500 ml-auto" />
            </Link>
          )}
          {semVaga.length > 0 && (
            <Link to="/candidatos" className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">
              <Briefcase className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">{semVaga.length} candidato{semVaga.length > 1 ? 's' : ''} sem vaga vinculada</p>
                <p className="text-xs text-blue-600">Vincule uma vaga para ativar a análise IA</p>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-500 ml-auto" />
            </Link>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funil do Pipeline */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Funil do Pipeline</h3>
            <Link to="/pipeline" className="text-xs text-primary-600 hover:underline">Ver kanban</Link>
          </div>
          {funnelData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-300">
              <GitBranch className="w-8 h-8 mb-2" />
              <p className="text-xs">Nenhum candidato no pipeline</p>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats?.funil ?? {}).map(([etapa, qtd]) => {
                const total = stats?.total || 1
                const pct = Math.round((qtd / total) * 100)
                return (
                  <div key={etapa} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{LABEL_ETAPA[etapa as EtapaPipeline]}</span>
                      <span className="font-semibold text-slate-700">{qtd}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: ETAPA_COLORS[etapa] }}
                      />
                    </div>
                  </div>
                )
              })}
              <p className="text-xs text-slate-400 text-right pt-1">{stats?.total ?? 0} candidatos total</p>
            </div>
          )}
        </div>

        {/* Candidatos por Vaga */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4">Candidatos por Vaga (abertas)</h3>
          {barData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-300">
              <Briefcase className="w-8 h-8 mb-2" />
              <p className="text-xs">Nenhuma vaga aberta</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="candidatos" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Últimas Análises + Candidatos Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas Análises */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-500" /> Últimas Análises IA
            </h3>
            <Link to="/candidatos" className="text-xs text-primary-600 hover:underline">Ver todos</Link>
          </div>
          {ultimasAnalises.length === 0 ? (
            <div className="text-center py-8 text-slate-300">
              <Brain className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs">Nenhuma análise realizada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ultimasAnalises.map(c => {
                const cfg = LABEL_CLASSIFICACAO[c.status_triagem]
                const vaga = vagas.find(v => v.id === c.vaga_id)
                return (
                  <Link
                    key={c.id}
                    to={`/candidatos/${c.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary-600">
                        {c.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{c.nome}</p>
                      <p className="text-xs text-slate-400 truncate">{vaga?.titulo ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-sm font-bold ${scoreColor(c.score_aderencia ?? 0)}`}>
                        {c.score_aderencia}
                      </span>
                      <span className={`badge text-xs ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Candidatos Recentes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Candidatos Recentes
            </h3>
            <Link to="/candidatos/novo" className="text-xs text-primary-600 hover:underline">+ Adicionar</Link>
          </div>
          <div className="space-y-2">
            {[...candidatos]
              .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
              .slice(0, 6)
              .map(c => {
                const vaga = vagas.find(v => v.id === c.vaga_id)
                return (
                  <Link
                    key={c.id}
                    to={`/candidatos/${c.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-slate-500">
                        {c.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{c.nome}</p>
                      <p className="text-xs text-slate-400 truncate">{vaga?.titulo ?? 'Sem vaga'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!c.cv_filename && (
                        <span className="text-xs text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">Sem CV</span>
                      )}
                      <span className="text-xs text-slate-400">
                        {LABEL_ETAPA[c.etapa_pipeline as EtapaPipeline] ?? c.etapa_pipeline}
                      </span>
                    </div>
                  </Link>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
