import { TIPOS_DECISAO, LABEL_ETAPA, LABEL_CLASSIFICACAO } from './helpers'
import type { EtapaPipeline } from '../types'

interface RelatorioDados {
  decisao: {
    id: number
    tipo_decisao: string
    justificativa: string
    responsavel: string
    nivel_confianca: number
    estado_emocional?: string
    pros?: string[]
    contras?: string[]
    criado_em: string
  }
  candidato?: { nome: string; email: string; telefone?: string; linkedin?: string; etapa_pipeline: string; score_aderencia?: number; status_triagem: string }
  vaga?: { titulo: string; descricao?: string; senioridade?: string; modelo_trabalho?: string; localizacao?: string; faixa_salarial?: string }
  empresa?: string
}

export function gerarRelatorioDecisao(dados: RelatorioDados) {
  const { decisao, candidato, vaga, empresa = 'RH-IA Platform' } = dados

  const tipoLabel = TIPOS_DECISAO.find(t => t.value === decisao.tipo_decisao)?.label ?? decisao.tipo_decisao
  const isPositivo = decisao.tipo_decisao.startsWith('aprovado') || decisao.tipo_decisao === 'contratado' || decisao.tipo_decisao === 'proposta_enviada'
  const corDecisao = isPositivo ? '#059669' : '#dc2626'
  const bgDecisao  = isPositivo ? '#d1fae5' : '#fee2e2'

  const scoreLabel = candidato?.score_aderencia != null
    ? `${candidato.score_aderencia}/100`
    : '—'

  const classificacaoLabel = candidato
    ? (LABEL_CLASSIFICACAO[candidato.status_triagem as keyof typeof LABEL_CLASSIFICACAO]?.label ?? candidato.status_triagem)
    : '—'

  const etapaLabel = candidato
    ? (LABEL_ETAPA[candidato.etapa_pipeline as EtapaPipeline] ?? candidato.etapa_pipeline)
    : '—'

  const dataFormatada = new Date(decisao.criado_em).toLocaleString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const pros   = decisao.pros?.filter(Boolean) ?? []
  const contras = decisao.contras?.filter(Boolean) ?? []

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório de Decisão #${decisao.id} — ${candidato?.nome ?? 'Candidato'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }

    /* Header */
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 28px; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-box { width: 36px; height: 36px; background: #6366f1; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 16px; }
    .logo-text h2 { font-size: 16px; font-weight: 700; color: #1e293b; }
    .logo-text p { font-size: 11px; color: #64748b; }
    .doc-info { text-align: right; }
    .doc-info .doc-id { font-size: 18px; font-weight: 700; color: #6366f1; }
    .doc-info .doc-date { font-size: 11px; color: #64748b; margin-top: 2px; }

    /* Decision badge */
    .decision-banner { background: ${bgDecisao}; border-left: 5px solid ${corDecisao}; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; gap: 14px; }
    .decision-banner .badge { background: ${corDecisao}; color: #fff; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 20px; white-space: nowrap; }
    .decision-banner .by { font-size: 12px; color: #475569; }
    .decision-banner .by strong { color: #1e293b; }

    /* Sections */
    .section { margin-bottom: 22px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6366f1; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { background: #f8fafc; border-radius: 6px; padding: 10px 14px; }
    .field-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 3px; }
    .field-value { font-size: 13px; color: #1e293b; font-weight: 500; }
    .field-value.muted { color: #64748b; font-weight: 400; }

    /* Justificativa */
    .justificativa { background: #f8fafc; border-radius: 8px; padding: 16px 18px; line-height: 1.7; color: #334155; }

    /* Pros/Contras */
    .tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag-pro  { background: #d1fae5; color: #065f46; font-size: 12px; padding: 4px 12px; border-radius: 20px; }
    .tag-con  { background: #fee2e2; color: #991b1b; font-size: 12px; padding: 4px 12px; border-radius: 20px; }

    /* Score */
    .score-bar-wrap { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-top: 6px; }
    .score-bar-fill { height: 100%; border-radius: 4px; background: ${(candidato?.score_aderencia ?? 0) >= 80 ? '#10b981' : (candidato?.score_aderencia ?? 0) >= 50 ? '#f59e0b' : '#ef4444'}; width: ${Math.min(candidato?.score_aderencia ?? 0, 100)}%; }

    /* Confiança */
    .confianca-bar-wrap { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-top: 6px; }
    .confianca-bar-fill { height: 100%; border-radius: 4px; background: #6366f1; width: ${Math.round(decisao.nivel_confianca * 100)}%; }

    /* Footer */
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .footer p { font-size: 10px; color: #94a3b8; }
    .footer .assinatura { text-align: right; }
    .assinatura-linha { border-top: 1px solid #94a3b8; width: 180px; margin-top: 24px; padding-top: 6px; font-size: 11px; color: #64748b; text-align: center; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page { padding: 20px 24px; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo">
      <div class="logo-box">RH</div>
      <div class="logo-text">
        <h2>${empresa}</h2>
        <p>Diário de Decisões — Processo Seletivo</p>
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-id">Decisão #${decisao.id}</div>
      <div class="doc-date">${dataFormatada}</div>
    </div>
  </div>

  <!-- Decision Banner -->
  <div class="decision-banner">
    <span class="badge">${tipoLabel}</span>
    <div class="by">
      Registrada por <strong>${decisao.responsavel}</strong>
      ${decisao.estado_emocional ? `&nbsp;·&nbsp; Estado emocional: <strong>${decisao.estado_emocional}</strong>` : ''}
    </div>
  </div>

  <!-- Candidato e Vaga -->
  <div class="section">
    <div class="section-title">Candidato & Vaga</div>
    <div class="grid-2">
      <div class="field">
        <div class="field-label">Candidato</div>
        <div class="field-value">${candidato?.nome ?? '—'}</div>
        ${candidato?.email ? `<div class="field-value muted">${candidato.email}</div>` : ''}
        ${candidato?.telefone ? `<div class="field-value muted">${candidato.telefone}</div>` : ''}
      </div>
      <div class="field">
        <div class="field-label">Vaga</div>
        <div class="field-value">${vaga?.titulo ?? '—'}</div>
        ${vaga?.senioridade ? `<div class="field-value muted">${vaga.senioridade} · ${vaga.modelo_trabalho ?? ''} ${vaga.localizacao ? '· ' + vaga.localizacao : ''}</div>` : ''}
        ${vaga?.faixa_salarial ? `<div class="field-value muted">${vaga.faixa_salarial}</div>` : ''}
      </div>
    </div>
  </div>

  <!-- Análise IA -->
  ${candidato?.score_aderencia != null ? `
  <div class="section">
    <div class="section-title">Análise da IA</div>
    <div class="grid-2">
      <div class="field">
        <div class="field-label">Score de Aderência</div>
        <div class="field-value">${scoreLabel}</div>
        <div class="score-bar-wrap"><div class="score-bar-fill"></div></div>
      </div>
      <div class="field">
        <div class="field-label">Classificação IA</div>
        <div class="field-value">${classificacaoLabel}</div>
        <div class="field-label" style="margin-top:8px">Etapa no Pipeline</div>
        <div class="field-value">${etapaLabel}</div>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Justificativa -->
  <div class="section">
    <div class="section-title">Justificativa da Decisão</div>
    <div class="justificativa">${decisao.justificativa.replace(/\n/g, '<br/>')}</div>
  </div>

  <!-- Pros e Contras -->
  ${(pros.length > 0 || contras.length > 0) ? `
  <div class="section">
    <div class="section-title">Pontos Registrados</div>
    <div class="tags">
      ${pros.map(p => `<span class="tag-pro">+ ${p}</span>`).join('')}
      ${contras.map(c => `<span class="tag-con">− ${c}</span>`).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Nível de Confiança -->
  <div class="section">
    <div class="section-title">Indicadores de Qualidade</div>
    <div class="grid-2">
      <div class="field">
        <div class="field-label">Nível de Confiança do Recrutador</div>
        <div class="field-value">${Math.round(decisao.nivel_confianca * 100)}%</div>
        <div class="confianca-bar-wrap"><div class="confianca-bar-fill"></div></div>
      </div>
      <div class="field">
        <div class="field-label">Aviso de Conformidade</div>
        <div class="field-value muted" style="font-size:11px;line-height:1.5">
          Esta decisão foi registrada com justificativa documentada, em conformidade com práticas de recrutamento responsável e LGPD.
        </div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>
      <p>Gerado por ${empresa} · ${new Date().toLocaleString('pt-BR')}</p>
      <p>Documento interno — uso restrito ao time de RH</p>
    </div>
    <div class="assinatura">
      <div class="assinatura-linha">${decisao.responsavel}</div>
    </div>
  </div>

  <!-- Botão de impressão (some ao imprimir) -->
  <div class="no-print" style="text-align:center;margin-top:32px">
    <button onclick="window.print()" style="background:#6366f1;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">
      Imprimir / Salvar como PDF
    </button>
  </div>

</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}
