import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Brain, Loader2, Pencil, Download, Zap } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { candidatosService } from '../services/candidatosService'
import { vagasService } from '../services/vagasService'
import { LABEL_CLASSIFICACAO, LABEL_ETAPA, formatDate, scoreColor } from '../utils/helpers'
import { useToast } from '../components/ui/Toast'
import type { EtapaPipeline } from '../types'

export function Candidatos() {
  const qc = useQueryClient()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [filtroVaga, setFiltroVaga] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [loteMsg, setLoteMsg] = useState<string | null>(null)

  const { data: candidatos = [], isLoading } = useQuery({
    queryKey: ['candidatos'],
    queryFn: () => candidatosService.listar(),
  })

  const { data: vagas = [] } = useQuery({
    queryKey: ['vagas'],
    queryFn: () => vagasService.listar(),
  })

  const analisar = useMutation({
    mutationFn: (id: number) => candidatosService.analisar(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['candidatos'] })
      toast.success(`Score: ${res.analise.score}/100 — ${res.analise.classificacao}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Falha na análise IA'),
  })

  const analisarLote = useMutation({
    mutationFn: () => candidatosService.analisarLote(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['candidatos'] })
      toast.success(`${res.total_analisados} analisado${res.total_analisados !== 1 ? 's' : ''}${res.total_erros > 0 ? `, ${res.total_erros} com erro` : ''}`)
      setLoteMsg(null)
    },
    onError: () => toast.error('Falha na análise em lote'),
  })

  const filtrados = candidatos.filter(c =>
    (!search || c.nome.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())) &&
    (!filtroVaga || String(c.vaga_id) === filtroVaga) &&
    (!filtroEtapa || c.etapa_pipeline === filtroEtapa)
  )

  const prontosPraAnalise = candidatos.filter(c => c.cv_filename && c.vaga_id && !c.score_aderencia).length

  function exportarCSV() {
    const header = ['ID', 'Nome', 'Email', 'Telefone', 'Vaga', 'Etapa', 'Score IA', 'Classificação', 'Cadastrado em']
    const rows = filtrados.map(c => {
      const vaga = vagas.find(v => v.id === c.vaga_id)
      return [
        c.id,
        c.nome,
        c.email,
        c.telefone || '',
        vaga?.titulo || '',
        LABEL_ETAPA[c.etapa_pipeline as EtapaPipeline] || c.etapa_pipeline,
        c.score_aderencia ?? '',
        LABEL_CLASSIFICACAO[c.status_triagem]?.label || c.status_triagem,
        new Date(c.criado_em).toLocaleDateString('pt-BR'),
      ]
    })
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `candidatos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Candidatos</h1>
          <p className="page-subtitle">{candidatos.length} candidatos cadastrados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {prontosPraAnalise > 0 && (
            <button
              onClick={() => analisarLote.mutate()}
              disabled={analisarLote.isPending}
              className="btn-secondary flex items-center gap-1.5 text-sm text-violet-600 border-violet-200 hover:bg-violet-50"
              title={`${prontosPraAnalise} candidatos prontos para análise`}
            >
              {analisarLote.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
                : <><Zap className="w-4 h-4" /> Analisar {prontosPraAnalise} com IA</>}
            </button>
          )}
          <button
            onClick={exportarCSV}
            className="btn-secondary flex items-center gap-1.5 text-sm"
            title="Exportar lista atual para CSV"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <Link to="/candidatos/novo" className="btn-primary">
            <Plus className="w-4 h-4" /> Novo Candidato
          </Link>
        </div>
      </div>

      {loteMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl">
          ✓ {loteMsg}
        </div>
      )}

      <div className="card flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={filtroVaga} onChange={e => setFiltroVaga(e.target.value)}>
          <option value="">Todas as vagas</option>
          {vagas.map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}
        </select>
        <select className="input w-44" value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}>
          <option value="">Todas as etapas</option>
          {(['triado','entrevista_rh','entrevista_tecnica','teste_pratico','oferta','contratado','reprovado'] as EtapaPipeline[]).map(e => (
            <option key={e} value={e}>{LABEL_ETAPA[e]}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando candidatos...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Candidato', 'Vaga', 'Score IA', 'Classificação', 'Etapa', 'Cadastrado em', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.map(c => {
                const cfg = LABEL_CLASSIFICACAO[c.status_triagem]
                const vaga = vagas.find(v => v.id === c.vaga_id)
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{c.nome}</p>
                      <p className="text-xs text-slate-400">{c.email}</p>
                      {!c.cv_filename && (
                        <span className="text-xs text-amber-500">Sem CV</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{vaga?.titulo || '—'}</td>
                    <td className="px-4 py-3">
                      {c.score_aderencia != null
                        ? <span className={`font-bold ${scoreColor(c.score_aderencia)}`}>{c.score_aderencia}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${cfg.color}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{LABEL_ETAPA[c.etapa_pipeline as EtapaPipeline]}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(c.criado_em)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/candidatos/${c.id}`} className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors" title="Ver detalhes">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link to={`/candidatos/${c.id}/editar`} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors" title="Editar candidato">
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => analisar.mutate(c.id)}
                          disabled={analisar.isPending || !c.cv_filename || !c.vaga_id}
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={!c.cv_filename ? 'Sem currículo' : !c.vaga_id ? 'Sem vaga' : 'Analisar com IA'}
                        >
                          <Brain className={`w-3.5 h-3.5 ${analisar.isPending ? 'animate-pulse' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!isLoading && filtrados.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            {candidatos.length === 0 ? 'Nenhum candidato cadastrado ainda.' : 'Nenhum candidato encontrado com os filtros aplicados.'}
          </div>
        )}
      </div>

      {filtrados.length > 0 && (
        <p className="text-xs text-slate-400 text-right">
          Mostrando {filtrados.length} de {candidatos.length} candidatos
          {filtroEtapa || filtroVaga || search ? ' (filtrados)' : ''}
        </p>
      )}
    </div>
  )
}
