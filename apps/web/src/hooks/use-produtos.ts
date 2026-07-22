import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adicionarVariacao,
  atualizarProduto,
  atualizarVariacao,
  buscarProduto,
  criarProduto,
  listarProdutos,
  removerProduto,
  removerVariacao,
  type AtualizarProdutoInput,
  type CriarProdutoInput,
  type ListarProdutosParams,
  type VariacaoInput,
} from '@/services/produtos-service'

const CHAVE = 'produtos'

export function useProdutos(params: ListarProdutosParams) {
  return useQuery({
    queryKey: [CHAVE, params],
    queryFn: () => listarProdutos(params),
  })
}

export function useProduto(id: string | undefined) {
  return useQuery({
    queryKey: [CHAVE, 'detalhe', id],
    queryFn: () => buscarProduto(id as string),
    enabled: Boolean(id),
  })
}

export function useCriarProduto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CriarProdutoInput) => criarProduto(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHAVE] })
      // criar produto pode consumir uma inserção do trial — atualiza o banner.
      queryClient.invalidateQueries({ queryKey: ['assinatura'] })
    },
  })
}

export function useAtualizarProduto(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AtualizarProdutoInput) => atualizarProduto(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  })
}

export function useRemoverProduto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removerProduto(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  })
}

export function useAdicionarVariacao(produtoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: VariacaoInput) => adicionarVariacao(produtoId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  })
}

export function useAtualizarVariacao(produtoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ variacaoId, input }: { variacaoId: string; input: Partial<VariacaoInput> & { ativo?: boolean } }) =>
      atualizarVariacao(produtoId, variacaoId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  })
}

export function useRemoverVariacao(produtoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variacaoId: string) => removerVariacao(produtoId, variacaoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  })
}
