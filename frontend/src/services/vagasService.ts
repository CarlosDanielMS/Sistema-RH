import api from './api'
import type { Vaga } from '../types'

export const vagasService = {
  listar: (params?: { status_vaga?: string }) =>
    api.get<Vaga[]>('/vagas/', { params }).then(r => r.data),

  obter: (id: number) =>
    api.get<Vaga>(`/vagas/${id}`).then(r => r.data),

  criar: (data: Omit<Vaga, 'id' | 'criado_em' | 'atualizado_em'>) =>
    api.post<Vaga>('/vagas/', data).then(r => r.data),

  atualizar: (id: number, data: Partial<Vaga>) =>
    api.put<Vaga>(`/vagas/${id}`, data).then(r => r.data),

  excluir: (id: number) =>
    api.delete(`/vagas/${id}`),
}
