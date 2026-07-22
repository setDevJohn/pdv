import { useMutation } from '@tanstack/react-query'
import { trocarLoja } from '@/services/auth-service'
import { useAuthStore } from '@/stores/auth-store'

export function useTrocarLoja() {
  const atualizarToken = useAuthStore((s) => s.atualizarToken)

  return useMutation({
    mutationFn: (lojaId: string) => trocarLoja(lojaId),
    onSuccess: (data) => atualizarToken(data.accessToken),
  })
}
