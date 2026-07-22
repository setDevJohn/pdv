import { apiClient } from '@/lib/api-client'

export interface StatusTrial {
  status: 'TRIAL' | 'ATIVA' | 'INADIMPLENTE' | 'CANCELADA'
  plano: 'MENSAL' | 'TRIMESTRAL' | 'ANUAL'
  emTrial: boolean
  expirado: boolean
  diasRestantes: number | null
  insercoesUsadas: number | null
  insercoesLimite: number | null
}

export async function obterStatusAssinatura(): Promise<StatusTrial> {
  const { data } = await apiClient.get<StatusTrial>('/assinatura')
  return data
}
