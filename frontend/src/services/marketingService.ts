import api from './api'

export interface Template {
  id: number; etapa: string; assunto_email: string; corpo_email: string
  ativo: boolean; canal_email: boolean; canal_whatsapp: boolean; atualizado_em: string
}
export interface Notificacao {
  id: number; candidato_id: number; vaga_id: number; etapa: string
  canal: string; destinatario: string; assunto?: string; mensagem: string
  status: string; erro?: string; enviado_em: string
}
export interface Entrevista {
  id: number; candidato_id: number; vaga_id: number; tipo: string
  data_hora: string; duracao_minutos: number; local_ou_link?: string
  responsavel?: string; observacoes?: string; status: string
  notificacao_enviada: boolean; criado_em: string
}
export interface MarketingStats {
  total: number; sucesso: number; falhas: number; taxa: number
  por_etapa: Record<string, number>; por_canal: Record<string, number>
  entrevistas_agendadas: number
}

export const marketingService = {
  templates: {
    listar: () => api.get<Template[]>('/marketing/templates').then(r => r.data),
    atualizar: (etapa: string, data: Partial<Template>) =>
      api.put<Template>(`/marketing/templates/${etapa}`, data).then(r => r.data),
    preview: (etapa: string, candidatoId: number) =>
      api.post(`/marketing/templates/${etapa}/preview`, null, { params: { candidato_id: candidatoId } }).then(r => r.data),
  },
  notificacoes: {
    listar: () => api.get<Notificacao[]>('/marketing/notificacoes').then(r => r.data),
    porCandidato: (id: number) => api.get<Notificacao[]>(`/marketing/notificacoes/candidato/${id}`).then(r => r.data),
    enviarManual: (data: { candidato_id: number; vaga_id: number; etapa: string }) =>
      api.post('/marketing/enviar-manual', data).then(r => r.data),
  },
  entrevistas: {
    listar: (params?: { candidato_id?: number; vaga_id?: number }) =>
      api.get<Entrevista[]>('/marketing/entrevistas', { params }).then(r => r.data),
    agendar: (data: Omit<Entrevista, 'id' | 'criado_em' | 'notificacao_enviada' | 'status'>) =>
      api.post<Entrevista>('/marketing/entrevistas', data).then(r => r.data),
    cancelar: (id: number) => api.delete(`/marketing/entrevistas/${id}`),
  },
  stats: () => api.get<MarketingStats>('/marketing/stats').then(r => r.data),
}
