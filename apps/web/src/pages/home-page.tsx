import { useAuthStore } from '@/stores/auth-store'
import { usePerfilAtivo } from '@/hooks/use-perfil-ativo'
import { TrialBanner } from '@/components/trial/trial-banner'
import { DashboardPage } from '@/pages/dashboard/dashboard-page'

// Vendedor não tem acesso a faturamento/dashboard (só venda + consultas de
// produto/estoque, ver docs/07-escopo-fechado.md) — mantém a boas-vindas
// simples. Admin vê o dashboard de vendas direto na tela inicial.
export function HomePage() {
  const usuario = useAuthStore((s) => s.usuario)
  const perfil = usePerfilAtivo()

  if (perfil === 'ADMIN') {
    return (
      <div className="space-y-6">
        <TrialBanner />
        <DashboardPage />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Bem-vindo, {usuario?.nome}</h1>
        <p className="text-sm text-muted-foreground">Comece uma venda pelo menu ao lado.</p>
      </div>
      <TrialBanner />
    </div>
  )
}
