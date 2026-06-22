import api from './api'
import type { RelatorioVieses } from '../types'

export const analisesService = {
  geral: () => api.get<RelatorioVieses>('/analises/vieses').then(r => r.data),
  porVaga: (vagaId: number) => api.get<RelatorioVieses>(`/analises/vaga/${vagaId}`).then(r => r.data),
}
