import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/auth-store'
import { useLogout } from '@/hooks/use-logout'
import { TrialBanner } from '@/components/trial/trial-banner'

// Placeholder pós-login — cada feature da Fase 3 (produtos, caixa, frente de
// caixa...) substitui isto por telas reais atrás desta mesma rota protegida.
export function HomePage() {
  const usuario = useAuthStore((s) => s.usuario)
  const lojas = useAuthStore((s) => s.lojas)
  const lojaAtivaId = useAuthStore((s) => s.lojaAtivaId)
  const logoutMutation = useLogout()

  const lojaAtiva = lojas.find((loja) => loja.lojaId === lojaAtivaId)

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Bem-vindo, {usuario?.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {lojaAtiva?.nome} <Badge variant="outline">{lojaAtiva?.perfil}</Badge>
          </p>
        </div>
        <Button variant="outline" onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
          Sair
        </Button>
      </header>
      <TrialBanner />
      <p className="text-sm text-muted-foreground">
        As telas de frente de caixa, estoque e caixa entram aqui nas próximas features.
      </p>
    </main>
  )
}
