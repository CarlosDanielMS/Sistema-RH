import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, FileText, CheckCircle, Loader2, Trash2, AlertTriangle, Tag, X as XIcon } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { candidatosService } from '../services/candidatosService'
import { vagasService } from '../services/vagasService'
import { useToast } from '../components/ui/Toast'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().optional(),
  linkedin: z.string().optional(),
  vaga_id: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function EditarCandidato() {
  const { id } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const candidatoId = Number(id)
  const toast = useToast()
  const [erro, setErro] = useState('')
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const { data: vagas = [] } = useQuery({
    queryKey: ['vagas'],
    queryFn: () => vagasService.listar(),
  })

  const { data: candidato, isLoading } = useQuery({
    queryKey: ['candidato', candidatoId],
    queryFn: () => candidatosService.obter(candidatoId),
    enabled: !!candidatoId,
  })

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: candidato ? {
      nome: candidato.nome,
      email: candidato.email,
      telefone: candidato.telefone ?? '',
      linkedin: candidato.linkedin ?? '',
      vaga_id: candidato.vaga_id ? String(candidato.vaga_id) : '',
    } : undefined,
  })

  // Carrega tags quando candidato é carregado (sem useEffect para evitar re-render)
  const candidatoTags = candidato?.tags ? (() => { try { return JSON.parse(candidato.tags || '[]') } catch { return [] } })() : []

  const salvar = useMutation({
    mutationFn: (data: FormData) =>
      candidatosService.atualizar(candidatoId, {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        linkedin: data.linkedin,
        vaga_id: data.vaga_id ? Number(data.vaga_id) : undefined,
        tags: JSON.stringify(tags),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidato', candidatoId] })
      qc.invalidateQueries({ queryKey: ['candidatos'] })
      toast.success('Candidato atualizado com sucesso')
      nav(`/candidatos/${candidatoId}`)
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.detail || 'Erro ao salvar candidato.'
      setErro(msg)
      toast.error(msg)
    },
  })

  const excluir = useMutation({
    mutationFn: () => candidatosService.excluir(candidatoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidatos'] })
      toast.success('Candidato excluído')
      nav('/candidatos')
    },
    onError: () => {
      setErro('Erro ao excluir candidato.')
      toast.error('Erro ao excluir candidato.')
    },
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-32 gap-2 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /> Carregando candidato...
    </div>
  )
  if (!candidato) return <div className="text-slate-500 py-16 text-center">Candidato não encontrado.</div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/candidatos" className="btn-secondary p-2"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="page-title">Editar Candidato</h1>
          <p className="page-subtitle">{candidato.nome}</p>
        </div>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{erro}</div>
      )}

      <form onSubmit={handleSubmit(d => salvar.mutate(d))} className="space-y-5">
        <div className="card space-y-4">
          <h3 className="font-semibold text-slate-800">Dados Pessoais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome completo *</label>
              <input className="input" placeholder="João Silva" {...register('nome')} />
              {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome.message}</p>}
            </div>
            <div>
              <label className="label">E-mail *</label>
              <input className="input" type="email" placeholder="joao@email.com" {...register('email')} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" placeholder="(11) 99999-0000" {...register('telefone')} />
            </div>
            <div>
              <label className="label">LinkedIn</label>
              <input className="input" placeholder="linkedin.com/in/joao" {...register('linkedin')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Vaga de interesse</label>
              <select className="input" {...register('vaga_id')}>
                <option value="">Selecione uma vaga</option>
                {vagas.map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Tags / Competências */}
        <div className="card space-y-2">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary-500" /> Tags / Competências
          </h3>
          <div className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              placeholder="Ex: Python, React, Liderança — Enter para adicionar"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const t = tagInput.trim()
                  if (t && !tags.includes(t) && tags.length < 15) {
                    setTags([...tags, t]); setTagInput('')
                  }
                }
              }}
            />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, i) => (
                <span key={i} className="flex items-center gap-1 text-xs bg-primary-50 text-primary-700 border border-primary-100 px-2 py-1 rounded-full">
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter((_, j) => j !== i))} className="hover:text-red-500">
                    <XIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {tags.length === 0 && candidatoTags.length === 0 && (
            <p className="text-xs text-slate-400">Nenhuma tag ainda. Digite e pressione Enter para adicionar.</p>
          )}
          {tags.length === 0 && candidatoTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {candidatoTags.map((tag: string, i: number) => (
                <span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Status do currículo */}
        <div className="card space-y-2">
          <h3 className="font-semibold text-slate-800 text-sm">Currículo PDF</h3>
          {candidato.cv_filename ? (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <FileText className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{candidato.cv_filename}</p>
                <p className="text-xs text-slate-500">PDF indexado e pronto para análise IA</p>
              </div>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">Nenhum currículo enviado</p>
                <p className="text-xs text-slate-500">
                  Envie o PDF na aba{' '}
                  <Link to={`/candidatos/${candidatoId}?tab=curriculo`} className="underline text-primary-600">
                    Currículo
                  </Link>{' '}
                  da página do candidato.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-3">
            <Link to="/candidatos" className="btn-secondary">Cancelar</Link>
            <button type="submit" className="btn-primary" disabled={salvar.isPending}>
              {salvar.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                : <><Save className="w-4 h-4" /> Salvar Alterações</>}
            </button>
          </div>

          {confirmarExclusao ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600">Confirmar exclusão?</span>
              <button
                type="button"
                onClick={() => excluir.mutate()}
                disabled={excluir.isPending}
                className="btn-primary bg-red-600 hover:bg-red-700 border-red-600 py-1.5 px-3 text-sm"
              >
                {excluir.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
              </button>
              <button type="button" onClick={() => setConfirmarExclusao(false)} className="btn-secondary py-1.5 px-3 text-sm">
                Não
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarExclusao(true)}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Excluir candidato
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
