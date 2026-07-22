import { useQuery } from '@tanstack/react-query'
import { obterStatusAssinatura } from '@/services/assinatura-service'

export function useAssinatura() {
  return useQuery({
    queryKey: ['assinatura'],
    queryFn: obterStatusAssinatura,
  })
}
