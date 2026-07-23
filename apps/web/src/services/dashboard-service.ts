import { apiClient } from '@/lib/api-client'

export interface JanelaResumo {
  quantidadeVendas: number
  faturamento: number
}

export interface ResumoDashboard {
  hoje: JanelaResumo
  semana: JanelaResumo
  mes: JanelaResumo
  ticketMedioMes: number
}

export interface VendaPorDia {
  data: string
  quantidadeVendas: number
  faturamento: number
}

export interface ProdutoMaisVendido {
  produtoVariacaoId: string
  descricao: string
  quantidade: number
  total: number
}

export interface PeriodoParams {
  de?: string
  ate?: string
}

export async function obterResumo(): Promise<ResumoDashboard> {
  const { data } = await apiClient.get<ResumoDashboard>('/dashboard/resumo')
  return data
}

export async function obterVendasPorDia(params: PeriodoParams): Promise<VendaPorDia[]> {
  const { data } = await apiClient.get<VendaPorDia[]>('/dashboard/vendas-por-dia', { params })
  return data
}

export async function obterProdutosMaisVendidos(params: PeriodoParams & { limite?: number }): Promise<ProdutoMaisVendido[]> {
  const { data } = await apiClient.get<ProdutoMaisVendido[]>('/dashboard/produtos-mais-vendidos', { params })
  return data
}

// Baixa a planilha e dispara o download no navegador — a API responde o
// arquivo binário direto (Content-Disposition: attachment), sem etapa
// intermediária de link temporário no servidor.
export async function exportarPlanilha(params: PeriodoParams): Promise<void> {
  const { data } = await apiClient.get<Blob>('/dashboard/exportar', { params, responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = 'relatorio-vendas.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}
