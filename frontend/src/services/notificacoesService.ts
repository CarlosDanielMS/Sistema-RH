import api from './api'

export interface Template {
  id: number
  etapa: string
  assunto_email: string
  corpo_email: string
  ativo: boolean
  canal_email: boolean
  canal_whatsapp: boolean
  atualizado_em: string
}

export interface Notificacao {
  id: number
  candidato_id: number
  vaga_id: number
  etapa: string
  canal: string
  destinatario: string
  assunto?: string
  mensagem: string
  status: string
  erro?: string
  enviado_em: string
}

export interface Entrevista {
  id: number
  candidato_id: number
  vaga_id: number
  tipo: string
  data_hora: string
  duracao_minutos: number
  local_ou_link?: string
  responsavel?: string
  observacoes?: string
  status: string
  notificacao_enviada: boolean
  criado_em: string
}

export const notificacoesService = {
  listarTemplates: () =>
    api.get<Template[]>('/notificacoes/templates').then(r => r.data),

  atualizarTemplate: (etapa: string, payload: Partial<Template>) =>
    api.put<Template>(`/notificacoes/templates/${etapa}`, payload).then(r => r.data),

  historico: (params?: { candidato_id?: number; status?: string }) =>
    api.get<Notificacao[]>('/notificacoes/historico', { params }).then(r => r.data),

  testarWebhook: (candidato_id: number, etapa: string) =>
    api.post('/webhooks/teste-pipeline', { candidato_id, etapa }).then(r => r.data),

  statusWebhook: () =>
    api.get('/webhooks/status').then(r => r.data),
}
