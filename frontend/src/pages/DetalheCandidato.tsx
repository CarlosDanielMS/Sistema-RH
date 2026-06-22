import { useRef, useState } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Brain, ArrowRightLeft, BookOpen, CheckCircle, AlertTriangle,
  XCircle, Loader2, Info, FileText, Upload, X, Pencil, User, RefreshCw,
  Clock, MessageSquare, Paperclip, Send, GitBranch, ClipboardList,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { candidatosService } from '../services/candidatosService'
import { vagasService } from '../services/vagasService'
import { pipelineService } from '../services/pipelineService'
import { historicoService, HistoricoEntry } from '../services/historicoService'
import { ScoreBar } from '../components/ui/ScoreBar'
import { Modal } from '../components/ui/Modal'
import { LABEL_CLASSIFICACAO, LABEL_ETAPA, ETAPAS_ORDEM, formatDate, scoreColor } from '../utils/helpers'
import type { EtapaPipeline, AnaliseIA } from '../types'

type Tab = 'dados' | 'analise' | 'curriculo' | 'historico'

const TIPO_ICON: Record<string, any> = {
  observacao:  MessageSquare,
  arquivo:     Paperclip,
  pipeline:    GitBranch,
  analise_ia:  Brain,
  cv_upload:   FileText,
}

const TIPO_COLOR: Record<string, string> = {
  observacao:  'bg-blue-100 text-blue-600',
  arquivo:     'bg-violet-100 text-violet-600',
  pipeline:    'bg-amber-100 text-amber-600',
  analise_ia:  'bg-emerald-100 text-emerald-600',
  cv_upload:   'bg-slate-100 text-slate-600',
}

export function DetalheCandidato() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const candidatoId = Number(id)
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>(searchParams.get('cv_erro') ? 'curriculo' : 'dados')
  const [modalPipeline, setModalPipeline] = useState(false)
  const [etapaNova, setEtapaNova] = useState<EtapaPipeline>('entrevista_rh')
  const [observacao, setObservacao] = useState('')
  const [analiseResult, setAnaliseResult] = useState<AnaliseIA | null>(null)
  const [analiseErro, setAnaliseErro] = useState<string | null>(null)
  const [modalTeste, setModalTeste]   = useState(false)
  const [linkTeste, setLinkTeste]     = useState('')
  const [prazoTeste, setPrazoTeste]   = useState('')
  const [plataforma, setPlataforma]   = useState('')
  const [instrucoes, setInstrucoes]   = useState('')
  const [testeMsg, setTesteMsg]       = useState<{ ok: boolean; texto: string } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [obsTexto, setObsTexto] = useState('')
  const [uploadErro, setUploadErro] = useState<string | null>(
    searchParams.get('cv_erro') ? 'O currículo não pôde ser salvo durante o cadastro. Envie novamente.' : null
  )

  const { data: candidato, isLoading } = useQuery({
    queryKey: ['candidato', candidatoId],
    queryFn: () => candidatosService.obter(candidatoId),
    enabled: !!candidatoId,
  })

  const { data: vagas = [] } = useQuery({
    queryKey: ['vagas'],
    queryFn: () => vagasService.listar(),
  })

  const analisar = useMutation({
    mutationFn: () => candidatosService.analisar(candidatoId),
    onSuccess: (res) => {
      setAnaliseErro(null)
      setAnaliseResult(res.analise)
      qc.invalidateQueries({ queryKey: ['candidato', candidatoId] })
      qc.invalidateQueries({ queryKey: ['candidatos'] })
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
      setAnaliseErro(detail || 'Erro ao analisar. Verifique se o servidor está rodando.')
    },
  })

  const uploadCV = useMutation({
    mutationFn: (file: File) => candidatosService.uploadCV(candidatoId, file),
    onSuccess: () => {
      setUploadErro(null)
      qc.invalidateQueries({ queryKey: ['candidato', candidatoId] })
      qc.invalidateQueries({ queryKey: ['candidatos'] })
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail
      setUploadErro(detail || 'Erro ao enviar o currículo. Tente novamente.')
    },
  })

  const mover = useMutation({
    mutationFn: () => pipelineService.mover(candidatoId, etapaNova, 'Recrutador', observacao || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidato', candidatoId] })
      qc.invalidateQueries({ queryKey: ['candidatos'] })
      setModalPipeline(false)
      setObservacao('')
    },
  })

  const { data: historico = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ['historico', candidatoId],
    queryFn: () => historicoService.listar(candidatoId),
    enabled: tab === 'historico',
  })

  const { data: eventosAgenda = [] } = useQuery({
    queryKey: ['eventos-candidato', candidatoId],
    queryFn: () => import('../services/agendaService').then(m => m.agendaService.porCandidato(candidatoId)),
    enabled: tab === 'historico',
  })

  const adicionarObs = useMutation({
    mutationFn: (texto: string) => historicoService.adicionarObservacao(candidatoId, texto),
    onSuccess: () => {
      setObsTexto('')
      qc.invalidateQueries({ queryKey: ['historico', candidatoId] })
    },
  })

  const uploadAnexoHist = useMutation({
    mutationFn: (file: File) => historicoService.uploadAnexo(candidatoId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['historico', candidatoId] }),
  })

  const anexoRef = useRef<HTMLInputElement>(null)

  const enviarTeste = useMutation({
    mutationFn: () => api.post('/marketing/enviar-teste-pratico', null, {
      params: {
        candidato_id: candidatoId,
        link_teste: linkTeste,
        prazo: prazoTeste,
        plataforma,
        instrucoes,
      },
    }),
    onSuccess: () => {
      setTesteMsg({ ok: true, texto: `E-mail do Teste Prático enviado para ${candidato?.email}` })
      qc.invalidateQueries({ queryKey: ['historico', candidatoId] })
      setLinkTeste(''); setPrazoTeste(''); setPlataforma(''); setInstrucoes('')
    },
    onError: (e: any) => {
      setTesteMsg({ ok: false, texto: e?.response?.data?.detail || 'Falha no envio. Verifique o SMTP em Monitor.' })
    },
  })

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) uploadCV.mutate(f)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) uploadCV.mutate(f)
    e.target.value = ''
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-32 gap-2 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /> Carregando candidato...
    </div>
  )
  if (!candidato) return <div className="text-slate-500 py-16 text-center">Candidato não encontrado.</div>

  const vaga = vagas.find(v => v.id === candidato.vaga_id)
  const cfg = LABEL_CLASSIFICACAO[candidato.status_triagem]
  const analise = analiseResult ?? (candidato.justificativa_ia ? {
    score: candidato.score_aderencia ?? 0,
    classificacao: candidato.status_triagem as any,
    pontos_fortes: [],
    pontos_de_atencao: [],
    lacunas: [],
    justificativa: candidato.justificativa_ia,
    recomendacao_para_recrutador: '',
  } : null)

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  const cvUrl = candidato.cv_filename ? `${API_BASE}/candidatos/${candidatoId}/cv` : null

  const temRequisitos = !!candidato.cv_filename && !!candidato.vaga_id

  return (
    <div className="max-w-5xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/candidatos" className="btn-secondary p-2"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="page-title truncate">{candidato.nome}</h1>
          <p className="page-subtitle">{candidato.email}</p>
        </div>
        <span className={`badge ${cfg.color}`}>{cfg.label}</span>
        <Link to={`/candidatos/${candidatoId}/editar`} className="btn-secondary flex items-center gap-1.5 text-sm">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: 'dados',     label: 'Dados',       icon: User },
          { key: 'analise',   label: 'Análise IA',  icon: Brain },
          { key: 'curriculo', label: 'Currículo',   icon: FileText },
          { key: 'historico', label: 'Histórico',   icon: Clock },
        ] as { key: Tab; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {key === 'curriculo' && !candidato.cv_filename && (
              <span className="w-2 h-2 rounded-full bg-amber-400 ml-0.5" title="Sem currículo" />
            )}
          </button>
        ))}
      </div>

      {/* ── ABA DADOS ── */}
      {tab === 'dados' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-4">
            <div className="card space-y-3">
              <h3 className="font-semibold text-slate-800 text-sm">Informações</h3>
              {([
                ['Vaga', vaga?.titulo || '—'],
                ['Etapa', LABEL_ETAPA[candidato.etapa_pipeline as EtapaPipeline] || candidato.etapa_pipeline],
                ['Telefone', candidato.telefone || '—'],
                ['LinkedIn', candidato.linkedin || '—'],
                ['Cadastrado', formatDate(candidato.criado_em)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-slate-400">{k}</p>
                  <p className="text-sm font-medium text-slate-700 break-all">{v}</p>
                </div>
              ))}
            </div>

            {candidato.score_aderencia != null && (
              <div className="card">
                <p className="text-xs text-slate-400 mb-1">Score de Aderência</p>
                <p className={`text-3xl font-bold mb-2 ${scoreColor(candidato.score_aderencia)}`}>
                  {candidato.score_aderencia}<span className="text-base font-normal text-slate-400">/100</span>
                </p>
                <ScoreBar score={candidato.score_aderencia} />
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-3">
            <div className="card space-y-2">
              <h3 className="font-semibold text-slate-800 text-sm mb-1">Ações</h3>

              {/* Alertas de pré-requisito */}
              {!candidato.cv_filename && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Sem currículo PDF.{' '}
                    <button onClick={() => setTab('curriculo')} className="underline font-medium">
                      Enviar na aba Currículo
                    </button>.
                  </p>
                </div>
              )}
              {!candidato.vaga_id && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Sem vaga associada.{' '}
                    <Link to={`/candidatos/${candidatoId}/editar`} className="underline font-medium">
                      Vincular em Editar candidato
                    </Link>.
                  </p>
                </div>
              )}

              <button
                onClick={() => { setAnaliseErro(null); setTab('analise'); analisar.mutate() }}
                disabled={analisar.isPending || !temRequisitos}
                className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                title={!candidato.cv_filename ? 'Envie o currículo PDF primeiro' : !candidato.vaga_id ? 'Associe uma vaga primeiro' : ''}
              >
                {analisar.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
                  : <><Brain className="w-4 h-4" /> Analisar com IA</>}
              </button>
              <button
                onClick={() => { setEtapaNova(candidato.etapa_pipeline as EtapaPipeline); setModalPipeline(true) }}
                className="btn-secondary w-full justify-center"
              >
                <ArrowRightLeft className="w-4 h-4" /> Mover no Pipeline
              </button>
              <Link to="/decisoes" className="btn-secondary w-full justify-center flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Registrar Decisão
              </Link>

              {/* Botão Teste Prático — aparece sempre mas destaca quando na etapa correta */}
              <button
                onClick={() => { setTesteMsg(null); setModalTeste(true) }}
                className={`w-full justify-center flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${
                  candidato.etapa_pipeline === 'teste_pratico'
                    ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                    : 'btn-secondary'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                Enviar Teste Prático
                {candidato.etapa_pipeline === 'teste_pratico' && (
                  <span className="ml-1 text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">Etapa atual</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA ANÁLISE IA ── */}
      {tab === 'analise' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              <strong>A IA é um apoio à decisão.</strong> A análise é baseada em competências técnicas. O recrutador tem a palavra final.
            </p>
          </div>

          {!temRequisitos && (
            <div className="card flex flex-col items-center justify-center py-12 text-center space-y-2">
              <Brain className="w-10 h-10 text-slate-200 mb-1" />
              <p className="text-slate-500 text-sm font-medium">Pré-requisitos não atendidos</p>
              <div className="text-xs space-y-1 mt-1">
                <p className={candidato.cv_filename ? 'text-emerald-600' : 'text-red-400'}>
                  {candidato.cv_filename ? '✓' : '✗'} Currículo em PDF enviado
                </p>
                <p className={candidato.vaga_id ? 'text-emerald-600' : 'text-red-400'}>
                  {candidato.vaga_id ? '✓' : '✗'} Vaga associada
                </p>
              </div>
              <div className="flex gap-2 mt-3">
                {!candidato.cv_filename && (
                  <button onClick={() => setTab('curriculo')} className="btn-secondary text-xs py-1.5 px-3">
                    Enviar currículo →
                  </button>
                )}
                {!candidato.vaga_id && (
                  <Link to={`/candidatos/${candidatoId}/editar`} className="btn-secondary text-xs py-1.5 px-3">
                    Vincular vaga →
                  </Link>
                )}
              </div>
            </div>
          )}

          {temRequisitos && !analise && !analiseErro && (
            <div className="card flex flex-col items-center justify-center py-12 text-center space-y-3">
              <Brain className="w-10 h-10 text-slate-200" />
              <p className="text-slate-500 text-sm">Nenhuma análise realizada ainda.</p>
              <button
                onClick={() => { setAnaliseErro(null); analisar.mutate() }}
                disabled={analisar.isPending}
                className="btn-primary"
              >
                {analisar.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
                  : <><Brain className="w-4 h-4" /> Iniciar Análise IA</>}
              </button>
            </div>
          )}

          {analiseErro && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-red-700 font-semibold mb-1">Falha na análise</p>
                <p className="text-xs text-red-600">{analiseErro}</p>
              </div>
              <button
                onClick={() => { setAnaliseErro(null); analisar.mutate() }}
                disabled={analisar.isPending}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 underline"
              >
                <RefreshCw className="w-3 h-3" /> Tentar novamente
              </button>
            </div>
          )}

          {analise && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold text-slate-800">Resultado da Análise</h3>
                <div className="flex items-center gap-2">
                  <span className={`badge ${LABEL_CLASSIFICACAO[analise.classificacao as keyof typeof LABEL_CLASSIFICACAO]?.color ?? 'bg-slate-100 text-slate-600'}`}>
                    {LABEL_CLASSIFICACAO[analise.classificacao as keyof typeof LABEL_CLASSIFICACAO]?.label ?? analise.classificacao}
                  </span>
                  <button
                    onClick={() => { setAnaliseErro(null); analisar.mutate() }}
                    disabled={analisar.isPending}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                    title="Re-analisar"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${analisar.isPending ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <ScoreBar score={analise.score} />

              {analise.pontos_fortes?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mb-2">
                    <CheckCircle className="w-3.5 h-3.5" /> Pontos Fortes
                  </p>
                  {analise.pontos_fortes.map((p, i) => (
                    <p key={i} className="text-sm text-slate-600 pl-4">• {p}</p>
                  ))}
                </div>
              )}

              {analise.pontos_de_atencao?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> Pontos de Atenção
                  </p>
                  {analise.pontos_de_atencao.map((p, i) => (
                    <p key={i} className="text-sm text-slate-600 pl-4">• {p}</p>
                  ))}
                </div>
              )}

              {analise.lacunas?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mb-2">
                    <XCircle className="w-3.5 h-3.5" /> Lacunas
                  </p>
                  {analise.lacunas.map((p, i) => (
                    <p key={i} className="text-sm text-slate-600 pl-4">• {p}</p>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1">Justificativa</p>
                  <p className="text-sm text-slate-700">{analise.justificativa}</p>
                </div>
                {analise.recomendacao_para_recrutador && (
                  <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg">
                    <p className="text-xs font-semibold text-primary-700 mb-1">💡 Recomendação para o recrutador</p>
                    <p className="text-sm text-primary-800">{analise.recomendacao_para_recrutador}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA CURRÍCULO ── */}
      {tab === 'curriculo' && (
        <div className="space-y-4">
          {uploadErro && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{uploadErro}</p>
            </div>
          )}

          {/* Zona de upload */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">
                {candidato.cv_filename ? 'Substituir Currículo' : 'Enviar Currículo (PDF)'}
              </h3>
              {candidato.cv_filename && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <CheckCircle className="w-3.5 h-3.5" /> PDF salvo
                </span>
              )}
            </div>

            {uploadCV.isPending ? (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" /> Enviando e processando PDF...
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragging ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                }`}
              >
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">
                  {candidato.cv_filename ? 'Arraste um novo PDF para substituir' : 'Arraste o PDF aqui ou clique para selecionar'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Apenas .pdf — máximo 10 MB</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}

            {uploadCV.isSuccess && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5" /> Currículo enviado e indexado com sucesso!
              </div>
            )}
          </div>

          {/* Visualizador PDF */}
          {cvUrl ? (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 flex-1">
                  {candidato.cv_filename}
                </span>
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary-600 hover:underline"
                >
                  Abrir em nova aba ↗
                </a>
              </div>
              <iframe
                key={cvUrl}
                src={cvUrl}
                title="Currículo PDF"
                className="w-full bg-white"
                style={{ height: '75vh', minHeight: '500px', border: 'none' }}
              />
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">Nenhum currículo enviado ainda.</p>
              <p className="text-xs mt-1">Envie um PDF acima para visualizá-lo aqui.</p>
            </div>
          )}
        </div>
      )}

      {/* ── ABA HISTÓRICO ── */}
      {tab === 'historico' && (
        <div className="space-y-4 max-w-3xl">
          {/* Eventos agendados */}
          {eventosAgenda.length > 0 && (
            <div className="card space-y-2">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" /> Eventos Agendados ({eventosAgenda.length})
              </h3>
              {eventosAgenda.map((ev: any) => (
                <div key={ev.id} className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{ev.titulo}</p>
                    <p className="text-xs text-slate-500">{new Date(ev.inicio).toLocaleString('pt-BR')}</p>
                    {ev.local && <p className="text-xs text-indigo-600 mt-0.5">{ev.local}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Caixa de observação */}
          <div className="card space-y-3">
            <h3 className="font-semibold text-slate-800 text-sm">Adicionar Observação</h3>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Escreva uma observação sobre este candidato..."
              value={obsTexto}
              onChange={e => setObsTexto(e.target.value)}
            />
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => anexoRef.current?.click()}
                  disabled={uploadAnexoHist.isPending}
                  className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
                >
                  {uploadAnexoHist.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Paperclip className="w-3.5 h-3.5" />}
                  Anexar arquivo
                </button>
                <input
                  ref={anexoRef}
                  type="file"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) uploadAnexoHist.mutate(f)
                    e.target.value = ''
                  }}
                />
                {uploadAnexoHist.isSuccess && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Arquivo anexado
                  </span>
                )}
              </div>
              <button
                onClick={() => obsTexto.trim() && adicionarObs.mutate(obsTexto.trim())}
                disabled={adicionarObs.isPending || !obsTexto.trim()}
                className="btn-primary py-1.5 px-4 text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {adicionarObs.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />}
                Salvar
              </button>
            </div>
          </div>

          {/* Timeline */}
          {loadingHistorico ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando histórico...
            </div>
          ) : historico.length === 0 ? (
            <div className="card text-center py-12 text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Nenhuma atividade registrada ainda.</p>
            </div>
          ) : (
            <div className="relative space-y-0">
              {/* Linha vertical da timeline */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />
              {historico.map((entry: HistoricoEntry) => {
                const Icon = TIPO_ICON[entry.tipo] ?? Clock
                return (
                  <div key={entry.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {/* Ícone */}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${TIPO_COLOR[entry.tipo] ?? 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 card py-3 px-4 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-medium text-slate-800">{entry.titulo}</p>
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {new Date(entry.criado_em).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {entry.texto && (
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{entry.texto}</p>
                      )}
                      {entry.arquivo_nome && (
                        <a
                          href={historicoService.urlAnexo(candidatoId, entry.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-primary-600 hover:underline"
                        >
                          <Paperclip className="w-3 h-3" /> {entry.arquivo_nome}
                        </a>
                      )}
                      <p className="text-xs text-slate-400 mt-1.5">por {entry.criado_por}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Enviar Teste Prático */}
      <Modal open={modalTeste} onClose={() => setModalTeste(false)} title="Enviar Teste Prático por E-mail" size="lg">
        <div className="space-y-4">
          {testeMsg && (
            <div className={`flex items-start gap-3 p-3 rounded-xl border ${testeMsg.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              {testeMsg.ok
                ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
              <p className={`text-sm ${testeMsg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{testeMsg.texto}</p>
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <ClipboardList className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Destinatário: {candidato?.nome}</p>
              <p className="opacity-80">{candidato?.email}</p>
            </div>
          </div>

          <div>
            <label className="label">Link do Teste *</label>
            <input
              className="input"
              placeholder="https://plataforma.com/teste/abc123"
              value={linkTeste}
              onChange={e => setLinkTeste(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">URL que o candidato vai acessar para realizar o teste</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prazo para entrega *</label>
              <input
                className="input"
                type="datetime-local"
                value={prazoTeste}
                onChange={e => setPrazoTeste(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Plataforma <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input
                className="input"
                placeholder="Ex: HackerRank, TestGorilla"
                value={plataforma}
                onChange={e => setPlataforma(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Instruções adicionais <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Ex: Utilize sua linguagem de preferência. Tempo máximo: 2 horas. Leia o enunciado com atenção."
              value={instrucoes}
              onChange={e => setInstrucoes(e.target.value)}
            />
          </div>

          {/* Preview do e-mail */}
          {linkTeste && prazoTeste && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <p className="font-semibold text-slate-700 mb-1">Preview do e-mail:</p>
              <p>Assunto: 📝 Teste Prático — {candidato?.vaga_id ? 'vaga associada' : 'em aberto'}</p>
              <p className="mt-1 opacity-70">O e-mail incluirá: link do teste, prazo formatado{plataforma ? `, plataforma (${plataforma})` : ''}{instrucoes ? ' e instruções.' : '.'}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button className="btn-secondary" onClick={() => setModalTeste(false)}>Cancelar</button>
            <button
              className="btn-primary bg-amber-600 hover:bg-amber-700 border-amber-600 flex items-center gap-2"
              onClick={() => enviarTeste.mutate()}
              disabled={!linkTeste.trim() || !prazoTeste || enviarTeste.isPending}
            >
              {enviarTeste.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                : <><Send className="w-4 h-4" /> Enviar Teste por E-mail</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Mover Pipeline */}
      <Modal open={modalPipeline} onClose={() => setModalPipeline(false)} title="Mover no Pipeline">
        <div className="space-y-4">
          <div>
            <label className="label">Nova Etapa</label>
            <select
              className="input"
              value={etapaNova}
              onChange={e => setEtapaNova(e.target.value as EtapaPipeline)}
            >
              {ETAPAS_ORDEM.map(e => (
                <option key={e} value={e}>{LABEL_ETAPA[e]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Observação (opcional)</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Ex: Aprovado na triagem técnica, agendar entrevista RH"
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button className="btn-secondary" onClick={() => setModalPipeline(false)}>Cancelar</button>
            <button
              className="btn-primary"
              onClick={() => mover.mutate()}
              disabled={mover.isPending}
            >
              {mover.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Movendo...</>
                : <><ArrowRightLeft className="w-4 h-4" /> Mover Candidato</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
