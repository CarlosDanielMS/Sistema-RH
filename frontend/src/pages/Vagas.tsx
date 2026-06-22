import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Pencil, Trash2, Users, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vagasService } from '../services/vagasService'
import { LABEL_STATUS_VAGA, LABEL_SENIORIDADE, LABEL_MODELO, formatDate } from '../utils/helpers'

export function Vagas() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const { data: vagas = [], isLoading } = useQuery({
    queryKey: ['vagas'],
    queryFn: () => vagasService.listar(),
  })

  const excluir = useMutation({
    mutationFn: (id: number) => vagasService.excluir(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vagas'] }),
  })

  const filtradas = vagas.filter(v =>
    (!search || v.titulo.toLowerCase().includes(search.toLowerCase())) &&
    (!filtroStatus || v.status === filtroStatus)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Vagas</h1>
          <p className="page-subtitle">{vagas.filter(v => v.status === 'aberta').length} vagas abertas</p>
        </div>
        <Link to="/vagas/nova" className="btn-primary">
          <Plus className="w-4 h-4" /> Nova Vaga
        </Link>
      </div>

      <div className="card flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar vaga..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="aberta">Aberta</option>
          <option value="pausada">Pausada</option>
          <option value="encerrada">Encerrada</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando vagas...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Vaga', 'Senioridade', 'Modelo', 'Localização', 'Candidatos', 'Status', 'Criada em', 'Ações'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtradas.map(v => {
                const st = LABEL_STATUS_VAGA[v.status]
                return (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{v.titulo}</p>
                      <p className="text-xs text-slate-400">{v.responsavel}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{LABEL_SENIORIDADE[v.senioridade]}</td>
                    <td className="px-4 py-3 text-slate-600">{LABEL_MODELO[v.modelo_trabalho]}</td>
                    <td className="px-4 py-3 text-slate-600">{v.localizacao || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Users className="w-3.5 h-3.5" /> {v.total_candidatos ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(v.criado_em)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link to={`/vagas/${v.id}`} className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors" title="Ver">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link to={`/vagas/${v.id}/editar`} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => { if (confirm('Excluir esta vaga?')) excluir.mutate(v.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!isLoading && filtradas.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            {vagas.length === 0 ? 'Nenhuma vaga cadastrada ainda.' : 'Nenhuma vaga encontrada com os filtros aplicados.'}
          </div>
        )}
      </div>
    </div>
  )
}
