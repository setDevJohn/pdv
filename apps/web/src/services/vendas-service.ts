import { apiClient } from '@/lib/api-client'

export type FormaPagamento = 'DINHEIRO' | 'CARTAO' | 'PIX'

export interface ItemVenda {
  id: string
  produtoVariacaoId: string
  descricao: string
  quantidade: number
  precoUnitario: number
  total: number
}

export interface PagamentoVenda {
  id: string
  forma: FormaPagamento
  valor: number
  transacaoGatewayId: string | null
}

export interface VendaResumo {
  id: string
  status: 'ABERTA' | 'FINALIZADA' | 'CANCELADA'
  subtotal: number
  desconto: number
  total: number
  troco: number
  criadoEm: string
  finalizadoEm: string | null
  canceladoEm: string | null
  canceladoMotivo: string | null
  quantidadeItens: number
  itens: ItemVenda[]
  pagamentos: PagamentoVenda[]
  operador: string | null
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

export async function finalizarVenda(
  vendaId: string,
  pagamentos: Array<{ forma: FormaPagamento; valor: number }>,
): Promise<VendaResumo> {
  const { data } = await apiClient.post<VendaResumo>(`/vendas/${vendaId}/finalizar`, { pagamentos })
  return data
}

// O gerente-token (aprovação do cancelamento pelo Vendedor) vai no header
// X-Gerente-Token — mesmo padrão do ajuste de estoque.
function configGerente(gerenteToken?: string) {
  return gerenteToken ? { headers: { 'X-Gerente-Token': gerenteToken } } : undefined
}

export async function cancelarVenda(vendaId: string, motivo: string | undefined, gerenteToken?: string): Promise<VendaResumo> {
  const { data } = await apiClient.post<VendaResumo>(`/vendas/${vendaId}/cancelar`, { motivo }, configGerente(gerenteToken))
  return data
}

export interface ListagemVendas {
  items: VendaResumo[]
  total: number
  pagina: number
  porPagina: number
}

export async function listarVendas(params: { status?: string; pagina?: number } = {}): Promise<ListagemVendas> {
  const { data } = await apiClient.get<ListagemVendas>('/vendas', { params })
  return data
}
