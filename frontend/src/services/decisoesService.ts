import api from './api'
import type { Decisao } from '../types'

export const decisoesService = {
  listar: () => api.get<Decisao[]>('/decisoes/').then(r => r.data),
  porCandidato: (id: number) => api.get<Decisao[]>(`/decisoes/candidato/${id}`).then(r => r.data),
  porVaga: (id: number) => api.get<Decisao[]>(`/decisoes/vaga/${id}`).then(r => r.data),
  criar: (data: Omit<Decisao, 'id' | 'criado_em'>) =>
    api.post<Decisao>('/decisoes/', data).then(r => r.data),
  sugerirProsContras: (justificativa: string, tipo_decisao: string) =>
    api.post('/decisoes/sugerir-pros-contras', null, { params: { justificativa, tipo_decisao } }).then(r => r.data),
  excluir: (id: number) => api.delete(`/decisoes/${id}`),
}
