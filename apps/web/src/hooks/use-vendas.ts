import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  abrirVenda,
  adicionarItemVenda,
  atualizarItemVenda,
  descartarVenda,
  obterVendaAberta,
  removerItemVenda,
  type ItemVenda,
  type VendaResumo,
} from '@/services/vendas-service'

const CHAVE = 'venda-aberta'

function dinheiro(valor: number): number {
  return Number(valor.toFixed(2))
}

// Mesma regra do backend (VendasService.recalcular): totais são sempre
// derivados da lista de itens, nunca acumulados — evita a UI otimista
// divergir do servidor por arredondamento.
function recalcular(venda: VendaResumo, itens: ItemVenda[]): VendaResumo {
  const subtotal = dinheiro(itens.reduce((soma, i) => soma + i.total, 0))
  return {
    ...venda,
    itens,
    subtotal,
    total: subtotal,
    quantidadeItens: itens.reduce((soma, i) => soma + i.quantidade, 0),
  }
}

export function useVendaAberta() {
  return useQuery({ queryKey: [CHAVE], queryFn: obterVendaAberta })
}

export function useAbrirVenda() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: abrirVenda,
    onSuccess: (venda) => queryClient.setQueryData([CHAVE], venda),
  })
}

// Aplica a mutação otimista na venda em cache e devolve como desfazer se o
// servidor recusar — usado pelos três hooks de item abaixo.
interface ContextoOtimista {
  anterior: VendaResumo | null | undefined
}

function useAtualizacaoOtimista() {
  const queryClient = useQueryClient()

  async function aplicar(atualizar: (venda: VendaResumo) => VendaResumo): Promise<ContextoOtimista> {
    await queryClient.cancelQueries({ queryKey: [CHAVE] })
    const anterior = queryClient.getQueryData<VendaResumo | null>([CHAVE])
    if (anterior) {
      queryClient.setQueryData([CHAVE], atualizar(anterior))
    }
    return { anterior }
  }

  function desfazer(contexto?: ContextoOtimista) {
    if (contexto) {
      queryClient.setQueryData([CHAVE], contexto.anterior)
    }
  }

  function sincronizar() {
    queryClient.invalidateQueries({ queryKey: [CHAVE] })
  }

  return { aplicar, desfazer, sincronizar }
}

interface AdicionarItemInput {
  produtoVariacaoId: string
  quantidade: number
  descricao: string
  precoUnitario: number
}

// Some o item bipado no carrinho na hora — o request confirma atrás. Se o
// produto já está no carrinho, soma na linha (mesma regra do backend).
export function useAdicionarItem(vendaId: string | undefined) {
  const { aplicar, desfazer, sincronizar } = useAtualizacaoOtimista()

  return useMutation({
    mutationFn: (input: AdicionarItemInput) =>
      adicionarItemVenda(vendaId as string, { produtoVariacaoId: input.produtoVariacaoId, quantidade: input.quantidade }),
    onMutate: (input) =>
      aplicar((venda) => {
        const existente = venda.itens.find((i) => i.produtoVariacaoId === input.produtoVariacaoId)
        const itens = existente
          ? venda.itens.map((i) =>
              i.id === existente.id
                ? { ...i, quantidade: i.quantidade + input.quantidade, total: dinheiro((i.quantidade + input.quantidade) * i.precoUnitario) }
                : i,
            )
          : [
              ...venda.itens,
              {
                id: `otimista-${input.produtoVariacaoId}`,
                produtoVariacaoId: input.produtoVariacaoId,
                descricao: input.descricao,
                quantidade: input.quantidade,
                precoUnitario: input.precoUnitario,
                total: dinheiro(input.quantidade * input.precoUnitario),
              },
            ]
        return recalcular(venda, itens)
      }),
    onError: (_err, _input, contexto) => desfazer(contexto),
    onSettled: sincronizar,
  })
}

export function useAtualizarItem(vendaId: string | undefined) {
  const { aplicar, desfazer, sincronizar } = useAtualizacaoOtimista()

  return useMutation({
    mutationFn: ({ itemId, quantidade }: { itemId: string; quantidade: number }) =>
      atualizarItemVenda(vendaId as string, itemId, quantidade),
    onMutate: ({ itemId, quantidade }) =>
      aplicar((venda) => {
        const itens = venda.itens.map((i) => (i.id === itemId ? { ...i, quantidade, total: dinheiro(quantidade * i.precoUnitario) } : i))
        return recalcular(venda, itens)
      }),
    onError: (_err, _input, contexto) => desfazer(contexto),
    onSettled: sincronizar,
  })
}

export function useRemoverItem(vendaId: string | undefined) {
  const { aplicar, desfazer, sincronizar } = useAtualizacaoOtimista()

  return useMutation({
    mutationFn: (itemId: string) => removerItemVenda(vendaId as string, itemId),
    onMutate: (itemId) =>
      aplicar((venda) => recalcular(venda, venda.itens.filter((i) => i.id !== itemId))),
    onError: (_err, _input, contexto) => desfazer(contexto),
    onSettled: sincronizar,
  })
}

export function useDescartarVenda() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vendaId: string) => descartarVenda(vendaId),
    onSuccess: () => queryClient.setQueryData([CHAVE], null),
  })
}
