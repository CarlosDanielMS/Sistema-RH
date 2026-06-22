import api from './api'

export interface HistoricoEntry {
  id: number
  candidato_id: number
  tipo: 'observacao' | 'arquivo' | 'pipeline' | 'analise_ia' | 'cv_upload'
  titulo: string
  texto: string | null
  arquivo_nome: string | null
  criado_por: string | null
  criado_em: string
}

export const historicoService = {
  listar: (candidatoId: number) =>
    api.get<HistoricoEntry[]>(`/candidatos/${candidatoId}/historico`).then(r => r.data),

  adicionarObservacao: (candidatoId: number, texto: string, criado_por = 'Recrutador') =>
    api.post<HistoricoEntry>(`/candidatos/${candidatoId}/historico/observacao`, { texto, criado_por }).then(r => r.data),

  uploadAnexo: (candidatoId: number, file: File, criado_por = 'Recrutador') => {
    const form = new FormData()
    form.append('arquivo', file)
    form.append('criado_por', criado_por)
    return api.post<HistoricoEntry>(
      `/candidatos/${candidatoId}/historico/arquivo`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ).then(r => r.data)
  },

  urlAnexo: (candidatoId: number, histId: number) => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    return `${base}/candidatos/${candidatoId}/historico/${histId}/arquivo`
  },
}
