import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { candidatosService } from '../services/candidatosService'

export function useCandidatos(params?: { vaga_id?: number; etapa?: string }) {
  return useQuery({
    queryKey: ['candidatos', params],
    queryFn: () => candidatosService.listar(params),
  })
}

export function useCandidato(id: number) {
  return useQuery({
    queryKey: ['candidato', id],
    queryFn: () => candidatosService.obter(id),
    enabled: !!id,
  })
}

export function useAnalisarCandidato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => candidatosService.analisar(id),
    onSuccess: (_, id) => qc.invalidateQueries({ queryKey: ['candidato', id] }),
  })
}

export function useCriarCandidato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: candidatosService.criar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidatos'] }),
  })
}
