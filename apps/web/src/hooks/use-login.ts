import { useMutation } from '@tanstack/react-query'
import { login, type LoginPayload } from '@/services/auth-service'
import { useAuthStore } from '@/stores/auth-store'

export function useLogin() {
  const definirSessaoLogin = useAuthStore((s) => s.definirSessaoLogin)

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: definirSessaoLogin,
  })
}
