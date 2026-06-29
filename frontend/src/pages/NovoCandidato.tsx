import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Upload, FileText, X, CheckCircle, Loader2 } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { candidatosService } from '../services/candidatosService'
import { vagasService } from '../services/vagasService'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().optional(),
  linkedin: z.string().optional(),
  vaga_id: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export function NovoCandidato() {
  const nav = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [erro, setErro] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: vagas = [] } = useQuery({
    queryKey: ['vagas'],
    queryFn: () => vagasService.listar({ status_vaga: 'aberta' }),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const criar = useMutation({
    mutationFn: async (data: FormData) => {
      const candidato = await candidatosService.criar({
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        linkedin: data.linkedin,
        vaga_id: data.vaga_id ? Number(data.vaga_id) : undefined,
      })
      if (file) {
        try {
          await candidatosService.uploadCV(candidato.id, file)
        } catch (uploadErr: any) {
          // Candidato criado, mas CV falhou — navega para edição com aviso
          nav(`/candidatos/${candidato.id}/editar?cv_erro=1`)
          throw uploadErr
        }
      }
      return candidato
    },
    onSuccess: (candidato) => nav(`/candidatos/${candidato.id}`),
    onError: (e: any) => {
      if (!e?.config?.url?.includes('upload-cv')) {
        setErro(e?.response?.data?.detail || 'Erro ao cadastrar candidato.')
      }
    },
  })

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf') setFile(f)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/candidatos" className="btn-secondary p-2"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="page-title">Novo Candidato</h1>
          <p className="page-subtitle">Cadastre e envie o currículo para análise com IA</p>
        </div>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">{erro}</div>
      )}

      <form onSubmit={handleSubmit(d => criar.mutate(d))} className="space-y-5">
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

        <div className="card space-y-3">
          <h3 className="font-semibold text-slate-800">Currículo em PDF</h3>
          <p className="text-xs text-slate-400">O arquivo será processado pela IA automaticamente após o upload.</p>
          {!file ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'}`}
            >
              <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Arraste o PDF aqui ou clique para selecionar</p>
              <p className="text-xs text-slate-400 mt-1">Apenas arquivos .pdf — máximo 10 MB</p>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <FileText className="w-8 h-8 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <button type="button" onClick={() => setFile(null)} className="p-1 hover:bg-emerald-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}
        </div>

        <div className="card bg-slate-50 border-slate-200 flex items-center gap-2 text-xs text-slate-500 py-2.5 px-4">
          <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
          Ao cadastrar, o candidato entra automaticamente na etapa <strong className="text-slate-700">Triado</strong> do fluxo.
        </div>

        <div className="flex gap-3">
          <Link to="/candidatos" className="btn-secondary">Cancelar</Link>
          <button type="submit" className="btn-primary" disabled={criar.isPending}>
            {criar.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Cadastrando...</>
              : <><Upload className="w-4 h-4" /> Cadastrar Candidato</>}
          </button>
        </div>
      </form>
    </div>
  )
}
