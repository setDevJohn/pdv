import { useAuthStore } from '@/stores/auth-store'
import { TrialBanner } from '@/components/trial/trial-banner'

// Dashboard placeholder pós-login. Relatórios reais entram na feature de
// Dashboard (Fase 3). Navegação e logout ficam no AdminLayout.
export function HomePage() {
  const usuario = useAuthStore((s) => s.usuario)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Bem-vindo, {usuario?.nome}</h1>
        <p className="text-sm text-muted-foreground">Gerencie seu catálogo pelo menu ao lado.</p>
      </div>
      <TrialBanner />
    </div>
  )
}
