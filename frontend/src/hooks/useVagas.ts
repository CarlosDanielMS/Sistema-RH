import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vagasService } from '../services/vagasService'
import type { Vaga } from '../types'

export function useVagas(params?: { status_vaga?: string }) {
  return useQuery({
    queryKey: ['vagas', params],
    queryFn: () => vagasService.listar(params),
  })
}

export function useVaga(id: number) {
  return useQuery({
    queryKey: ['vaga', id],
    queryFn: () => vagasService.obter(id),
    enabled: !!id,
  })
}

export function useCriarVaga() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: vagasService.criar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vagas'] }),
  })
}

export function useAtualizarVaga() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Vaga> }) =>
      vagasService.atualizar(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vagas'] }),
  })
}

export function useExcluirVaga() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: vagasService.excluir,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vagas'] }),
  })
}
