import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Brain, Loader2, Briefcase, Clock, AlertTriangle } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pipelineService } from '../services/pipelineService'
import { vagasService } from '../services/vagasService'
import { ETAPAS_ORDEM, LABEL_ETAPA, scoreColor } from '../utils/helpers'
import { useToast } from '../components/ui/Toast'
import type { PipelineItem, EtapaPipeline, PipelineVaga, Vaga } from '../types'

const ETAPA_COLORS: Record<EtapaPipeline, string> = {
  triado:             'border-t-slate-400',
  entrevista_rh:      'border-t-blue-400',
  entrevista_tecnica: 'border-t-violet-500',
  teste_pratico:      'border-t-amber-400',
  oferta:             'border-t-emerald-400',
  contratado:         'border-t-emerald-600',
  reprovado:          'border-t-red-400',
}

const ETAPA_DROP_BG: Record<EtapaPipeline, string> = {
  triado:             'bg-slate-50',
  entrevista_rh:      'bg-blue-50',
  entrevista_tecnica: 'bg-violet-50',
  teste_pratico:      'bg-amber-50',
  oferta:             'bg-emerald-50',
  contratado:         'bg-emerald-100',
  reprovado:          'bg-red-50',
}

const TODOS = 0

/** Retorna { dias, urgente, alerta } com base em quantos dias o candidato está na etapa */
function diasNaEtapa(criadoEm?: string): { dias: number; urgente: boolean; alerta: boolean } {
  if (!criadoEm) return { dias: 0, urgente: false, alerta: false }
  const dias = Math.floor((Date.now() - new Date(criadoEm).getTime()) / 86_400_000)
  return { dias, urgente: dias >= 14, alerta: dias >= 7 && dias < 14 }
}

function KanbanCard({ item, vagas, snapshot, provided }: {
  item: PipelineItem
  vagas: Vaga[]
  snapshot: { isDragging: boolean }
  provided: { innerRef: (el: HTMLElement | null) => void; draggableProps: object; dragHandleProps: object | null }
}) {
  const vaga = vagas.find(v => v.id === item.vaga_id)
  const { dias, urgente, alerta } = diasNaEtapa(item.criado_em)

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={`bg-white rounded-lg border p-3 transition-shadow cursor-grab active:cursor-grabbing ${
        snapshot.isDragging
          ? 'shadow-lg border-primary-200 rotate-1'
          : urgente
          ? 'border-red-300 shadow-sm hover:shadow-card-hover'
          : alerta
          ? 'border-amber-200 shadow-sm hover:shadow-card-hover'
          : 'border-slate-200 shadow-sm hover:shadow-card-hover'
      }`}
    >
      <Link
        to={`/candidatos/${item.candidato_id}`}
        onClick={e => snapshot.isDragging && e.preventDefault()}
        className="block"
      >
        <div className="flex items-start gap-2 mb-1.5">
          <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary-600">{item.nome.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 truncate leading-tight">{item.nome}</p>
            <p className="text-xs text-slate-400 truncate">{item.email}</p>
          </div>
        </div>

        {vaga && (
          <div className="flex items-center gap-1 mb-1.5">
            <Briefcase className="w-3 h-3 text-slate-300 flex-shrink-0" />
            <p className="text-xs text-slate-500 truncate">{vaga.titulo}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-1.5">
          {item.score_aderencia != null ? (
            <div className="flex items-center gap-1">
              <Brain className="w-3 h-3 text-slate-300" />
              <span className={`text-xs font-semibold ${scoreColor(item.score_aderencia)}`}>
                {item.score_aderencia}
              </span>
            </div>
          ) : <span />}

          {/* Tempo na etapa */}
          {dias > 0 && (
            <div className={`flex items-center gap-0.5 text-xs font-medium ${
              urgente ? 'text-red-500' : alerta ? 'text-amber-500' : 'text-slate-400'
            }`}>
              {urgente && <AlertTriangle className="w-3 h-3" />}
              {!urgente && <Clock className="w-3 h-3" />}
              <span>{dias}d</span>
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}

export function Pipeline() {
  const [vagaId, setVagaId] = useState<number>(TODOS)
  const qc = useQueryClient()
  const toast = useToast()

  const { data: vagas = [], isLoading: loadingVagas } = useQuery({
    queryKey: ['vagas'],
    queryFn: () => vagasService.listar(),
  })

  const { data: pipeline, isLoading: loadingPipeline } = useQuery<PipelineVaga>({
    queryKey: ['pipeline', vagaId],
    queryFn: () => vagaId === TODOS ? pipelineService.todos() : pipelineService.porVaga(vagaId),
  })

  const mover = useMutation({
    mutationFn: ({ candidatoId, etapa }: { candidatoId: number; etapa: EtapaPipeline }) =>
      pipelineService.mover(candidatoId, etapa, 'Recrutador'),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pipeline', vagaId] })
      qc.invalidateQueries({ queryKey: ['candidatos'] })
      toast.success(`Candidato movido para ${LABEL_ETAPA[vars.etapa]}`)
    },
    onError: () => toast.error('Falha ao mover candidato. Tente novamente.'),
  })

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result
    if (!destination || destination.droppableId === source.droppableId) return

    const candidatoId = Number(draggableId)
    const etapaNova = destination.droppableId as EtapaPipeline

    // Optimistic update
    qc.setQueryData<PipelineVaga>(['pipeline', vagaId], (old) => {
      if (!old) return old
      const etapaOld = source.droppableId as EtapaPipeline
      const card = old.etapas[etapaOld]?.find(c => c.candidato_id === candidatoId)
      if (!card) return old
      return {
        ...old,
        etapas: {
          ...old.etapas,
          [etapaOld]: old.etapas[etapaOld].filter(c => c.candidato_id !== candidatoId),
          [etapaNova]: [...(old.etapas[etapaNova] || []), card],
        },
      }
    })

    mover.mutate({ candidatoId, etapa: etapaNova })
  }

  // Legenda de urgência
  const totalUrgentes = pipeline
    ? Object.values(pipeline.etapas).flat().filter(c => diasNaEtapa(c.criado_em).urgente).length
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Pipeline Kanban</h1>
          <p className="page-subtitle">
            Arraste os cards para mover candidatos entre etapas
            {totalUrgentes > 0 && (
              <span className="ml-2 text-xs font-semibold text-red-500">
                · {totalUrgentes} candidato{totalUrgentes > 1 ? 's' : ''} há mais de 14 dias na mesma etapa
              </span>
            )}
          </p>
        </div>
        {loadingVagas ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        ) : (
          <select
            className="input w-64"
            value={vagaId}
            onChange={e => setVagaId(Number(e.target.value))}
          >
            <option value={TODOS}>Todos os candidatos</option>
            {vagas.map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}
          </select>
        )}
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-slate-400" /> Dias na etapa</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-amber-300 bg-amber-50 inline-block" /> 7–13 dias</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-red-300 bg-white inline-block" /> ≥14 dias — atenção</span>
      </div>

      {loadingPipeline ? (
        <div className="flex items-center justify-center py-24 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando pipeline...
        </div>
      ) : !pipeline ? null : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max">
              {ETAPAS_ORDEM.map(etapa => {
                const cards = pipeline.etapas[etapa] || []
                return (
                  <div
                    key={etapa}
                    className={`w-52 flex flex-col rounded-xl border-t-4 ${ETAPA_COLORS[etapa]} border border-slate-100`}
                  >
                    <div className="px-3 pt-3 pb-2 bg-slate-50 rounded-t-xl">
                      <p className="text-xs font-semibold text-slate-700">{LABEL_ETAPA[etapa]}</p>
                      <span className="text-xs text-slate-400">{cards.length} candidato{cards.length !== 1 ? 's' : ''}</span>
                    </div>

                    <Droppable droppableId={etapa}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 px-2 pb-3 pt-2 space-y-2 min-h-24 rounded-b-xl transition-colors ${
                            snapshot.isDraggingOver ? ETAPA_DROP_BG[etapa] : 'bg-slate-50'
                          }`}
                        >
                          {cards.map((item, index) => (
                            <Draggable
                              key={item.candidato_id}
                              draggableId={String(item.candidato_id)}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <KanbanCard
                                  item={item}
                                  vagas={vagas}
                                  snapshot={snapshot}
                                  provided={provided}
                                />
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {cards.length === 0 && !snapshot.isDraggingOver && (
                            <div className="h-16 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg">
                              <p className="text-xs text-slate-300">Arraste aqui</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}
            </div>
          </div>
        </DragDropContext>
      )}
    </div>
  )
}
