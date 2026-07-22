import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listarMovimentacoes,
  listarRuptura,
  registrarAjuste,
  registrarEntrada,
  registrarSaida,
} from '@/services/estoque-service'

// Invalida produtos (estoque exibido na lista/edição) e a ruptura após mexer no estoque.
function useInvalidarEstoque() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['produtos'] })
    queryClient.invalidateQueries({ queryKey: ['ruptura'] })
    queryClient.invalidateQueries({ queryKey: ['movimentacoes'] })
  }
}

export function useRuptura() {
  return useQuery({ queryKey: ['ruptura'], queryFn: listarRuptura })
}

export function useMovimentacoes(produtoVariacaoId: string | undefined, pagina = 1) {
  return useQuery({
    queryKey: ['movimentacoes', produtoVariacaoId, pagina],
    queryFn: () => listarMovimentacoes(produtoVariacaoId as string, pagina),
    enabled: Boolean(produtoVariacaoId),
  })
}

type MovInput = { produtoVariacaoId: string; quantidade: number; observacao?: string }

export function useEntrada() {
  const invalidar = useInvalidarEstoque()
  // Envolve para o serviço receber só o input (react-query passa um 2º arg de contexto).
  return useMutation({
    mutationFn: (input: MovInput) => registrarEntrada(input),
    onSuccess: invalidar,
  })
}

export function useSaida() {
  const invalidar = useInvalidarEstoque()
  return useMutation({
    mutationFn: (input: MovInput) => registrarSaida(input),
    onSuccess: invalidar,
  })
}

export function useAjuste() {
  const invalidar = useInvalidarEstoque()
  return useMutation({
    mutationFn: ({
      input,
      gerenteToken,
    }: {
      input: { produtoVariacaoId: string; quantidadeContada: number; observacao?: string }
      gerenteToken?: string
    }) => registrarAjuste(input, gerenteToken),
    onSuccess: invalidar,
  })
}
