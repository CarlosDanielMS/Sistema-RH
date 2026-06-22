import { useState } from 'react'
import { Plus, BookOpen, Loader2, FileDown, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { decisoesService } from '../services/decisoesService'
import { useToast } from '../components/ui/Toast'
import { candidatosService } from '../services/candidatosService'
import { vagasService } from '../services/vagasService'
import { TIPOS_DECISAO, formatDateTime } from '../utils/helpers'
import { Modal } from '../components/ui/Modal'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { gerarRelatorioDecisao } from '../utils/relatorio'

const schema = z.object({
  candidato_id: z.string().min(1, 'Obrigatório'),
  vaga_id: z.string().min(1, 'Obrigatório'),
  tipo_decisao: z.string().min(1, 'Obrigatório'),
  justificativa: z.string().min(20, 'Mínimo 20 caracteres'),
  responsavel: z.string().min(2, 'Obrigatório'),
  estado_emocional: z.string().optional(),
  nivel_confianca: z.number().min(0).max(1),
})
type FormData = z.infer<typeof schema>

export function Decisoes() {
  const qc = useQueryClient()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<number | null>(null)

  const { data: decisoes = [], isLoading } = useQuery({
    queryKey: ['decisoes'],
    queryFn: () => decisoesService.listar(),
  })

  const { data: candidatos = [] } = useQuery({
    queryKey: ['candidatos'],
    queryFn: () => candidatosService.listar(),
  })

  const { data: vagas = [] } = useQuery({
    queryKey: ['vagas'],
    queryFn: () => vagasService.listar(),
  })

  const excluir = useMutation({
    mutationFn: (id: number) => decisoesService.excluir(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decisoes'] })
      setConfirmandoExclusao(null)
      toast.success('Decisão excluída')
    },
    onError: () => toast.error('Erro ao excluir decisão'),
  })

  const criar = useMutation({
    mutationFn: (data: FormData) => decisoesService.criar({
      candidato_id: Number(data.candidato_id),
      vaga_id: Number(data.vaga_id),
      tipo_decisao: data.tipo_decisao,
      justificativa: data.justificativa,
      responsavel: data.responsavel,
      estado_emocional: data.estado_emocional,
      nivel_confianca: data.nivel_confianca,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['decisoes'] })
      setOpen(false)
      reset()
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nivel_confianca: 0.7 },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Diário de Decisões</h1>
          <p className="page-subtitle">Rastreie cada decisão do processo seletivo</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> Nova Decisão
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando decisões...
        </div>
      ) : decisoes.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Nenhuma decisão registrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {decisoes.map(d => {
            const candidato = candidatos.find(c => c.id === d.candidato_id)
            const vaga = vagas.find(v => v.id === d.vaga_id)
            const tipoLabel = TIPOS_DECISAO.find(t => t.value === d.tipo_decisao)?.label || d.tipo_decisao
            const isPositivo = d.tipo_decisao.startsWith('aprovado') || d.tipo_decisao === 'contratado' || d.tipo_decisao === 'proposta_enviada'
            return (
              <div key={d.id} className="card flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPositivo ? 'bg-emerald-100' : 'bg-red-50'}`}>
                  <BookOpen className={`w-5 h-5 ${isPositivo ? 'text-emerald-600' : 'text-red-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-slate-900">{candidato?.nome || `Candidato #${d.candidato_id}`}</p>
                      <p className="text-xs text-slate-400">{vaga?.titulo || `Vaga #${d.vaga_id}`}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`badge ${isPositivo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {tipoLabel}
                      </span>
                      <button
                        onClick={() => gerarRelatorioDecisao({
                          decisao: d,
                          candidato: candidato ? {
                            nome: candidato.nome,
                            email: candidato.email,
                            telefone: candidato.telefone ?? undefined,
                            linkedin: candidato.linkedin ?? undefined,
                            etapa_pipeline: candidato.etapa_pipeline,
                            score_aderencia: candidato.score_aderencia ?? undefined,
                            status_triagem: candidato.status_triagem,
                          } : undefined,
                          vaga: vaga ? {
                            titulo: vaga.titulo,
                            descricao: vaga.descricao,
                            senioridade: vaga.senioridade,
                            modelo_trabalho: vaga.modelo_trabalho,
                            localizacao: vaga.localizacao ?? undefined,
                            faixa_salarial: vaga.faixa_salarial ?? undefined,
                          } : undefined,
                        })}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border border-slate-200"
                        title="Gerar relatório PDF"
                      >
                        <FileDown className="w-3.5 h-3.5" /> Relatório
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">{d.justificativa}</p>
                  {d.pros && d.pros.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {d.pros.map((p, i) => <span key={i} className="badge bg-emerald-50 text-emerald-600">+ {p}</span>)}
                      {d.contras?.map((c, i) => <span key={i} className="badge bg-red-50 text-red-500">- {c}</span>)}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <span>Por: <strong className="text-slate-600">{d.responsavel}</strong></span>
                      <span>Confiança: <strong className="text-slate-600">{Math.round(d.nivel_confianca * 100)}%</strong></span>
                      {d.estado_emocional && <span>Estado: <strong className="text-slate-600">{d.estado_emocional}</strong></span>}
                      <span>{formatDateTime(d.criado_em)}</span>
                    </div>
                    {/* Excluir */}
                    {confirmandoExclusao === d.id ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-red-600 font-medium">Confirmar?</span>
                        <button
                          onClick={() => excluir.mutate(d.id)}
                          disabled={excluir.isPending}
                          className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs"
                        >
                          {excluir.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sim'}
                        </button>
                        <button onClick={() => setConfirmandoExclusao(null)} className="px-2 py-1 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 text-xs">
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmandoExclusao(d.id)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                        title="Excluir decisão"
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); reset() }} title="Registrar Decisão" size="lg">
        <form onSubmit={handleSubmit(d => criar.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Candidato *</label>
              <select className="input" {...register('candidato_id')}>
                <option value="">Selecione</option>
                {candidatos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              {errors.candidato_id && <p className="text-xs text-red-500 mt-1">{errors.candidato_id.message}</p>}
            </div>
            <div>
              <label className="label">Vaga *</label>
              <select className="input" {...register('vaga_id')}>
                <option value="">Selecione</option>
                {vagas.map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}
              </select>
              {errors.vaga_id && <p className="text-xs text-red-500 mt-1">{errors.vaga_id.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Tipo de Decisão *</label>
            <select className="input" {...register('tipo_decisao')}>
              <option value="">Selecione</option>
              {TIPOS_DECISAO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {errors.tipo_decisao && <p className="text-xs text-red-500 mt-1">{errors.tipo_decisao.message}</p>}
          </div>
          <div>
            <label className="label">Justificativa * <span className="text-slate-400 font-normal">(mín. 20 caracteres)</span></label>
            <textarea className="input min-h-20 resize-none" placeholder="Descreva o motivo da decisão..." {...register('justificativa')} />
            {errors.justificativa && <p className="text-xs text-red-500 mt-1">{errors.justificativa.message}</p>}
          </div>
          <div>
            <label className="label">Responsável *</label>
            <input className="input" placeholder="Seu nome" {...register('responsavel')} />
            {errors.responsavel && <p className="text-xs text-red-500 mt-1">{errors.responsavel.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Estado Emocional</label>
              <select className="input" {...register('estado_emocional')}>
                <option value="">Selecione</option>
                {['confiante','neutro','inseguro','animado','preocupado'].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Nível de Confiança (0–1)</label>
              <input type="number" step="0.1" min="0" max="1" className="input" {...register('nivel_confianca', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setOpen(false); reset() }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={criar.isPending}>
              {criar.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Registrar Decisão'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
