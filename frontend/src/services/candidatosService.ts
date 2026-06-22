import api from './api'
import type { Candidato, ResultadoAnalise } from '../types'

export const candidatosService = {
  listar: (params?: { vaga_id?: number; etapa?: string }) =>
    api.get<Candidato[]>('/candidatos/', { params }).then(r => r.data),

  obter: (id: number) =>
    api.get<Candidato>(`/candidatos/${id}`).then(r => r.data),

  criar: (data: Pick<Candidato, 'nome' | 'email' | 'telefone' | 'linkedin' | 'vaga_id'>) =>
    api.post<Candidato>('/candidatos/', data).then(r => r.data),

  uploadCV: (candidatoId: number, file: File) => {
    const form = new FormData()
    form.append('arquivo', file)
    return api.post(`/candidatos/upload-cv/${candidatoId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  atualizar: (id: number, data: Pick<Candidato, 'nome' | 'email' | 'telefone' | 'linkedin' | 'vaga_id'>) =>
    api.put<Candidato>(`/candidatos/${id}`, data).then(r => r.data),

  excluir: (id: number) =>
    api.delete(`/candidatos/${id}`),

  analisarLote: () =>
    api.post<{ total_analisados: number; total_erros: number; resultados: any[] }>('/candidatos/analisar-lote').then(r => r.data),

  analisar: (id: number) =>
    api.post<ResultadoAnalise>(`/candidatos/${id}/analisar`).then(r => r.data),

  porVaga: (vagaId: number) =>
    api.get<Candidato[]>(`/candidatos/vaga/${vagaId}`).then(r => r.data),
}
