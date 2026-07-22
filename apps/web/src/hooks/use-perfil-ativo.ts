import type { PerfilAcesso } from '@pdv/shared-types'
import { useAuthStore } from '@/stores/auth-store'

// Perfil do usuário na loja atualmente ativa. O token também carrega o perfil,
// mas derivar da lista de lojas evita depender de decodificar o JWT no front.
export function usePerfilAtivo(): PerfilAcesso | null {
  const lojas = useAuthStore((s) => s.lojas)
  const lojaAtivaId = useAuthStore((s) => s.lojaAtivaId)
  return lojas.find((loja) => loja.lojaId === lojaAtivaId)?.perfil ?? null
}
