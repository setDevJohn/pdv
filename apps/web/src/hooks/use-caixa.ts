import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { abrirCaixa, fecharCaixa, obterCaixaAtual, registrarSangria } from '@/services/caixa-service'

const CHAVE = 'caixa-atual'

export function useCaixaAtual() {
  return useQuery({ queryKey: [CHAVE], queryFn: obterCaixaAtual })
}

export function useAbrirCaixa() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (valorInicial: number) => abrirCaixa(valorInicial),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  })
}

export function useSangria() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ valor, motivo }: { valor: number; motivo?: string }) => registrarSangria(valor, motivo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
  })
}

export function useFecharCaixa() {
  // Sem invalidar aqui: o diálogo de fechamento mostra a diferença apurada e só
  // então (ao clicar em "Concluir") o caixa some da tela. Se invalidássemos no
  // sucesso, o componente do caixa aberto desmontaria antes de exibir o resultado.
  return useMutation({
    mutationFn: (valorFechamento: number) => fecharCaixa(valorFechamento),
  })
}

// Invalida o caixa atual — chamado ao concluir o fechamento.
export function useInvalidarCaixa() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: [CHAVE] })
}
