import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'

interface RotaProtegidaProps {
  // false para /selecionar-loja: exige token, mas é exatamente onde o
  // usuário ainda não tem lojaAtivaId.
  exigirLojaAtiva?: boolean
}

export function RotaProtegida({ exigirLojaAtiva = true }: RotaProtegidaProps) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const lojaAtivaId = useAuthStore((s) => s.lojaAtivaId)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }
  if (exigirLojaAtiva && !lojaAtivaId) {
    return <Navigate to="/selecionar-loja" replace />
  }
  return <Outlet />
}
