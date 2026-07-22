import { useMutation } from '@tanstack/react-query'
import { logout } from '@/services/auth-service'
import { useAuthStore } from '@/stores/auth-store'

export function useLogout() {
  const encerrarSessao = useAuthStore((s) => s.encerrarSessao)

  return useMutation({
    mutationFn: logout,
    // limpa a sessão local mesmo se a chamada ao servidor falhar (ex.: já expirado)
    onSettled: () => encerrarSessao(),
  })
}
