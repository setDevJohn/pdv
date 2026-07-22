import { apiClient } from '@/lib/api-client'

export interface SangriaResumo {
  id: string
  valor: number
  motivo: string | null
  criadoEm: string
  usuario: string
}

export interface CaixaResumo {
  id: string
  status: 'ABERTO' | 'FECHADO'
  valorInicial: number
  valorFechamento: number | null
  abertoEm: string
  fechadoEm: string | null
  operador: string
  totalSangrias: number
  vendasDinheiro: number
  saldoEmDinheiro: number
  sangrias: SangriaResumo[]
}

export interface FechamentoResultado extends CaixaResumo {
  valorEsperado: number
  diferenca: number
}

// atual pode não ter caixa aberto (204/corpo vazio) — normaliza para null.
export async function obterCaixaAtual(): Promise<CaixaResumo | null> {
  const { data } = await apiClient.get<CaixaResumo | ''>('/caixa/atual')
  return data || null
}

export async function abrirCaixa(valorInicial: number): Promise<CaixaResumo> {
  const { data } = await apiClient.post<CaixaResumo>('/caixa/abrir', { valorInicial })
  return data
}

export async function registrarSangria(valor: number, motivo?: string): Promise<CaixaResumo> {
  const { data } = await apiClient.post<CaixaResumo>('/caixa/sangria', { valor, motivo })
  return data
}

export async function fecharCaixa(valorFechamento: number): Promise<FechamentoResultado> {
  const { data } = await apiClient.post<FechamentoResultado>('/caixa/fechar', { valorFechamento })
  return data
}
