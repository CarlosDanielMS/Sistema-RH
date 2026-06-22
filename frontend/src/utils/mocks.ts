import type { Vaga, Candidato, Decisao, PipelineVaga, RelatorioVieses, DashboardStats } from '../types'

export const mockVagas: Vaga[] = [
  { id: 1, titulo: 'Desenvolvedor Python Pleno', descricao: 'Desenvolvimento de APIs REST com FastAPI.', requisitos_obrigatorios: 'Python 3.10+, FastAPI, PostgreSQL, Docker', 'requisitos_desejáveis': 'LangChain, ChromaDB', senioridade: 'pleno', modelo_trabalho: 'remoto', localizacao: 'Brasil', faixa_salarial: 'R$ 8.000 – R$ 12.000', status: 'aberta', responsavel: 'Ana Lima', criado_em: '2026-05-10T10:00:00Z', atualizado_em: '2026-05-10T10:00:00Z', total_candidatos: 12 },
  { id: 2, titulo: 'Analista de Dados Sênior', descricao: 'Análise e visualização de dados.', requisitos_obrigatorios: 'Python, SQL, Power BI ou Tableau', 'requisitos_desejáveis': 'Spark, dbt', senioridade: 'senior', modelo_trabalho: 'hibrido', localizacao: 'São Paulo, SP', faixa_salarial: 'R$ 12.000 – R$ 18.000', status: 'aberta', responsavel: 'Carlos Souza', criado_em: '2026-05-15T09:00:00Z', atualizado_em: '2026-05-15T09:00:00Z', total_candidatos: 8 },
  { id: 3, titulo: 'UX Designer Júnior', descricao: 'Design de interfaces e experiência do usuário.', requisitos_obrigatorios: 'Figma, prototipação, pesquisa com usuários', 'requisitos_desejáveis': 'Design System, CSS básico', senioridade: 'junior', modelo_trabalho: 'remoto', localizacao: 'Brasil', faixa_salarial: 'R$ 4.000 – R$ 6.000', status: 'aberta', responsavel: 'Beatriz Mendes', criado_em: '2026-05-20T14:00:00Z', atualizado_em: '2026-05-20T14:00:00Z', total_candidatos: 24 },
  { id: 4, titulo: 'DevOps Engineer', descricao: 'Infraestrutura, CI/CD e cloud.', requisitos_obrigatorios: 'Docker, Kubernetes, AWS ou GCP', 'requisitos_desejáveis': 'Terraform, Ansible', senioridade: 'pleno', modelo_trabalho: 'remoto', localizacao: 'Brasil', status: 'pausada', responsavel: 'Roberto Alves', criado_em: '2026-04-01T08:00:00Z', atualizado_em: '2026-05-01T08:00:00Z', total_candidatos: 5 },
]

export const mockCandidatos: Candidato[] = [
  { id: 1, nome: 'João Silva', email: 'joao@email.com', telefone: '11999990001', linkedin: 'linkedin.com/in/joaosilva', vaga_id: 1, status_triagem: 'aprovado', score_aderencia: 87, justificativa_ia: 'Candidato com forte aderência técnica. 5 anos de Python e FastAPI comprovados.', etapa_pipeline: 'entrevista_tecnica', criado_em: '2026-05-22T10:00:00Z' },
  { id: 2, nome: 'Maria Oliveira', email: 'maria@email.com', telefone: '11999990002', vaga_id: 1, status_triagem: 'analise_humana', score_aderencia: 64, justificativa_ia: 'Experiência parcial com a stack. Conhece Python mas não Docker.', etapa_pipeline: 'entrevista_rh', criado_em: '2026-05-23T11:00:00Z' },
  { id: 3, nome: 'Pedro Costa', email: 'pedro@email.com', telefone: '11999990003', vaga_id: 2, status_triagem: 'aprovado', score_aderencia: 92, justificativa_ia: 'Excelente perfil analítico. Domínio avançado de SQL e Python.', etapa_pipeline: 'oferta', criado_em: '2026-05-21T09:00:00Z' },
  { id: 4, nome: 'Ana Santos', email: 'ana@email.com', vaga_id: 3, status_triagem: 'reprovado', score_aderencia: 31, justificativa_ia: 'Perfil ainda em formação. Lacunas significativas em prototipação e pesquisa.', etapa_pipeline: 'reprovado', criado_em: '2026-05-24T15:00:00Z' },
  { id: 5, nome: 'Lucas Ferreira', email: 'lucas@email.com', telefone: '11999990005', vaga_id: 1, status_triagem: 'pendente', etapa_pipeline: 'triado', criado_em: '2026-05-25T08:00:00Z' },
  { id: 6, nome: 'Carla Nunes', email: 'carla@email.com', vaga_id: 2, status_triagem: 'aprovado', score_aderencia: 78, etapa_pipeline: 'entrevista_rh', criado_em: '2026-05-24T16:00:00Z' },
]

export const mockPipeline: PipelineVaga = {
  vaga_id: 1,
  titulo_vaga: 'Desenvolvedor Python Pleno',
  etapas: {
    triado:             [{ candidato_id: 5, nome: 'Lucas Ferreira', email: 'lucas@email.com', status_triagem: 'pendente' }],
    entrevista_rh:      [{ candidato_id: 2, nome: 'Maria Oliveira', email: 'maria@email.com', score_aderencia: 64, status_triagem: 'analise_humana' }],
    entrevista_tecnica: [{ candidato_id: 1, nome: 'João Silva', email: 'joao@email.com', score_aderencia: 87, status_triagem: 'aprovado' }],
    teste_pratico:      [],
    oferta:             [],
    contratado:         [],
    reprovado:          [{ candidato_id: 4, nome: 'Ana Santos', email: 'ana@email.com', score_aderencia: 31, status_triagem: 'reprovado' }],
  },
}

export const mockDecisoes: Decisao[] = [
  { id: 1, candidato_id: 1, vaga_id: 1, tipo_decisao: 'aprovado_entrevista_tecnica', responsavel: 'Ana Lima', justificativa: 'Excelente performance técnica na entrevista de Python e arquitetura.', pros: ['Domínio técnico excepcional', 'Boa comunicação', 'Alinhado com a cultura'], contras: ['Sem experiência com ChromaDB'], estado_emocional: 'confiante', nivel_confianca: 0.92, criado_em: '2026-05-26T14:00:00Z' },
  { id: 2, candidato_id: 4, vaga_id: 3, tipo_decisao: 'reprovado_triagem', responsavel: 'Beatriz Mendes', justificativa: 'Perfil muito inicial para o nível de senioridade exigido.', pros: ['Entusiasmo e vontade de aprender'], contras: ['Sem portfólio', 'Sem experiência profissional'], estado_emocional: 'neutro', nivel_confianca: 0.85, criado_em: '2026-05-25T16:00:00Z' },
  { id: 3, candidato_id: 3, vaga_id: 2, tipo_decisao: 'proposta_enviada', responsavel: 'Carlos Souza', justificativa: 'Candidato se destacou em todas as etapas. Proposta alinhada com expectativa.', pros: ['Top performer do processo', 'Disponibilidade imediata'], contras: ['Pediu home office total'], estado_emocional: 'animado', nivel_confianca: 0.95, criado_em: '2026-05-28T10:00:00Z' },
]

export const mockRelatorio: RelatorioVieses = {
  metricas: {
    total_candidatos: 49,
    total_decisoes: 31,
    aprovados_ia: 22,
    reprovados_ia: 15,
    pendentes_ia: 12,
    score_medio_ia: 68.4,
    reprovados_humano: 8,
    aprovados_humano: 23,
    decisoes_sem_justificativa_clara: 3,
    distribuicao_etapas: { triado: 8, entrevista_rh: 12, entrevista_tecnica: 7, teste_pratico: 4, oferta: 3, contratado: 2, reprovado: 13 },
    confianca_media_por_tipo: { aprovado_entrevista_rh: 0.82, reprovado_triagem: 0.75, contratado: 0.94 },
  },
  analise: '**Análise geral do processo seletivo:**\n\n1. **Padrões identificados**: Alta taxa de reprovação na etapa de triagem (26% dos candidatos). O score médio da IA é 68,4, indicando que a maioria dos candidatos possui aderência parcial.\n\n2. **Riscos de viés**: 3 decisões de reprovação foram registradas sem justificativa clara, o que pode indicar critérios subjetivos não documentados.\n\n3. **Diferença IA vs humano**: A IA aprova 45% dos candidatos; humanos aprovam 47%. Alinhamento razoável, com divergência de ~2%.\n\n4. **Recomendações**: (1) Exigir justificativa mínima de 50 caracteres para reprovações; (2) Revisar os 3 casos sem justificativa; (3) Aumentar pool de candidatos nas vagas com score médio abaixo de 60.',
}

export const mockDashboard: DashboardStats = {
  vagasAbertas: 3,
  totalCandidatos: 49,
  aprovadosIA: 22,
  pendentesHumano: 12,
  reprovadosIA: 15,
  decisoesRegistradas: 31,
  alertasVieses: 3,
}
