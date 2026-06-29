import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Eye, Brain, Loader2, Pencil, Download, Zap,
  Star, Archive, ChevronLeft, ChevronRight, Tag,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { candidatosService } from '../services/candidatosService'
import { vagasService } from '../services/vagasService'
import { LABEL_CLASSIFICACAO, LABEL_ETAPA, formatDate, scoreColor } from '../utils/helpers'
import { useToast } from '../components/ui/Toast'
import api from '../services/api'
import type { EtapaPipeline } from '../types'

const POR_PAGINA = 15

export function Candidatos() {
  const qc = useQueryClient()
  const toast = useToast()
  const [search, setSearch]         = useState('')
  const [filtroVaga, setFiltroVaga] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [filtroView, setFiltroView] = useState<'ativos' | 'favoritos' | 'talentos'>('ativos')
  const [pagina, setPagina]         = useState(1)
  const [loteMsg, setLoteMsg]       = useState<string | null>(null)

  const { data: candidatos = [], isLoading } = useQuery({
    queryKey: ['candidatos'],
    queryFn: () => candidatosService.listar(),
  })

  const { data: talentos = [] } = useQuery({
    queryKey: ['banco-talentos'],
    queryFn: () => api.get('/candidatos/banco-de-talentos').then(r => r.data),
    enabled: filtroView === 'talentos',
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

  const toggleFavorito = useMutation({
    mutationFn: (id: number) => api.put(`/candidatos/${id}/favorito`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidatos'] }),
    onError: () => toast.error('Falha ao atualizar favorito'),
  })

  // Fonte de dados
  const fonte = filtroView === 'talentos' ? talentos : candidatos

  const filtrados = fonte.filter(c =>
    (!search || c.nome.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())) &&
    (!filtroVaga  || String(c.vaga_id) === filtroVaga) &&
    (!filtroEtapa || c.etapa_pipeline === filtroEtapa) &&
    (filtroView !== 'favoritos' || c.favorito)
  )

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA)
  const paginados    = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const prontosPraAnalise = candidatos.filter(c => c.cv_filename && c.vaga_id && !c.score_aderencia).length

  function exportarCSV() {
    const header = ['ID', 'Nome', 'Email', 'Telefone', 'Vaga', 'Etapa', 'Score IA', 'Classificação', 'Favorito', 'Tags', 'Cadastrado em']
    const rows = filtrados.map(c => {
      const vaga = vagas.find(v => v.id === c.vaga_id)
      return [
        c.id, c.nome, c.email, c.telefone || '', vaga?.titulo || '',
        LABEL_ETAPA[c.etapa_pipeline as EtapaPipeline] || c.etapa_pipeline,
        c.score_aderencia ?? '',
        LABEL_CLASSIFICACAO[c.status_triagem]?.label || c.status_triagem,
        c.favorito ? 'Sim' : 'Não',
        c.tags ? JSON.parse(c.tags || '[]').join('; ') : '',
        new Date(c.criado_em).toLocaleDateString('pt-BR'),
      ]
    })
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `candidatos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
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
            <button onClick={() => analisarLote.mutate()} disabled={analisarLote.isPending}
              className="btn-secondary flex items-center gap-1.5 text-sm text-violet-600 border-violet-200 hover:bg-violet-50">
              {analisarLote.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</> : <><Zap className="w-4 h-4" /> Analisar {prontosPraAnalise} com IA</>}
            </button>
          )}
          <button onClick={exportarCSV} className="btn-secondary flex items-center gap-1.5 text-sm" title="Exportar CSV">
            <Download className="w-4 h-4" /> CSV
          </button>
          <Link to="/candidatos/novo" className="btn-primary">
            <Plus className="w-4 h-4" /> Novo Candidato
          </Link>
        </div>
      </div>

      {/* Tabs de visualização */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: 'ativos',    label: 'Todos',              icon: null },
          { key: 'favoritos', label: `⭐ Favoritos (${candidatos.filter(c => c.favorito).length})`, icon: null },
          { key: 'talentos',  label: '🏦 Banco de Talentos', icon: null },
        ] as { key: 'ativos' | 'favoritos' | 'talentos'; label: string; icon: null }[]).map(({ key, label }) => (
          <button key={key} onClick={() => { setFiltroView(key); setPagina(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtroView === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {filtroView === 'talentos' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
          <Archive className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p><strong>Banco de Talentos</strong> — candidatos reprovados que podem ser reaproveitados em vagas futuras. Edite e vincule a uma nova vaga para reativar.</p>
        </div>
      )}

      {/* Filtros */}
      <div className="card flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Nome ou e-mail..." value={search} onChange={e => { setSearch(e.target.value); setPagina(1) }} />
        </div>
        <select className="input w-44" value={filtroVaga} onChange={e => { setFiltroVaga(e.target.value); setPagina(1) }}>
          <option value="">Todas as vagas</option>
          {vagas.map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}
        </select>
        <select className="input w-44" value={filtroEtapa} onChange={e => { setFiltroEtapa(e.target.value); setPagina(1) }}>
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
                {['', 'Candidato', 'Vaga', 'Score IA', 'Classificação', 'Etapa', 'Tags', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginados.map(c => {
                const cfg  = LABEL_CLASSIFICACAO[c.status_triagem]
                const vaga = vagas.find(v => v.id === c.vaga_id)
                const tags = JSON.parse(c.tags || '[]') as string[]
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    {/* Favorito */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggleFavorito.mutate(c.id)}
                        className={`transition-colors ${c.favorito ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`}
                        title={c.favorito ? 'Remover favorito' : 'Marcar como favorito'}
                      >
                        <Star className="w-4 h-4" fill={c.favorito ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{c.nome}</p>
                      <p className="text-xs text-slate-400">{c.email}</p>
                      {!c.cv_filename && <span className="text-xs text-amber-500">Sem CV</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{vaga?.titulo || '—'}</td>
                    <td className="px-4 py-3">
                      {c.score_aderencia != null
                        ? <span className={`font-bold ${scoreColor(c.score_aderencia)}`}>{c.score_aderencia}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3"><span className={`badge ${cfg.color}`}>{cfg.label}</span></td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{LABEL_ETAPA[c.etapa_pipeline as EtapaPipeline]}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-xs bg-primary-50 text-primary-700 border border-primary-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Tag className="w-2.5 h-2.5" />{tag}
                          </span>
                        ))}
                        {tags.length > 3 && <span className="text-xs text-slate-400">+{tags.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/candidatos/${c.id}`} className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors" title="Ver">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link to={`/candidatos/${c.id}/editar`} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => analisar.mutate(c.id)}
                          disabled={analisar.isPending || !c.cv_filename || !c.vaga_id}
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={!c.cv_filename ? 'Sem currículo' : !c.vaga_id ? 'Sem vaga' : 'Analisar com IA'}
                        >
                          <Brain className="w-3.5 h-3.5" />
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
            {candidatos.length === 0 ? 'Nenhum candidato cadastrado ainda.' : 'Nenhum candidato com os filtros aplicados.'}
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, filtrados.length)} de {filtrados.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
              const pg = totalPaginas <= 5 ? i + 1 : pagina <= 3 ? i + 1 : pagina >= totalPaginas - 2 ? totalPaginas - 4 + i : pagina - 2 + i
              return (
                <button key={pg} onClick={() => setPagina(pg)}
                  className={`w-8 h-8 rounded-lg text-sm ${pg === pagina ? 'bg-primary-600 text-white' : 'border border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                  {pg}
                </button>
              )
            })}
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
