import type { StatusTrial } from '@/services/assinatura-service'

export type NivelTrial = 'info' | 'alerta' | 'expirado'

export interface TrialBannerConteudo {
  nivel: NivelTrial
  titulo: string
  descricao: string
}

// Regras de exibição do banner de trial, separadas do componente para poderem
// ser testadas sem renderizar. Retorna null quando não há nada a mostrar
// (assinatura ativa/paga — não está em trial).
export function montarConteudoTrial(status: StatusTrial): TrialBannerConteudo | null {
  if (!status.emTrial) {
    return null
  }

  const dias = status.diasRestantes ?? 0
  const usadas = status.insercoesUsadas ?? 0
  const limite = status.insercoesLimite

  const restantesInsercoes = limite === null ? null : Math.max(limite - usadas, 0)
  const detalheInsercoes =
    limite === null ? '' : ` · ${usadas}/${limite} inserções usadas`

  if (status.expirado) {
    return {
      nivel: 'expirado',
      titulo: 'Seu período de teste terminou',
      descricao: 'Assine um plano para continuar cadastrando produtos e registrando vendas.',
    }
  }

  // Perto do fim: 2 dias ou menos, ou 80%+ da cota de inserções consumida.
  const pertoDoFimPorTempo = dias <= 2
  const pertoDoFimPorInsercoes = restantesInsercoes !== null && limite !== null && restantesInsercoes <= limite * 0.2

  const nivel: NivelTrial = pertoDoFimPorTempo || pertoDoFimPorInsercoes ? 'alerta' : 'info'
  const diasTexto = dias === 1 ? '1 dia restante' : `${dias} dias restantes`

  return {
    nivel,
    titulo: `Período de teste — ${diasTexto}`,
    descricao: `Aproveite para avaliar o sistema${detalheInsercoes}.`,
  }
}
