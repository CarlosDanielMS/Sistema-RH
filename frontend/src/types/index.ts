export type StatusVaga = 'aberta' | 'pausada' | 'encerrada'
export type Senioridade = 'estagio' | 'junior' | 'pleno' | 'senior' | 'especialista' | 'gestao'
export type ModeloTrabalho = 'presencial' | 'remoto' | 'hibrido'
export type ClassificacaoIA = 'aprovado' | 'pendente' | 'reprovado'
export type StatusTriagem = 'pendente' | 'aprovado' | 'analise_humana' | 'reprovado'

export type EtapaPipeline =
  | 'triado'
  | 'entrevista_rh'
  | 'entrevista_tecnica'
  | 'teste_pratico'
  | 'oferta'
  | 'contratado'
  | 'reprovado'

export interface Vaga {
  id: number
  titulo: string
  descricao: string
  requisitos_obrigatorios: string
  'requisitos_desejáveis'?: string
  senioridade: Senioridade
  modelo_trabalho: ModeloTrabalho
  localizacao?: string
  faixa_salarial?: string
  status: StatusVaga
  responsavel: string
  criado_em: string
  atualizado_em: string
  total_candidatos?: number
}

export interface Candidato {
  id: number
  nome: string
  email: string
  telefone?: string
  linkedin?: string
  cv_filename?: string
  vaga_id?: number
  vaga?: Vaga
  status_triagem: StatusTriagem
  score_aderencia?: number
  justificativa_ia?: string
  etapa_pipeline: EtapaPipeline
  criado_em: string
}

export interface AnaliseIA {
  score: number
  classificacao: ClassificacaoIA
  pontos_fortes: string[]
  pontos_de_atencao: string[]
  lacunas: string[]
  justificativa: string
  recomendacao_para_recrutador: string
}

export interface ResultadoAnalise {
  candidato_id: number
  vaga_id: number
  analise: AnaliseIA
  latencia_s: number
  aviso: string
}

export interface PipelineItem {
  candidato_id: number
  nome: string
  email: string
  score_aderencia?: number
  status_triagem: StatusTriagem
  vaga_id?: number
  criado_em?: string
}

export interface PipelineVaga {
  vaga_id: number
  titulo_vaga: string
  etapas: Record<EtapaPipeline, PipelineItem[]>
}

export interface HistoricoMovimentacao {
  id: number
  candidato_id: number
  vaga_id: number
  etapa_anterior?: string
  etapa_nova: string
  responsavel?: string
  observacao?: string
  criado_em: string
}

export interface Decisao {
  id: number
  candidato_id: number
  vaga_id: number
  tipo_decisao: string
  responsavel: string
  justificativa: string
  pros?: string[]
  contras?: string[]
  estado_emocional?: string
  nivel_confianca: number
  criado_em: string
}

export interface MetricasVieses {
  total_candidatos: number
  total_decisoes: number
  aprovados_ia: number
  reprovados_ia: number
  pendentes_ia: number
  score_medio_ia: number
  reprovados_humano: number
  aprovados_humano: number
  decisoes_sem_justificativa_clara: number
  distribuicao_etapas: Record<string, number>
  confianca_media_por_tipo: Record<string, number>
}

export interface RelatorioVieses {
  vaga_id?: number
  metricas: MetricasVieses
  analise: string
}

export interface DashboardStats {
  vagasAbertas: number
  totalCandidatos: number
  aprovadosIA: number
  pendentesHumano: number
  reprovadosIA: number
  decisoesRegistradas: number
  alertasVieses: number
}
