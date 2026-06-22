/**
 * Página pública de candidatura — acessível sem login.
 * Link compartilhável: /candidatura ou /candidatura?vaga=<id>
 */
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Brain, Upload, FileText, X, CheckCircle, XCircle, Loader2, Briefcase, User, Mail, Phone, Linkedin } from 'lucide-react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Vaga { id: number; titulo: string; descricao: string; senioridade: string; modelo_trabalho: string; localizacao: string; faixa_salarial: string }
interface Resultado { status: 'aprovado' | 'reprovado' | 'duplicata' | 'erro'; score?: number; classificacao?: string; mensagem: string; candidato_id?: number }

export function CandidaturaPublica() {
  const [searchParams] = useSearchParams()
  const vagaIdInicial = searchParams.get('vaga') ? Number(searchParams.get('vaga')) : undefined
  const fileRef = useRef<HTMLInputElement>(null)

  const [vagaId, setVagaId]           = useState<number | ''>(vagaIdInicial ?? '')
  const [nome, setNome]               = useState('')
  const [email, setEmail]             = useState('')
  const [telefone, setTelefone]       = useState('')
  const [linkedin, setLinkedin]       = useState('')
  const [arquivo, setArquivo]         = useState<File | null>(null)
  const [dragging, setDragging]       = useState(false)
  const [enviando, setEnviando]       = useState(false)
  const [resultado, setResultado]     = useState<Resultado | null>(null)
  const [erro, setErro]               = useState('')

  const { data: vagas = [] } = useQuery<Vaga[]>({
    queryKey: ['vagas-publicas'],
    queryFn: () => axios.get(`${API}/webhooks/vagas-abertas`).then(r => r.data),
  })

  const vagaSelecionada = vagas.find(v => v.id === vagaId)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf' || f?.name.endsWith('.pdf')) setArquivo(f)
    else setErro('Apenas arquivos PDF são aceitos.')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!vagaId)     return setErro('Selecione uma vaga.')
    if (!arquivo)    return setErro('Anexe seu currículo em PDF.')
    if (!nome.trim() || !email.trim()) return setErro('Nome e e-mail são obrigatórios.')

    setErro('')
    setEnviando(true)
    try {
      const form = new FormData()
      form.append('nome', nome)
      form.append('email', email)
      form.append('telefone', telefone)
      form.append('linkedin', linkedin)
      form.append('vaga_id', String(vagaId))
      form.append('curriculo', arquivo)

      const res = await axios.post(`${API}/webhooks/candidatar`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResultado(res.data)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Erro ao enviar candidatura. Tente novamente.'
      setResultado({ status: 'erro', mensagem: msg })
    } finally {
      setEnviando(false)
    }
  }

  // ── Resultado final ────────────────────────────────────────────────────────
  if (resultado) {
    const ok = resultado.status === 'aprovado' || resultado.status === 'duplicata'
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center space-y-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${ok ? 'bg-emerald-100' : 'bg-red-100'}`}>
            {ok ? <CheckCircle className="w-8 h-8 text-emerald-500" /> : <XCircle className="w-8 h-8 text-red-400" />}
          </div>
          <h2 className={`text-xl font-bold ${ok ? 'text-emerald-700' : 'text-red-600'}`}>
            {resultado.status === 'aprovado'  && 'Candidatura Aprovada na Triagem! 🎉'}
            {resultado.status === 'reprovado' && 'Obrigado pelo interesse'}
            {resultado.status === 'duplicata' && 'Candidatura já registrada'}
            {resultado.status === 'erro'      && 'Algo deu errado'}
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">{resultado.mensagem}</p>
          {resultado.status === 'aprovado' && resultado.score != null && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs text-emerald-600 font-medium">Score de aderência da IA</p>
              <p className="text-3xl font-bold text-emerald-700">{resultado.score}<span className="text-base font-normal text-emerald-400">/100</span></p>
              <div className="h-2 bg-emerald-100 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${resultado.score}%` }} />
              </div>
              <p className="text-xs text-emerald-600 mt-2">Verifique seu e-mail para mais informações.</p>
            </div>
          )}
          {resultado.status === 'reprovado' && resultado.score != null && (
            <p className="text-xs text-slate-400">Score obtido: {resultado.score}/100 (mínimo necessário: 50)</p>
          )}
        </div>
      </div>
    )
  }

  // ── Formulário ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-lg">RH-IA Platform</p>
              <p className="text-primary-200 text-xs">Processo Seletivo com Triagem Inteligente</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold">Candidate-se</h1>
          <p className="text-primary-200 text-sm mt-1">
            Preencha o formulário e envie seu CV. Nossa IA analisará seu perfil em segundos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{erro}</div>
          )}

          {/* Vaga */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Vaga de interesse *
            </label>
            <select
              value={vagaId}
              onChange={e => setVagaId(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Selecione uma vaga</option>
              {vagas.map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}
            </select>
            {vagaSelecionada && (
              <div className="mt-2 p-3 bg-primary-50 border border-primary-100 rounded-lg text-xs text-primary-800">
                <p className="font-medium">{vagaSelecionada.titulo}</p>
                <p className="text-primary-600 mt-0.5">
                  {vagaSelecionada.senioridade} · {vagaSelecionada.modelo_trabalho}
                  {vagaSelecionada.localizacao && ` · ${vagaSelecionada.localizacao}`}
                  {vagaSelecionada.faixa_salarial && ` · ${vagaSelecionada.faixa_salarial}`}
                </p>
              </div>
            )}
          </div>

          {/* Dados pessoais */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Nome completo *
              </label>
              <input
                value={nome} onChange={e => setNome(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Seu nome completo" required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> E-mail *
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="seu@email.com" required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Telefone
                </label>
                <input
                  value={telefone} onChange={e => setTelefone(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="(11) 99999-0000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                </label>
                <input
                  value={linkedin} onChange={e => setLinkedin(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="linkedin.com/in/..."
                />
              </div>
            </div>
          </div>

          {/* Upload CV */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Currículo em PDF *
            </label>
            {!arquivo ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragging ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'}`}
              >
                <Upload className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Arraste o PDF ou clique para selecionar</p>
                <p className="text-xs text-slate-400 mt-1">Apenas .pdf — máx. 10 MB</p>
                <input
                  ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setArquivo(f) }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <FileText className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{arquivo.name}</p>
                  <p className="text-xs text-slate-500">{(arquivo.size / 1024).toFixed(0)} KB</p>
                </div>
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <button type="button" onClick={() => setArquivo(null)} className="p-1 hover:bg-emerald-100 rounded-lg">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            )}
          </div>

          {/* Info IA */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-start gap-2">
            <Brain className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
            <p>Seu currículo será analisado por IA em tempo real. Candidatos com perfil aderente à vaga entram diretamente no processo seletivo.</p>
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {enviando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando com IA...</>
              : <><Brain className="w-4 h-4" /> Enviar Candidatura</>}
          </button>
        </form>
      </div>
    </div>
  )
}
