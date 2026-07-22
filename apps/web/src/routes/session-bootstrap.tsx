import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { refresh } from '@/services/auth-service'
import { EstadoCarregando } from '@/components/estado'

// O access token só vive em memória (decisão da Fase 2a, contra XSS) — some a
// cada F5. No boot do app, tenta restaurar a sessão via /auth/refresh (usa o
// cookie httpOnly); se falhar, o usuário simplesmente vê a tela de login.
export function SessionBootstrap({ children }: { children: ReactNode }) {
  const bootstrapping = useAuthStore((s) => s.bootstrapping)
  const definirSessaoLogin = useAuthStore((s) => s.definirSessaoLogin)
  const finalizarBootstrap = useAuthStore((s) => s.finalizarBootstrap)

  useEffect(() => {
    refresh()
      .then(definirSessaoLogin)
      .catch(() => finalizarBootstrap())
  }, [definirSessaoLogin, finalizarBootstrap])

  if (bootstrapping) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <EstadoCarregando mensagem="Carregando sessão..." />
      </div>
    )
  }

  return <>{children}</>
}
