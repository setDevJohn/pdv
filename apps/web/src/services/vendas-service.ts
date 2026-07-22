import { apiClient } from '@/lib/api-client'

export interface ItemVenda {
  id: string
  produtoVariacaoId: string
  descricao: string
  quantidade: number
  precoUnitario: number
  total: number
}

export interface VendaResumo {
  id: string
  status: 'ABERTA' | 'FINALIZADA' | 'CANCELADA'
  subtotal: number
  desconto: number
  total: number
  criadoEm: string
  quantidadeItens: number
  itens: ItemVenda[]
}

export interface ItemCatalogo {
  produtoVariacaoId: string
  descricao: string
  codigoBarras: string | null
  precoVenda: number
  estoqueAtual: number
}

export interface ResultadoBusca {
  exato: ItemCatalogo | null
  opcoes: ItemCatalogo[]
}

export async function abrirVenda(): Promise<VendaResumo> {
  const { data } = await apiClient.post<VendaResumo>('/vendas/abrir')
  return data
}

// aberta pode não ter venda em andamento — normaliza corpo vazio para null.
export async function obterVendaAberta(): Promise<VendaResumo | null> {
  const { data } = await apiClient.get<VendaResumo | ''>('/vendas/aberta')
  return data || null
}

export async function buscarItens(termo: string): Promise<ResultadoBusca> {
  const { data } = await apiClient.get<ResultadoBusca>('/vendas/buscar', { params: { termo } })
  return data
}

export async function adicionarItemVenda(
  vendaId: string,
  input: { produtoVariacaoId: string; quantidade: number },
): Promise<VendaResumo> {
  const { data } = await apiClient.post<VendaResumo>(`/vendas/${vendaId}/itens`, input)
  return data
}

export async function atualizarItemVenda(vendaId: string, itemId: string, quantidade: number): Promise<VendaResumo> {
  const { data } = await apiClient.patch<VendaResumo>(`/vendas/${vendaId}/itens/${itemId}`, { quantidade })
  return data
}

export async function removerItemVenda(vendaId: string, itemId: string): Promise<VendaResumo> {
  const { data } = await apiClient.delete<VendaResumo>(`/vendas/${vendaId}/itens/${itemId}`)
  return data
}

export async function descartarVenda(vendaId: string): Promise<void> {
  await apiClient.post(`/vendas/${vendaId}/descartar`)
}
