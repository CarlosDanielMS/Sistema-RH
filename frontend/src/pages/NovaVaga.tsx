import { useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vagasService } from '../services/vagasService'
import { useToast } from '../components/ui/Toast'

const schema = z.object({
  titulo: z.string().min(3, 'Mínimo 3 caracteres'),
  descricao: z.string().min(10, 'Mínimo 10 caracteres'),
  requisitos_obrigatorios: z.string().min(5, 'Informe os requisitos'),
  'requisitos_desejáveis': z.string().optional(),
  senioridade: z.enum(['estagio','junior','pleno','senior','especialista','gestao']),
  modelo_trabalho: z.enum(['presencial','remoto','hibrido']),
  localizacao: z.string().optional(),
  faixa_salarial: z.string().optional(),
  responsavel: z.string().min(2, 'Informe o responsável'),
  status: z.enum(['aberta','pausada','encerrada']),
})
type FormData = z.infer<typeof schema>

export function NovaVaga() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { id } = useParams()
  const editando = !!id
  const toast = useToast()

  const { data: vagaExistente } = useQuery({
    queryKey: ['vaga', id],
    queryFn: () => vagasService.obter(Number(id)),
    enabled: editando,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { senioridade: 'pleno', modelo_trabalho: 'remoto', status: 'aberta' },
  })

  useEffect(() => {
    if (vagaExistente) reset(vagaExistente as FormData)
  }, [vagaExistente, reset])

  const criar = useMutation({
    mutationFn: (data: FormData) => vagasService.criar(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vagas'] })
      toast.success('Vaga criada com sucesso!')
      nav('/vagas')
    },
    onError: () => toast.error('Erro ao criar vaga.'),
  })

  const atualizar = useMutation({
    mutationFn: (data: FormData) => vagasService.atualizar(Number(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vagas'] })
      toast.success('Vaga atualizada com sucesso!')
      nav('/vagas')
    },
    onError: () => toast.error('Erro ao atualizar vaga.'),
  })

  function onSubmit(data: FormData) {
    if (editando) atualizar.mutate(data)
    else criar.mutate(data)
  }

  const loading = criar.isPending || atualizar.isPending

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/vagas" className="btn-secondary p-2"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="page-title">{editando ? 'Editar Vaga' : 'Nova Vaga'}</h1>
          <p className="page-subtitle">Preencha as informações da vaga</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Título da Vaga *</label>
            <input className="input" placeholder="Ex: Desenvolvedor Python Pleno" {...register('titulo')} />
            {errors.titulo && <p className="text-xs text-red-500 mt-1">{errors.titulo.message}</p>}
          </div>
          <div>
            <label className="label">Senioridade *</label>
            <select className="input" {...register('senioridade')}>
              <option value="estagio">Estágio</option>
              <option value="junior">Júnior</option>
              <option value="pleno">Pleno</option>
              <option value="senior">Sênior</option>
              <option value="especialista">Especialista</option>
              <option value="gestao">Gestão</option>
            </select>
          </div>
          <div>
            <label className="label">Modelo de Trabalho *</label>
            <select className="input" {...register('modelo_trabalho')}>
              <option value="presencial">Presencial</option>
              <option value="remoto">Remoto</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </div>
          <div>
            <label className="label">Localização</label>
            <input className="input" placeholder="Ex: São Paulo, SP" {...register('localizacao')} />
          </div>
          <div>
            <label className="label">Faixa Salarial</label>
            <input className="input" placeholder="Ex: R$ 8.000 – R$ 12.000" {...register('faixa_salarial')} />
          </div>
          <div>
            <label className="label">Responsável *</label>
            <input className="input" placeholder="Nome do recrutador" {...register('responsavel')} />
            {errors.responsavel && <p className="text-xs text-red-500 mt-1">{errors.responsavel.message}</p>}
          </div>
          <div>
            <label className="label">Status *</label>
            <select className="input" {...register('status')}>
              <option value="aberta">Aberta</option>
              <option value="pausada">Pausada</option>
              <option value="encerrada">Encerrada</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Descrição da Vaga *</label>
            <textarea className="input min-h-24 resize-none" placeholder="Descreva o papel e responsabilidades..." {...register('descricao')} />
            {errors.descricao && <p className="text-xs text-red-500 mt-1">{errors.descricao.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="label">Requisitos Obrigatórios *</label>
            <textarea className="input min-h-20 resize-none" placeholder="Ex: Python 3.10+, FastAPI, PostgreSQL, Docker" {...register('requisitos_obrigatorios')} />
            {errors.requisitos_obrigatorios && <p className="text-xs text-red-500 mt-1">{errors.requisitos_obrigatorios.message}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="label">Requisitos Desejáveis</label>
            <textarea className="input min-h-20 resize-none" placeholder="Ex: LangChain, ChromaDB, experiência com LLMs" {...register('requisitos_desejáveis')} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Link to="/vagas" className="btn-secondary">Cancelar</Link>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Vaga'}
          </button>
        </div>
      </form>
    </div>
  )
}
