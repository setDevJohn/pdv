import { useMutation, useQuery } from '@tanstack/react-query'
import {
  exportarPlanilha,
  obterProdutosMaisVendidos,
  obterResumo,
  obterVendasPorDia,
  type PeriodoParams,
} from '@/services/dashboard-service'

export function useResumoDashboard() {
  return useQuery({ queryKey: ['dashboard-resumo'], queryFn: obterResumo })
}

export function useVendasPorDia(periodo: PeriodoParams) {
  return useQuery({ queryKey: ['dashboard-vendas-por-dia', periodo], queryFn: () => obterVendasPorDia(periodo) })
}

export function useProdutosMaisVendidos(periodo: PeriodoParams) {
  return useQuery({
    queryKey: ['dashboard-produtos-mais-vendidos', periodo],
    queryFn: () => obterProdutosMaisVendidos({ ...periodo, limite: 10 }),
  })
}

export function useExportarPlanilha() {
  return useMutation({ mutationFn: exportarPlanilha })
}
