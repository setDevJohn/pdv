import { useMutation } from '@tanstack/react-query'
import { formatarRecibo } from '@/lib/formatar-recibo'
import { impressoraSuportada, imprimir } from '@/lib/webusb-printer'
import { useAuthStore } from '@/stores/auth-store'
import type { VendaResumo } from '@/services/vendas-service'

export function useImpressoraSuportada(): boolean {
  return impressoraSuportada()
}

export function useImprimirRecibo() {
  const lojas = useAuthStore((s) => s.lojas)
  const lojaAtivaId = useAuthStore((s) => s.lojaAtivaId)

  return useMutation({
    mutationFn: async (venda: VendaResumo) => {
      const nomeLoja = lojas.find((l) => l.lojaId === lojaAtivaId)?.nome ?? 'PDV'
      const bytes = formatarRecibo(venda, nomeLoja)
      await imprimir(bytes)
    },
  })
}
