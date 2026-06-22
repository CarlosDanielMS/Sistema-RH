import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, MapPin, DollarSign, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { vagasService } from '../services/vagasService'
import { candidatosService } from '../services/candidatosService'
import { LABEL_STATUS_VAGA, LABEL_SENIORIDADE, LABEL_MODELO, formatDate, LABEL_CLASSIFICACAO, scoreColor } from '../utils/helpers'

export function DetalheVaga() {
  const { id } = useParams()
  const vagaId = Number(id)

  const { data: vaga, isLoading } = useQuery({
    queryKey: ['vaga', vagaId],
    queryFn: () => vagasService.obter(vagaId),
    enabled: !!vagaId,
  })

  const { data: candidatos = [] } = useQuery({
    queryKey: ['candidatos-vaga', vagaId],
    queryFn: () => candidatosService.porVaga(vagaId),
    enabled: !!vagaId,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-32 gap-2 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /> Carregando vaga...
    </div>
  )
  if (!vaga) return <div className="text-slate-500 py-16 text-center">Vaga não encontrada.</div>

  const st = LABEL_STATUS_VAGA[vaga.status]

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/vagas" className="btn-secondary p-2"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="flex-1">
          <h1 className="page-title">{vaga.titulo}</h1>
          <p className="page-subtitle">{vaga.responsavel}</p>
        </div>
        <span className={`badge ${st.color}`}>{st.label}</span>
        <Link to={`/vagas/${vaga.id}/editar`} className="btn-secondary">
          <Pencil className="w-4 h-4" /> Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="card space-y-4">
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span>{LABEL_SENIORIDADE[vaga.senioridade]}</span>
              <span>💼 {LABEL_MODELO[vaga.modelo_trabalho]}</span>
              {vaga.localizacao && <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-400" />{vaga.localizacao}</span>}
              {vaga.faixa_salarial && <span className="flex items-center gap-1"><DollarSign className="w-4 h-4 text-slate-400" />{vaga.faixa_salarial}</span>}
              <span className="text-slate-400">Criada em {formatDate(vaga.criado_em)}</span>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-1">Descrição</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{vaga.descricao}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-1">Requisitos Obrigatórios</h4>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{vaga.requisitos_obrigatorios}</p>
            </div>
            {vaga['requisitos_desejáveis'] && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-1">Requisitos Desejáveis</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{vaga['requisitos_desejáveis']}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-800 text-sm">Candidatos ({candidatos.length})</h3>
            <Link to={`/candidatos?vaga=${vaga.id}`} className="text-xs text-primary-600 hover:underline">Ver todos</Link>
          </div>
          {candidatos.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nenhum candidato ainda.</p>
          ) : (
            candidatos.map(c => {
              const cfg = LABEL_CLASSIFICACAO[c.status_triagem]
              return (
                <Link key={c.id} to={`/candidatos/${c.id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary-600">{c.nome[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{c.nome}</p>
                    <span className={`badge text-[10px] ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  {c.score_aderencia != null && (
                    <span className={`text-xs font-bold ${scoreColor(c.score_aderencia)}`}>{c.score_aderencia}</span>
                  )}
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
