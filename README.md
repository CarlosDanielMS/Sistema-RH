# RH-IA Platform

Plataforma de recrutamento e seleção inteligente com análise de currículos por IA, pipeline Kanban e automações via n8n.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Stack Tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Instalação e Execução](#instalação-e-execução)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Páginas e Funcionalidades](#páginas-e-funcionalidades)
- [API — Endpoints](#api--endpoints)
- [Fluxos Principais](#fluxos-principais)
- [Controle de Acesso RBAC](#controle-de-acesso-rbac)
- [Integrações](#integrações)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Melhorias Implementadas](#melhorias-implementadas)
- [Notas de Produção](#notas-de-produção)

---

## Visão Geral

O **RH-IA Platform** automatiza a triagem de candidatos usando IA (Groq + LLaMA 3.3), armazena embeddings semânticos dos currículos (ChromaDB), gerencia o pipeline de seleção em Kanban com drag & drop, envia notificações automáticas por e-mail e integra com n8n para automações avançadas.

```
Candidato → Formulário Público → Upload CV → Análise IA (score) → Pipeline → E-mail automático
```

---

## Stack Tecnológica

| Camada         | Tecnologia                                               |
|----------------|----------------------------------------------------------|
| Backend        | FastAPI 0.115.9 + SQLAlchemy 2.0 + Pydantic 2.10         |
| Banco de dados | PostgreSQL 16                                            |
| Embeddings     | ChromaDB 1.0 + HuggingFace (paraphrase-multilingual)     |
| LLM            | Groq API — LLaMA 3.3 70B Versatile                       |
| Auth           | JWT (python-jose) + bcrypt 4.0.1 (passlib)               |
| Frontend       | React 18 + TypeScript + Vite + TailwindCSS               |
| State          | TanStack Query (React Query) v5                          |
| Formulários    | React Hook Form + Zod                                    |
| Calendário     | FullCalendar 6                                           |
| Drag & Drop    | react-beautiful-dnd 13                                   |
| Gráficos       | Recharts                                                 |
| Automações     | n8n (Docker, profile opcional)                           |
| Containers     | Docker Compose                                           |

---

## Arquitetura

```
┌─────────────────────────────────────────────────┐
│                  Frontend (React)                │
│   ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│   │ Páginas  │  │ Services │  │ React Query  │  │
│   └──────────┘  └──────────┘  └──────────────┘  │
└────────────────────────┬────────────────────────┘
                         │ HTTP (Axios + JWT)
┌────────────────────────▼────────────────────────┐
│               Backend (FastAPI)                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│   │  Routes  │  │ Services │  │    Models    │  │
│   └──────────┘  └──────────┘  └──────────────┘  │
└────┬──────────────────┬──────────────┬───────────┘
     │                  │              │
┌────▼─────┐  ┌─────────▼──────┐  ┌───▼──────────┐
│PostgreSQL│  │   ChromaDB     │  │  Groq API    │
│  (dados) │  │ (embeddings)   │  │  (LLM/IA)    │
└──────────┘  └────────────────┘  └──────────────┘
                         │
              ┌──────────▼──────────┐
              │     n8n (opcional)  │
              │ (webhooks, e-mail)  │
              └─────────────────────┘
```

---

## Instalação e Execução

### Pré-requisitos

- Docker Desktop instalado e rodando
- Conta Groq gratuita: https://console.groq.com

### 1. Configure o `.env`

```env
GROQ_API_KEY=gsk_...          # obrigatório
SMTP_HOST=smtp.gmail.com      # opcional — e-mails automáticos
SMTP_USER=seu@email.com
SMTP_PASSWORD=senhaDeApp      # Gmail: Senha de App (sem espaços)
EMPRESA_NOME=Minha Empresa
SCORE_APROVADO=80
SCORE_PENDENTE=50
```

### 2. Suba os containers

```bash
# Sistema completo (sem n8n)
docker compose up -d

# Com n8n para automações
docker compose --profile n8n up -d
```

### 3. Acesse

| Serviço     | URL                         |
|-------------|-----------------------------|
| Frontend    | http://localhost:3001        |
| Backend API | http://localhost:8000        |
| API Docs    | http://localhost:8000/docs   |
| n8n         | http://localhost:5678        |

### 4. Credenciais padrão

| Perfil  | E-mail       | Senha    |
|---------|--------------|----------|
| Admin   | admin@rh.com | admin123 |
| Usuário | user@rh.com  | user123  |

> ⚠️ Altere as senhas em produção via `/admin/usuarios`.

---

## Variáveis de Ambiente

| Variável         | Obrigatória | Padrão                   | Descrição                              |
|------------------|-------------|--------------------------|----------------------------------------|
| `GROQ_API_KEY`   | ✅ Sim       | —                        | Chave Groq (começa com `gsk_`)         |
| `GROQ_MODEL`     | Não          | llama-3.3-70b-versatile  | Modelo LLM                             |
| `DATABASE_URL`   | Docker*      | postgresql://rh_user:... | URL PostgreSQL                         |
| `CHROMA_HOST`    | Docker*      | chromadb                 | Host ChromaDB                          |
| `CHROMA_PORT`    | Docker*      | 8000                     | Porta interna ChromaDB                 |
| `SMTP_HOST`      | Não          | —                        | Servidor SMTP                          |
| `SMTP_PORT`      | Não          | 587                      | Porta SMTP                             |
| `SMTP_USER`      | Não          | —                        | Usuário SMTP                           |
| `SMTP_PASSWORD`  | Não          | —                        | Senha SMTP (App Password p/ Gmail)     |
| `SMTP_TLS`       | Não          | true                     | Habilitar TLS                          |
| `EMPRESA_NOME`   | Não          | RH-IA Platform           | Nome nos e-mails                       |
| `SCORE_APROVADO` | Não          | 80                       | Score mínimo para "aprovado"           |
| `SCORE_PENDENTE` | Não          | 50                       | Score mínimo para "análise humana"     |
| `UPLOAD_DIR`     | Docker*      | /app/data/curriculos     | Diretório de PDFs                      |
| `N8N_WEBHOOK_URL`| Não          | —                        | URL base do n8n                        |
| `JWT_SECRET`     | ⚠️ Prod     | rh-ia-secret-key-2026... | Segredo JWT — **troque em produção!**  |

\* Configurados automaticamente pelo `docker-compose.yml`.

---

## Páginas e Funcionalidades

### `/dashboard` — Dashboard

Visão executiva do processo seletivo:
- Métricas: vagas abertas, total candidatos, com CV, aprovados/reprovados pela IA, score médio
- **Funil do pipeline**: barras horizontais com contagem por etapa, coloridas por tipo
- **Alertas de atenção**: candidatos sem CV e sem vaga vinculada (bloqueiam a análise IA)
- **Últimas Análises IA**: lista com score e classificação, clicável
- **Candidatos Recentes**: últimos 6 cadastrados com badge "Sem CV"
- Candidatos por vaga (gráfico de barras)

---

### `/vagas` e `/vagas/nova` — Vagas

Listagem com filtro por status e busca. Formulário com validação Zod:
- Título, descrição, requisitos obrigatórios/desejáveis
- Senioridade (estágio → gestão), modelo de trabalho, localização, faixa salarial
- Responsável, status (aberta / pausada / encerrada)

---

### `/candidatos` — Candidatos

Tabela com filtros por nome/email, vaga e etapa do pipeline.

**Ações disponíveis:**
- 🔬 **Analisar com IA** por candidato (ícone na linha, desabilitado sem CV/vaga)
- ⚡ **Analisar em lote**: processa todos com CV + vaga sem score ainda
- 📥 **Exportar CSV**: download filtrado, compatível com Excel (UTF-8 + BOM)

---

### `/candidatos/:id` — Detalhe do Candidato

4 abas:

**Dados** — informações pessoais, score de aderência, ações rápidas:
- Alertas visuais quando CV ou vaga estão faltando
- Botões: Analisar com IA, Mover no Pipeline, Registrar Decisão

**Análise IA** — resultado completo:
- Score 0–100 com barra visual
- Pontos fortes (verde), pontos de atenção (âmbar), lacunas (vermelho)
- Justificativa e recomendação para o recrutador
- Botão re-analisar
- Pré-requisitos checklist quando análise ainda não foi feita

**Currículo** — gestão do PDF:
- Zona drag & drop para upload/substituição
- Arquivo anterior é deletado automaticamente ao substituir
- Visualizador embutido em `<iframe>` com altura total
- Link "Abrir em nova aba"

**Histórico** — timeline completa:
- Eventos da Agenda vinculados ao candidato
- Observações manuais do recrutador
- Upload de arquivos extras com download
- Movimentos de pipeline (automático)
- Análises IA (automático)
- Upload de CV (automático)

---

### `/pipeline` — Pipeline Kanban

7 colunas: Triado → Entrevista RH → Entrevista Técnica → Teste Prático → Oferta → Contratado → Reprovado

**Funcionalidades:**
- **Drag & drop** para mover candidatos (react-beautiful-dnd)
- **Optimistic update**: card move visualmente antes da resposta do servidor
- **Toast de confirmação** ao mover com sucesso ou erro
- **Urgência temporal** (HR niche):
  - 7–13 dias na etapa: borda âmbar + ícone ⏰
  - ≥14 dias: borda vermelha + ícone ⚠️ (candidato parado)
  - Contagem total de urgentes no cabeçalho
- Cards mostram: nome, email, vaga associada, score IA, dias na etapa
- Filtro por vaga ou "todos os candidatos"
- Colunas vazias mostram zona de drop com "Arraste aqui"

---

### `/decisoes` — Diário de Decisões

Registro auditável de cada decisão, exigível para compliance e análise de vieses.

**Tipos de decisão:**
- Aprovado — Entrevista RH / Técnica / Teste Prático
- Proposta Enviada, Contratado
- Reprovado — Triagem / Entrevista
- Processo Encerrado

**Campos:** candidato, vaga, tipo, justificativa (mín. 20 chars), prós, contras, responsável, nível de confiança (0–1), estado emocional.

**Relatório PDF:** abre nova janela com documento formatado contendo:
- Score e classificação IA do candidato
- Justificativa completa com barras de confiança
- Prós/contras como badges coloridos
- Linha de assinatura do responsável
- Botão "Imprimir / Salvar como PDF"

---

### `/agenda` — Agenda

Calendário mensal/semanal/diário/lista (FullCalendar).

**Ao criar evento com candidato vinculado:**
1. Título auto-preenchido: `[Tipo] — [Nome do Candidato]`
2. E-mail do candidato auto-inserido em "Participantes"
3. Checkbox "Enviar e-mail de confirmação"
4. Preview do destinatário antes de salvar

**Ao salvar:**
- Registra no histórico do candidato
- Envia e-mail com tipo, data, local e descrição (se checkbox marcado)
- Evento aparece na aba Histórico do candidato

Eventos com candidato vinculado exibem ícone 👤 no calendário.

---

### `/marketing` — Marketing & Notificações

Templates de e-mail automático por etapa do pipeline.

**Variáveis disponíveis nos templates:**
- `$nome` — primeiro nome do candidato
- `$nome_completo` — nome completo
- `$vaga` — título da vaga
- `$empresa` — nome da empresa (`EMPRESA_NOME`)
- `$data_entrevista` — data formatada
- `$link_entrevista` — link/local
- `$responsavel` — responsável pela vaga
- `$email_rh` — e-mail do RH

**Ações:** toggle ativo/inativo, editar, preview com variáveis renderizadas, teste SMTP.

**Histórico:** todos os envios com status (enviado/falhou), destinatário e mensagem de erro.

---

### `/admin/logs` — Monitor do Sistema *(Admin only)*

- Status em tempo real: PostgreSQL, ChromaDB, Groq API (latência em ms)
- Alerta contextual: instrução exata para corrigir cada problema (ex: `gsk_` vs `xai-`, porta errada)
- Métricas do banco: candidatos, com CV, analisados, vagas
- Requests HTTP: total, 4xx, 5xx, latência média desde último restart
- Buffer de 500 logs com filtro por nível e busca por texto
- Auto-refresh configurável (10s)

---

### `/admin/usuarios` — Usuários *(Admin only)*

CRUD completo de contas do sistema.

**Ações:**
- Criar: nome, e-mail, senha, perfil (admin/user)
- Editar: qualquer campo + ativar/desativar conta
- Redefinir senha: admin não precisa da senha atual
- Excluir: com confirmação (não pode excluir a própria conta)

---

### `/vagas-abertas` — Portal de Vagas *(Público, sem login)*

Página externa para candidatos. Funcionalidades:
- Hero com busca por cargo, tecnologia ou local
- Cards com badges de modelo (Remoto/Presencial/Híbrido), senioridade, localização, faixa salarial
- "Ver mais": expande descrição completa
- "Candidatar-se": navega para `/candidatura?vaga=<id>`

---

### `/candidatura` — Auto-Candidatura *(Público, sem login)*

Formulário de candidatura com triagem automática por IA.

**Fluxo:**
1. Candidato seleciona vaga, preenche dados, faz upload do CV em PDF
2. Sistema extrai texto, gera embeddings, analisa com IA
3. **Score ≥ 50**: entra no sistema como "Triado" + e-mail de confirmação
4. **Score < 50**: candidato não entra no sistema + e-mail de feedback construtivo
5. n8n é notificado para automações adicionais

---

## API — Endpoints

### Autenticação `/auth`

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/auth/login` | ❌ | Login OAuth2 — retorna JWT |
| GET | `/auth/me` | ✅ | Dados do usuário autenticado |
| PUT | `/auth/me/senha` | ✅ | Alterar própria senha |
| GET | `/auth/usuarios` | 🔐 Admin | Listar todos os usuários |
| POST | `/auth/usuarios` | 🔐 Admin | Criar usuário |
| PUT | `/auth/usuarios/{id}` | 🔐 Admin | Atualizar dados do usuário |
| PUT | `/auth/usuarios/{id}/senha` | 🔐 Admin | Redefinir senha sem senha atual |
| DELETE | `/auth/usuarios/{id}` | 🔐 Admin | Excluir usuário |

### Candidatos `/candidatos`

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/candidatos/` | Criar candidato (entra como "triado") |
| GET | `/candidatos/` | Listar com filtros: vaga_id, etapa, skip, limit |
| GET | `/candidatos/{id}` | Obter candidato |
| PUT | `/candidatos/{id}` | Atualizar (nome, email, telefone, linkedin, vaga_id) |
| DELETE | `/candidatos/{id}` | Excluir + remove CV do disco + remove embedding ChromaDB |
| POST | `/candidatos/upload-cv/{id}` | Upload PDF → extrai texto → indexa ChromaDB |
| GET | `/candidatos/{id}/cv` | Servir PDF inline (Content-Disposition: inline) |
| POST | `/candidatos/{id}/analisar` | Análise IA: RAG + Groq → score + classificação |
| POST | `/candidatos/analisar-lote` | Analisa todos com CV + vaga sem score |
| GET | `/candidatos/{id}/historico` | Timeline completa do candidato |
| POST | `/candidatos/{id}/historico/observacao` | Adicionar observação manual |
| POST | `/candidatos/{id}/historico/arquivo` | Upload de anexo (max 20MB) |
| GET | `/candidatos/{id}/historico/{hist_id}/arquivo` | Download de anexo |

### Vagas `/vagas`

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/vagas/` | Criar vaga |
| GET | `/vagas/` | Listar (filtro opcional: status) |
| GET | `/vagas/{id}` | Obter vaga |
| PUT | `/vagas/{id}` | Atualizar vaga |
| DELETE | `/vagas/{id}` | Excluir vaga |

### Pipeline `/pipeline`

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/pipeline/stats` | Distribuição por etapa (funil global) |
| GET | `/pipeline/todos` | Kanban com todos os candidatos + criado_em |
| GET | `/pipeline/vaga/{id}` | Kanban filtrado por vaga |
| PUT | `/pipeline/candidato/{id}/mover` | Mover etapa + registra histórico + notifica |
| POST | `/pipeline/candidato/{id}/observacao` | Observação sem mover |
| GET | `/pipeline/candidato/{id}/historico` | Histórico de movimentos |

### Agenda `/eventos`

| Método | Path | Param | Descrição |
|--------|------|-------|-----------|
| POST | `/eventos/` | `enviar_email=true` | Criar evento + registra histórico + envia e-mail |
| GET | `/eventos/` | `candidato_id`, `tipo`, `inicio`, `fim` | Listar eventos |
| GET | `/eventos/candidato/{id}` | — | Eventos de um candidato |
| GET | `/eventos/{id}` | — | Obter evento |
| PUT | `/eventos/{id}` | `enviar_email=false` | Atualizar evento |
| DELETE | `/eventos/{id}` | — | Excluir evento |

### Marketing `/marketing`

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/marketing/templates` | Listar templates |
| GET | `/marketing/templates/{etapa}` | Template de uma etapa |
| PUT | `/marketing/templates/{etapa}` | Atualizar template |
| POST | `/marketing/templates/{etapa}/preview` | Preview com dados reais |
| POST | `/marketing/enviar-template/{etapa}` | Envio manual por etapa |
| GET | `/marketing/smtp-status` | Status SMTP sem expor credenciais |
| POST | `/marketing/testar-smtp` | Envio de e-mail de teste |
| GET | `/marketing/notificacoes` | Histórico de envios |
| GET | `/marketing/stats` | Métricas: taxa sucesso, por etapa/canal |

### Webhooks / Público `/webhooks`

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/webhooks/candidatar` | Candidatura pública: upload PDF + análise + filtro score |
| GET | `/webhooks/vagas-abertas` | Vagas abertas (sem autenticação) |
| POST | `/webhooks/email-candidato` | Receber candidato via n8n (texto do CV) |
| POST | `/webhooks/teste-pipeline` | Simular notificação de pipeline |
| GET | `/webhooks/status` | Status integração n8n |

### Administração `/admin`

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/admin/status` | Status serviços + métricas + config ativa |
| GET | `/admin/logs` | Buffer de logs (params: nivel, limit, busca) |
| DELETE | `/admin/logs` | Limpar buffer + contadores |

---

## Fluxos Principais

### 1. Candidatura Pública Self-Service

```
Candidato → /vagas-abertas → escolhe vaga → /candidatura?vaga=X
  → preenche form + upload PDF
  → POST /webhooks/candidatar
  → extrai texto do PDF (pdfplumber)
  → gera embedding (HuggingFace multilingual)
  → indexa no ChromaDB
  → análise IA (Groq LLaMA 3.3)
  → score ≥ 50: salva como Triado + e-mail boas-vindas
  → score < 50: deleta candidato + e-mail feedback
  → notifica n8n: POST {N8N_WEBHOOK_URL}/candidatura-resultado
```

### 2. Análise IA de Currículo (fluxo completo)

```
Recrutador faz upload do PDF
  → POST /candidatos/upload-cv/{id}
  → pdfplumber extrai texto
  → sanitização LGPD (remove CPF, endereço, etc.)
  → HuggingFace gera embedding 384-dim
  → ChromaDB armazena (cosine similarity)
  → banco: cv_filename, cv_texto, chroma_doc_id

Recrutador clica "Analisar com IA"
  → POST /candidatos/{id}/analisar
  → ChromaDB recupera trechos mais relevantes para a vaga (RAG)
  → prompt = vaga + trechos semânticos do currículo
  → Groq: JSON { score, classificacao, pontos_fortes, pontos_de_atencao, lacunas, justificativa }
  → safety net: reclassifica se score não bate com threshold
  → salva no banco
  → registra no histórico (tipo: analise_ia)
```

### 3. Pipeline com Notificação Automática

```
Recrutador arrasta card no Kanban
  → PUT /pipeline/candidato/{id}/mover { etapa_nova, responsavel, observacao }
  → atualiza candidato.etapa_pipeline
  → PipelineHistorico criado
  → CandidatoHistorico criado (tipo: pipeline)
  → busca TemplateNotificacao ativo para a etapa
  → se ativo + canal_email: renderiza template ($nome, $vaga, etc.)
  → envia e-mail SMTP
  → Notificacao salva no banco (status: enviado | falhou)
  → se N8N_WEBHOOK_URL: dispara webhook
  → frontend: toast de sucesso
```

### 4. Agenda → E-mail ao Candidato

```
Recrutador cria evento com candidato vinculado (enviar_email=true)
  → POST /eventos/
  → evento salvo no banco
  → _processar_candidato() chamado:
    → CandidatoHistorico criado (tipo: observacao, criado_por: "Agenda")
    → notificar_agendamento() envia e-mail com tipo/data/local
    → Notificacao salva
  → evento aparece em /candidatos/:id > aba Histórico
```

---

## Controle de Acesso RBAC

### Perfis

| Perfil | Acesso |
|--------|--------|
| **Admin** | Tudo: gestão de usuários, Monitor/Logs, todas as funções |
| **Usuário** | Recrutamento completo (sem Monitor/Logs e sem gestão de usuários) |

### JWT

Token válido por **24 horas**.

```json
{
  "sub": "1",
  "role": "admin",
  "nome": "Administrador",
  "exp": 1782236942
}
```

Enviado no header: `Authorization: Bearer <token>`

### Proteção no Frontend

```tsx
// AdminGuard — redireciona para /dashboard se não for admin
<Route path="/admin/logs"     element={<AdminGuard><AdminLogs /></AdminGuard>} />
<Route path="/admin/usuarios" element={<AdminGuard><Usuarios /></AdminGuard>} />
```

---

## Integrações

### Groq API

- **Modelo padrão**: `llama-3.3-70b-versatile`
- **Uso**: análise de currículos + recomendações ao recrutador
- **Limite free**: ~30 req/min — suficiente para uso normal
- **Chave**: https://console.groq.com/keys (começa com `gsk_`)

### ChromaDB

- **Versão servidor**: 1.4.4 (Go server) — porta interna: 8000
- **Versão cliente Python**: 1.0.0
- **Modelo de embedding**: `paraphrase-multilingual-MiniLM-L12-v2` (384 dimensões, local)
- **Persistência**: `./data/chroma/` (volume Docker)

### Gmail SMTP

1. Ative Verificação em 2 etapas na conta Google
2. Acesse: Conta Google → Segurança → Senhas de app
3. Crie uma senha para "Email" → copie os 16 caracteres
4. Cole em `SMTP_PASSWORD=abcdwxyzefghijkl` (**sem espaços**)

Nota: o backend remove espaços automaticamente, mas o melhor é salvar sem eles.

### n8n

Workflow importável em `n8n-flow-candidatura.json`:

**Nó 1** — Webhook Trigger: `POST /webhook/candidatura-resultado`

Payload recebido:
```json
{
  "status": "aprovado",
  "score": 87,
  "classificacao": "aprovado",
  "candidato_id": 42,
  "nome": "João Silva",
  "email": "joao@email.com",
  "vaga_titulo": "Dev Python Pleno",
  "empresa": "Minha Empresa"
}
```

**Nó 2** — IF: `status == "aprovado"`

**Ramo verdadeiro:**
- Registra observação no histórico do candidato (HTTP Request → backend)
- Envia e-mail HTML de boas-vindas

**Ramo falso:**
- Envia e-mail HTML de feedback construtivo

---

## Estrutura de Arquivos

```
rh-ia-platform/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   ├── candidato.py      # Candidato, StatusTriagem
│   │   │   ├── vaga.py           # Vaga, StatusVaga, Senioridade, ModeloTrabalho
│   │   │   ├── pipeline.py       # PipelineHistorico, ETAPAS_PIPELINE
│   │   │   ├── decisao.py        # Decisao
│   │   │   ├── evento.py         # Evento, TipoEvento
│   │   │   ├── notificacao.py    # TemplateNotificacao, Notificacao, Entrevista
│   │   │   ├── historico.py      # CandidatoHistorico, TipoHistorico
│   │   │   └── usuario.py        # Usuario, RoleUsuario
│   │   ├── routes/
│   │   │   ├── candidatos.py     # CRUD + upload CV + análise IA + histórico
│   │   │   ├── vagas.py          # CRUD vagas
│   │   │   ├── pipeline.py       # Kanban + mover + stats
│   │   │   ├── marketing.py      # Templates + SMTP + histórico
│   │   │   ├── eventos.py        # Agenda + notificação automática
│   │   │   ├── decisoes.py       # Diário de decisões
│   │   │   ├── analises.py       # Análise de vieses
│   │   │   ├── notificacoes.py   # Templates detalhados
│   │   │   ├── historico.py      # Timeline + anexos
│   │   │   ├── webhooks.py       # Candidatura pública + n8n
│   │   │   ├── auth.py           # Login JWT + gestão de usuários
│   │   │   └── admin.py          # Monitor + logs
│   │   ├── services/
│   │   │   ├── candidato_analyzer.py  # RAG + Groq → JSON score
│   │   │   ├── rag_service.py         # ChromaDB: indexar, buscar, remover
│   │   │   ├── cv_parser.py           # pdfplumber + sanitização LGPD
│   │   │   ├── notification_service.py # SMTP + WhatsApp n8n + agendamento
│   │   │   └── decision_service.py    # Análise de vieses em decisões
│   │   ├── schemas/              # Pydantic schemas (input/output)
│   │   ├── config.py             # Settings (pydantic-settings + .env)
│   │   ├── database.py           # Engine SQLAlchemy + create_tables()
│   │   └── main.py               # App FastAPI + lifespan + middleware
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── MainLayout.tsx    # Layout autenticado + guard
│   │   │   │   └── Sidebar.tsx       # Navegação com seções e role-based items
│   │   │   └── ui/
│   │   │       ├── Toast.tsx         # Sistema de notificações toast
│   │   │       ├── Modal.tsx         # Modal reutilizável (sm/md/lg)
│   │   │       ├── ScoreBar.tsx      # Barra visual de score
│   │   │       ├── Skeleton.tsx      # Loading skeleton
│   │   │       └── Badge.tsx         # Badge estilizado
│   │   ├── hooks/
│   │   │   └── useAuth.ts            # JWT: login, logout, role, isAdmin
│   │   ├── pages/                    # 20 páginas React
│   │   ├── routes/
│   │   │   └── index.tsx             # React Router + AdminGuard
│   │   ├── services/
│   │   │   ├── api.ts                # Axios base + interceptors JWT
│   │   │   ├── candidatosService.ts
│   │   │   ├── vagasService.ts
│   │   │   ├── pipelineService.ts
│   │   │   ├── agendaService.ts
│   │   │   ├── historicoService.ts
│   │   │   ├── decisoesService.ts
│   │   │   └── (marketing, notificacoes via api direto)
│   │   ├── types/index.ts            # TypeScript types globais
│   │   └── utils/
│   │       ├── helpers.ts            # Labels, formatadores, scoreColor, cn()
│   │       └── relatorio.ts          # Gerador de relatório PDF (window.print)
│   ├── tailwind.config.js
│   └── vite.config.ts
├── infra/
│   └── init.sql                  # Schema inicial PostgreSQL
├── data/
│   ├── curriculos/               # PDFs enviados (volume Docker)
│   └── chroma/                   # Embeddings ChromaDB (volume Docker)
├── n8n-flow-candidatura.json     # Workflow n8n importável
├── docker-compose.yml
├── .env                          # Credenciais locais (não versionar!)
└── README.md
```

---

## Melhorias Implementadas

### Sistema de Toast Notifications (`Toast.tsx`)

Componente global sem dependência externa:
- 4 tipos: `success` (verde), `error` (vermelho), `warning` (âmbar), `info` (azul)
- Auto-dismiss em 4 segundos
- Máximo de 5 toasts simultâneos (fila circular)
- Animação `fade-in` com Tailwind keyframes
- Botão de fechar manual
- Integrado via `ToastProvider` no `App.tsx`

Aplicado nas mutations:
- Salvar candidato, excluir candidato
- Criar/editar vaga
- Análise IA individual e em lote
- Mover no pipeline

### Urgência Temporal no Pipeline (HR Niche)

Indicador visual de candidatos parados em etapas:
- Backend: `criado_em` incluído no payload do pipeline
- Frontend: calcula dias na etapa em tempo real
- **7–13 dias**: borda âmbar + ícone `Clock` amarelo
- **≥14 dias**: borda vermelha + ícone `AlertTriangle` vermelho
- Cabeçalho mostra contagem total de urgentes
- Legenda explicativa abaixo do título

### Correções TypeScript

- Removidos 2x `as any` em `NovaVaga.tsx` — `vagasService` agora tipado corretamente
- `PipelineItem.criado_em?: string` adicionado ao type
- `PipelineItem.vaga_id?: number` corretamente opcional
- Mutations com tipagem forte em onSuccess/onError

---

## Notas de Produção

1. **JWT_SECRET**: defina um segredo aleatório forte (≥32 chars) — o padrão é apenas para desenvolvimento
2. **Senhas padrão**: altere `admin123` e `user123` imediatamente após o primeiro acesso
3. **Backups**: faça backup periódico de `./data/curriculos/` e `./data/chroma/`
4. **CORS**: restrinja `allow_origins=["https://seu-dominio.com"]` no `main.py`
5. **HTTPS**: use nginx/traefik como reverse proxy com certificado SSL (Let's Encrypt)
6. **Groq rate limits**: plano gratuito: ~30 req/min — considere o plano pago para volumes maiores
7. **Volume do Docker**: remova `- ./backend:/app` do `docker-compose.yml` em produção (código no image, não montado)
8. **n8n**: altere `N8N_BASIC_AUTH_USER` e `N8N_BASIC_AUTH_PASSWORD` no docker-compose

---

## Licença

Projeto educacional — Curso de Inovação 2026/1 · Carlos Daniel Martins da Silva
