import api from './api'
import type { PipelineVaga, HistoricoMovimentacao, EtapaPipeline } from '../types'

export const pipelineService = {
  stats: () =>
    api.get<{ funil: Record<string, number>; total: number }>('/pipeline/stats').then(r => r.data),

  todos: () =>
    api.get<PipelineVaga>('/pipeline/todos').then(r => r.data),

  porVaga: (vagaId: number) =>
    api.get<PipelineVaga>(`/pipeline/vaga/${vagaId}`).then(r => r.data),

  mover: (candidatoId: number, etapa_nova: EtapaPipeline, responsavel: string, observacao?: string) =>
    api.put(`/pipeline/candidato/${candidatoId}/mover`, { etapa_nova, responsavel, observacao }).then(r => r.data),

  observacao: (candidatoId: number, observacao: string, responsavel: string) =>
    api.post(`/pipeline/candidato/${candidatoId}/observacao`, { observacao, responsavel }).then(r => r.data),

  historico: (candidatoId: number) =>
    api.get<HistoricoMovimentacao[]>(`/pipeline/candidato/${candidatoId}/historico`).then(r => r.data),
}
