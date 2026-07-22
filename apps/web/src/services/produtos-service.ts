import type { TipoVenda } from '@pdv/shared-types'
import { apiClient } from '@/lib/api-client'

export interface Categoria {
  id: string
  nome: string
}

export interface Variacao {
  id: string
  produtoId: string
  nome: string
  sku: string | null
  codigoBarras: string | null
  precoVenda: number
  precoCusto: number | null
  estoqueAtual: number
  estoqueMinimo: number
  emRuptura: boolean
  ativo: boolean
}

export interface Produto {
  id: string
  nome: string
  descricao: string | null
  categoriaId: string | null
  categoria: Categoria | null
  tipoVenda: TipoVenda
  ativo: boolean
  criadoEm: string
  variacoes: Variacao[]
}

export interface ListagemProdutos {
  items: Produto[]
  total: number
  pagina: number
  porPagina: number
}

export interface VariacaoInput {
  nome?: string
  sku?: string
  codigoBarras?: string
  precoVenda: number
  precoCusto?: number
  estoqueMinimo?: number
}

export interface CriarProdutoInput {
  nome: string
  descricao?: string
  categoriaId?: string
  tipoVenda?: TipoVenda
  variacoes: VariacaoInput[]
}

export interface AtualizarProdutoInput {
  nome?: string
  descricao?: string
  categoriaId?: string | null
  tipoVenda?: TipoVenda
  ativo?: boolean
}

export interface ListarProdutosParams {
  busca?: string
  categoriaId?: string
  pagina?: number
  porPagina?: number
}

export async function listarProdutos(params: ListarProdutosParams): Promise<ListagemProdutos> {
  const { data } = await apiClient.get<ListagemProdutos>('/produtos', { params })
  return data
}

export async function buscarProduto(id: string): Promise<Produto> {
  const { data } = await apiClient.get<Produto>(`/produtos/${id}`)
  return data
}

export async function criarProduto(input: CriarProdutoInput): Promise<Produto> {
  const { data } = await apiClient.post<Produto>('/produtos', input)
  return data
}

export async function atualizarProduto(id: string, input: AtualizarProdutoInput): Promise<Produto> {
  const { data } = await apiClient.patch<Produto>(`/produtos/${id}`, input)
  return data
}

export async function removerProduto(id: string): Promise<void> {
  await apiClient.delete(`/produtos/${id}`)
}

export async function adicionarVariacao(produtoId: string, input: VariacaoInput): Promise<Variacao> {
  const { data } = await apiClient.post<Variacao>(`/produtos/${produtoId}/variacoes`, input)
  return data
}

export async function atualizarVariacao(
  produtoId: string,
  variacaoId: string,
  input: Partial<VariacaoInput> & { ativo?: boolean },
): Promise<Variacao> {
  const { data } = await apiClient.patch<Variacao>(`/produtos/${produtoId}/variacoes/${variacaoId}`, input)
  return data
}

export async function removerVariacao(produtoId: string, variacaoId: string): Promise<void> {
  await apiClient.delete(`/produtos/${produtoId}/variacoes/${variacaoId}`)
}
