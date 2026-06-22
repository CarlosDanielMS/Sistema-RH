import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw,
  Trash2, Database, Cpu, Zap, Activity, Server, BarChart3,
} from 'lucide-react'
import api from '../services/api'

interface Servico {
  status: 'ok' | 'erro'
  latencia_ms: number | null
  detalhe?: string
  http_status?: number
}

interface StatusResp {
  sistema: string
  timestamp: string
  servicos: { postgres: Servico; chromadb: Servico; groq_api: Servico }
  metricas: Record<string, number>
  config: Record<string, string | number>
}

interface LogEntry {
  ts: string
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  logger: string
  message: string
  exc: string | null
}

interface LogsResp {
  total_filtrado: number
  total_buffer: number
  nivel_filtro: string
  contagem: Record<string, number>
  logs: LogEntry[]
}

const NIVEL_STYLE: Record<string, string> = {
  INFO:     'bg-blue-50 text-blue-700 border-blue-200',
  WARNING:  'bg-amber-50 text-amber-700 border-amber-200',
  ERROR:    'bg-red-50 text-red-700 border-red-200',
  CRITICAL: 'bg-red-100 text-red-900 border-red-300 font-bold',
}

function StatusPill({ s, label, icon: Icon }: { s: Servico; label: string; icon: any }) {
  const ok = s.status === 'ok'
  return (
    <div className={`card flex items-center gap-4 border-l-4 ${ok ? 'border-l-emerald-400' : 'border-l-red-400'}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${ok ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <Icon className={`w-5 h-5 ${ok ? 'text-emerald-600' : 'text-red-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          {ok
            ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle className="w-3.5 h-3.5" /> Online</span>
            : <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><XCircle className="w-3.5 h-3.5" /> Erro</span>}
        </div>
        {s.latencia_ms != null && (
          <p className="text-xs text-slate-400">{s.latencia_ms} ms de latência</p>
        )}
        {s.detalhe && (
          <p className="text-xs text-red-500 truncate mt-0.5" title={s.detalhe}>{s.detalhe}</p>
        )}
        {s.http_status && s.http_status !== 200 && (
          <p className="text-xs text-red-500 mt-0.5">HTTP {s.http_status}{s.http_status === 401 ? ' — Chave de API inválida' : ''}</p>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export function AdminLogs() {
  const qc = useQueryClient()
  const [nivelFiltro, setNivelFiltro] = useState('ALL')
  const [busca, setBusca] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)

  const { data: status, isLoading: loadingStatus, dataUpdatedAt } = useQuery<StatusResp>({
    queryKey: ['admin-status'],
    queryFn: () => api.get('/admin/status').then(r => r.data),
    refetchInterval: autoRefresh ? 10000 : false,
  })

  const { data: logsData, isLoading: loadingLogs } = useQuery<LogsResp>({
    queryKey: ['admin-logs', nivelFiltro, busca],
    queryFn: () => api.get('/admin/logs', { params: { nivel: nivelFiltro, limit: 200, busca } }).then(r => r.data),
    refetchInterval: autoRefresh ? 10000 : false,
  })

  const limparLogs = useMutation({
    mutationFn: () => api.delete('/admin/logs'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-logs'] }),
  })

  function refresh() {
    qc.invalidateQueries({ queryKey: ['admin-status'] })
    qc.invalidateQueries({ queryKey: ['admin-logs', nivelFiltro, busca] })
  }

  const sistemaOk = status?.sistema === 'ok'
  const ultimaAtualizacao = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')
    : '—'

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Monitor do Sistema</h1>
          <p className="page-subtitle">Status dos serviços, métricas e log de erros</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded accent-primary-600"
            />
            Auto-refresh (10s)
          </label>
          <button onClick={refresh} className="btn-secondary flex items-center gap-1.5 text-sm">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </button>
        </div>
      </div>

      {/* Banner geral */}
      {status && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${sistemaOk ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          {sistemaOk
            ? <CheckCircle className="w-5 h-5 text-emerald-500" />
            : <AlertTriangle className="w-5 h-5 text-red-500" />}
          <div>
            <p className={`text-sm font-semibold ${sistemaOk ? 'text-emerald-800' : 'text-red-800'}`}>
              Sistema {sistemaOk ? 'operacional' : 'com problemas'}
            </p>
            <p className="text-xs text-slate-500">Última verificação: {ultimaAtualizacao}</p>
          </div>
        </div>
      )}

      {/* Status dos serviços */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
          <Server className="w-4 h-4" /> Serviços
        </h2>
        {loadingStatus ? (
          <div className="flex items-center gap-2 text-slate-400 py-6 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Verificando serviços...
          </div>
        ) : status ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatusPill s={status.servicos.postgres}  label="PostgreSQL"  icon={Database} />
            <StatusPill s={status.servicos.chromadb}  label="ChromaDB (Embeddings)" icon={Cpu} />
            <StatusPill s={status.servicos.groq_api}  label="Groq API (LLM)"  icon={Zap} />
          </div>
        ) : null}
      </div>

      {/* Alerta Groq */}
      {status?.servicos.groq_api.status === 'erro' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Chave Groq API inválida</p>
            <p className="text-xs text-amber-700 mt-1">
              A chave em <code className="bg-amber-100 px-1 rounded">.env → GROQ_API_KEY</code> está inválida
              (HTTP {status.servicos.groq_api.http_status}).
              Chaves Groq sempre começam com <code className="bg-amber-100 px-1 rounded">gsk_</code>.
              Obtenha uma nova em{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline font-medium">
                console.groq.com/keys
              </a>
              {' '}e reinicie o backend com <code className="bg-amber-100 px-1 rounded">docker restart rh_ia_backend</code>.
            </p>
          </div>
        </div>
      )}

      {/* Métricas banco + requests */}
      {status && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" /> Métricas do Banco
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Candidatos"         value={status.metricas.candidatos_total} />
              <MetricCard label="Com Currículo PDF"  value={status.metricas.candidatos_com_cv}     sub={`${status.metricas.candidatos_sem_cv} sem CV`} />
              <MetricCard label="Analisados pela IA" value={status.metricas.candidatos_analisados} sub={`de ${status.metricas.candidatos_com_cv} com CV`} />
              <MetricCard label="Vagas Cadastradas"  value={status.metricas.vagas_total} />
            </div>
          </div>

          {status.requests && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Requests HTTP (desde último restart)
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Total"            value={status.requests.total} />
                <MetricCard label="Erros 4xx"        value={status.requests.erros_4xx} />
                <MetricCard label="Erros 5xx"        value={status.requests.erros_5xx} />
                <MetricCard label="Latência Média"   value={`${status.requests.latencia_media_ms}ms`} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Configuração atual */}
      {status?.config && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> Configuração Ativa
          </h2>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-50">
                {Object.entries(status.config).map(([k, v]) => (
                  <tr key={k} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-500 w-48">{k}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-800">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Logs */}
      <div>
        {/* Contadores por nível */}
        {logsData?.contagem && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {Object.entries(logsData.contagem).map(([nivel, qtd]) => (
              <button
                key={nivel}
                onClick={() => setNivelFiltro(nivelFiltro === nivel ? 'ALL' : nivel)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  nivelFiltro === nivel
                    ? NIVEL_STYLE[nivel] + ' ring-2 ring-offset-1 ring-current'
                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {nivel} <span className="opacity-70">({qtd})</span>
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-400 self-center">
              Buffer: {logsData.total_buffer} / 500
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> Logs Detalhados
            {logsData && (
              <span className="ml-1 text-xs font-normal text-slate-400">
                ({logsData.total_filtrado} mostrados)
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Buscar na mensagem..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="input py-1.5 text-xs w-48"
            />
            <select
              className="input py-1.5 text-xs w-32"
              value={nivelFiltro}
              onChange={e => setNivelFiltro(e.target.value)}
            >
              {['ALL', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <button
              onClick={() => limparLogs.mutate()}
              disabled={limparLogs.isPending}
              className="btn-secondary py-1.5 px-2.5 text-xs flex items-center gap-1 text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" /> Limpar
            </button>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          {loadingLogs ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando logs...
            </div>
          ) : !logsData?.logs.length ? (
            <div className="text-center py-10 text-slate-400">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhum log registrado{busca ? ` para "${busca}"` : ''}.</p>
              <p className="text-xs mt-1 opacity-60">Use o sistema normalmente — logs aparecem aqui em tempo real.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-[32rem] overflow-y-auto font-mono">
              {logsData.logs.map((log) => (
                <div key={log.id} className={`px-4 py-2.5 border-l-4 ${NIVEL_STYLE[log.level] ?? 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-xs font-bold uppercase w-16 shrink-0 ${NIVEL_STYLE[log.level]?.split(' ')[1] ?? ''}`}>
                      {log.level}
                    </span>
                    <span className="text-xs text-slate-500">{log.logger}</span>
                    <span className="text-xs text-slate-400 opacity-60">{log.modulo}</span>
                    <span className="ml-auto text-xs text-slate-400">
                      {new Date(log.ts).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap break-all leading-relaxed">
                    {log.message}
                  </p>
                  {log.exc && (
                    <pre className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 p-2 rounded overflow-x-auto leading-relaxed">
                      {log.exc}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
