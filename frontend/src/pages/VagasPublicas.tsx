import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  Brain, Briefcase, MapPin, Clock, DollarSign,
  Search, ArrowRight, Users, Zap, CheckCircle,
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Vaga {
  id: number; titulo: string; descricao: string
  senioridade: string; modelo_trabalho: string
  localizacao: string; faixa_salarial: string
}

const SENIORIDADE: Record<string, string> = {
  estagio: 'Estágio', junior: 'Júnior', pleno: 'Pleno',
  senior: 'Sênior', especialista: 'Especialista', gestao: 'Gestão',
}
const MODELO: Record<string, { label: string; color: string }> = {
  remoto:     { label: 'Remoto',     color: 'bg-emerald-100 text-emerald-700' },
  presencial: { label: 'Presencial', color: 'bg-blue-100 text-blue-700' },
  hibrido:    { label: 'Híbrido',    color: 'bg-violet-100 text-violet-700' },
}

export function VagasPublicas() {
  const nav = useNavigate()
  const [busca, setBusca]         = useState('')
  const [vagaAberta, setVagaAberta] = useState<number | null>(null)

  const { data: vagas = [], isLoading } = useQuery<Vaga[]>({
    queryKey: ['vagas-publicas'],
    queryFn: () => axios.get(`${API}/webhooks/vagas-abertas`).then(r => r.data),
  })

  const filtradas = vagas.filter(v =>
    !busca ||
    v.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    v.descricao.toLowerCase().includes(busca.toLowerCase()) ||
    (v.localizacao ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  const vaga = vagas.find(v => v.id === vagaAberta)

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-primary-900 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">RH-IA Platform</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Trabalhe conosco</h1>
          <p className="text-primary-200 text-lg mb-8 max-w-2xl mx-auto">
            Encontre a vaga ideal e candidate-se em minutos. Nossa IA analisa seu perfil e te conecta ao time certo.
          </p>

          {/* Busca */}
          <div className="max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por cargo, tecnologia ou local..."
              className="w-full bg-white text-slate-800 pl-12 pr-4 py-4 rounded-2xl text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          {/* Destaques */}
          <div className="flex items-center justify-center gap-8 mt-10 text-sm text-primary-200">
            <div className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary-400" /> Triagem por IA em segundos</div>
            <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-primary-400" /> Feedback imediato</div>
            <div className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary-400" /> {vagas.length} vagas abertas</div>
          </div>
        </div>
      </div>

      {/* Lista de vagas */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
            <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            Carregando vagas...
          </div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium">Nenhuma vaga encontrada</p>
            {busca && <p className="text-sm mt-1">Tente outro termo de busca</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-500 text-sm">
                <strong className="text-slate-800">{filtradas.length}</strong> vaga{filtradas.length !== 1 ? 's' : ''} disponível{filtradas.length !== 1 ? 'is' : ''}
                {busca && ` para "${busca}"`}
              </p>
            </div>

            <div className="space-y-4">
              {filtradas.map(v => {
                const modelo = MODELO[v.modelo_trabalho] ?? { label: v.modelo_trabalho, color: 'bg-slate-100 text-slate-600' }
                const aberta = vagaAberta === v.id
                return (
                  <div
                    key={v.id}
                    className={`bg-white rounded-2xl border transition-all ${aberta ? 'border-primary-300 shadow-lg' : 'border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'}`}
                  >
                    {/* Cabeçalho do card */}
                    <div
                      className="flex items-start justify-between gap-4 p-6 cursor-pointer"
                      onClick={() => setVagaAberta(aberta ? null : v.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary-50 border border-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-slate-900">{v.titulo}</h2>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${modelo.color}`}>
                              {modelo.label}
                            </span>
                            {v.senioridade && (
                              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                                {SENIORIDADE[v.senioridade] ?? v.senioridade}
                              </span>
                            )}
                            {v.localizacao && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <MapPin className="w-3 h-3" /> {v.localizacao}
                              </span>
                            )}
                            {v.faixa_salarial && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <DollarSign className="w-3 h-3" /> {v.faixa_salarial}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); nav(`/candidatura?vaga=${v.id}`) }}
                          className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
                        >
                          Candidatar-se <ArrowRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setVagaAberta(aberta ? null : v.id) }}
                          className="text-slate-400 hover:text-slate-600 text-xs underline whitespace-nowrap"
                        >
                          {aberta ? 'Fechar' : 'Ver mais'}
                        </button>
                      </div>
                    </div>

                    {/* Detalhes expandidos */}
                    {aberta && (
                      <div className="px-6 pb-6 pt-0 border-t border-slate-100">
                        <div className="pt-4 space-y-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Sobre a vaga</p>
                            <p className="text-sm text-slate-600 leading-relaxed">{v.descricao}</p>
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Zap className="w-3.5 h-3.5 text-primary-400" />
                              Nossa IA analisa seu CV e dá feedback em segundos
                            </div>
                            <button
                              onClick={() => nav(`/candidatura?vaga=${v.id}`)}
                              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                            >
                              Candidatar-se agora <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary-500" />
            <span>RH-IA Platform — Recrutamento inteligente</span>
          </div>
          <p>Todos os processos seletivos são conduzidos com imparcialidade e ética</p>
        </div>
      </footer>
    </div>
  )
}
