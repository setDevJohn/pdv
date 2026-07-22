import { Navigate, Outlet } from 'react-router-dom'
import type { PerfilAcesso } from '@pdv/shared-types'
import { useAuthStore } from '@/stores/auth-store'
import { usePerfilAtivo } from '@/hooks/use-perfil-ativo'

interface RotaProtegidaProps {
  // false para /selecionar-loja: exige token, mas é exatamente onde o
  // usuário ainda não tem lojaAtivaId.
  exigirLojaAtiva?: boolean
  // Quando definido, restringe a rota aos perfis informados (o backend também
  // valida — isto é só para não mostrar telas que o usuário não pode usar).
  perfisPermitidos?: PerfilAcesso[]
}

export function RotaProtegida({ exigirLojaAtiva = true, perfisPermitidos }: RotaProtegidaProps) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const lojaAtivaId = useAuthStore((s) => s.lojaAtivaId)
  const perfil = usePerfilAtivo()

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }
  if (exigirLojaAtiva && !lojaAtivaId) {
    return <Navigate to="/selecionar-loja" replace />
  }
  if (perfisPermitidos && (!perfil || !perfisPermitidos.includes(perfil))) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
