import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'

// Ex.: /login — se já está autenticado e com loja ativa, não faz sentido
// mostrar o login de novo.
export function RotaPublica() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const lojaAtivaId = useAuthStore((s) => s.lojaAtivaId)

  if (accessToken && lojaAtivaId) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
