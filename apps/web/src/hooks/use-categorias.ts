import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  atualizarCategoria,
  criarCategoria,
  listarCategorias,
  removerCategoria,
} from '@/services/categorias-service'

const CHAVE = 'categorias'

export function useCategorias() {
  return useQuery({
    queryKey: [CHAVE],
    queryFn: listarCategorias,
  })
}

export function useCriarCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nome: string) => criarCategoria(nome),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  })
}

export function useAtualizarCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nome }: { id: string; nome: string }) => atualizarCategoria(id, nome),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  })
}

export function useRemoverCategoria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removerCategoria(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  })
}
