import api from './api'

export interface Evento {
  id: number
  titulo: string
  descricao?: string
  tipo: 'entrevista' | 'reuniao' | 'prazo' | 'onboarding' | 'feedback' | 'outro'
  inicio: string
  fim?: string
  dia_inteiro: boolean
  local?: string
  participantes?: string
  cor?: string
  candidato_id?: number
  vaga_id?: number
  criado_em: string
  atualizado_em: string
}

export interface EventoCreate {
  titulo: string
  descricao?: string
  tipo: Evento['tipo']
  inicio: string
  fim?: string
  dia_inteiro?: boolean
  local?: string
  participantes?: string
  cor?: string
  candidato_id?: number
  vaga_id?: number
}

export const agendaService = {
  listar: (params?: { inicio?: string; fim?: string; tipo?: string; candidato_id?: number }) =>
    api.get<Evento[]>('/eventos', { params }).then(r => r.data),

  porCandidato: (candidatoId: number) =>
    api.get<Evento[]>(`/eventos/candidato/${candidatoId}`).then(r => r.data),

  criar: (payload: EventoCreate, enviarEmail = true) =>
    api.post<Evento>('/eventos', payload, { params: { enviar_email: enviarEmail } }).then(r => r.data),

  atualizar: (id: number, payload: Partial<EventoCreate>, enviarEmail = false) =>
    api.put<Evento>(`/eventos/${id}`, payload, { params: { enviar_email: enviarEmail } }).then(r => r.data),

  excluir: (id: number) =>
    api.delete(`/eventos/${id}`),
}
