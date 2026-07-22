import { apiClient } from '@/lib/api-client'
import type { Variacao } from './produtos-service'

export type TipoMovimentacao = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'VENDA' | 'CANCELAMENTO_VENDA'

export interface Movimentacao {
  id: string
  produtoVariacaoId: string
  tipo: TipoMovimentacao
  quantidade: number
  estoqueResultante: number
  observacao: string | null
  criadoEm: string
  usuario: { id: string; nome: string } | null
  produtoNome: string | null
  variacaoNome: string | null
}

export interface VariacaoRuptura extends Variacao {
  produtoNome: string
}

interface ResultadoMovimentacao {
  variacao: Variacao
  movimentacao: Movimentacao
}

// O gerente-token (quando o Vendedor faz ajuste) vai no header X-Gerente-Token.
function configGerente(gerenteToken?: string) {
  return gerenteToken ? { headers: { 'X-Gerente-Token': gerenteToken } } : undefined
}

export async function registrarEntrada(input: {
  produtoVariacaoId: string
  quantidade: number
  observacao?: string
}): Promise<ResultadoMovimentacao> {
  const { data } = await apiClient.post<ResultadoMovimentacao>('/estoque/entrada', input)
  return data
}

export async function registrarSaida(input: {
  produtoVariacaoId: string
  quantidade: number
  observacao?: string
}): Promise<ResultadoMovimentacao> {
  const { data } = await apiClient.post<ResultadoMovimentacao>('/estoque/saida', input)
  return data
}

export async function registrarAjuste(
  input: { produtoVariacaoId: string; quantidadeContada: number; observacao?: string },
  gerenteToken?: string,
): Promise<ResultadoMovimentacao> {
  const { data } = await apiClient.post<ResultadoMovimentacao>('/estoque/ajuste', input, configGerente(gerenteToken))
  return data
}

export interface ListagemMovimentacoes {
  items: Movimentacao[]
  total: number
  pagina: number
  porPagina: number
}

export async function listarMovimentacoes(produtoVariacaoId: string, pagina = 1): Promise<ListagemMovimentacoes> {
  const { data } = await apiClient.get<ListagemMovimentacoes>('/estoque/movimentacoes', {
    params: { produtoVariacaoId, pagina },
  })
  return data
}

export async function listarRuptura(): Promise<VariacaoRuptura[]> {
  const { data } = await apiClient.get<VariacaoRuptura[]>('/estoque/ruptura')
  return data
}
