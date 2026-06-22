import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassificacaoIA, StatusTriagem, StatusVaga, EtapaPipeline } from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-500'
}

export function scoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-400'
  return 'bg-red-400'
}

export const LABEL_CLASSIFICACAO: Record<ClassificacaoIA | StatusTriagem, { label: string; color: string }> = {
  aprovado:        { label: 'Aprovado',         color: 'bg-emerald-100 text-emerald-700' },
  pendente:        { label: 'Pendente',          color: 'bg-amber-100 text-amber-700' },
  reprovado:       { label: 'Reprovado',         color: 'bg-red-100 text-red-700' },
  analise_humana:  { label: 'Análise Humana',    color: 'bg-blue-100 text-blue-700' },
}

export const LABEL_STATUS_VAGA: Record<StatusVaga, { label: string; color: string }> = {
  aberta:    { label: 'Aberta',    color: 'bg-emerald-100 text-emerald-700' },
  pausada:   { label: 'Pausada',   color: 'bg-amber-100 text-amber-700' },
  encerrada: { label: 'Encerrada', color: 'bg-slate-100 text-slate-600' },
}

export const LABEL_ETAPA: Record<EtapaPipeline, string> = {
  triado:              'Triado',
  entrevista_rh:       'Entrevista RH',
  entrevista_tecnica:  'Entrevista Técnica',
  teste_pratico:       'Teste Prático',
  oferta:              'Oferta',
  contratado:          'Contratado',
  reprovado:           'Reprovado',
}

export const ETAPAS_ORDEM: EtapaPipeline[] = [
  'triado', 'entrevista_rh', 'entrevista_tecnica',
  'teste_pratico', 'oferta', 'contratado', 'reprovado',
]

export const LABEL_SENIORIDADE: Record<string, string> = {
  estagio:     'Estágio',
  junior:      'Júnior',
  pleno:       'Pleno',
  senior:      'Sênior',
  especialista:'Especialista',
  gestao:      'Gestão',
}

export const LABEL_MODELO: Record<string, string> = {
  presencial: 'Presencial',
  remoto:     'Remoto',
  hibrido:    'Híbrido',
}

export const TIPOS_DECISAO = [
  { value: 'aprovado_entrevista_rh',       label: 'Aprovado — Entrevista RH' },
  { value: 'aprovado_entrevista_tecnica',  label: 'Aprovado — Entrevista Técnica' },
  { value: 'aprovado_teste_pratico',       label: 'Aprovado — Teste Prático' },
  { value: 'proposta_enviada',             label: 'Proposta Enviada' },
  { value: 'contratado',                   label: 'Contratado' },
  { value: 'reprovado_triagem',            label: 'Reprovado — Triagem' },
  { value: 'reprovado_entrevista',         label: 'Reprovado — Entrevista' },
  { value: 'processo_encerrado',           label: 'Processo Encerrado' },
]
