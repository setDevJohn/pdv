import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth-store'
import { useTrocarLoja } from '@/hooks/use-trocar-loja'

// Só é alcançada quando o usuário tem acesso a mais de uma loja (login já
// seleciona automaticamente quando há só uma — ver auth-service no backend).
export function SelecionarLojaPage() {
  const navigate = useNavigate()
  const lojas = useAuthStore((s) => s.lojas)
  const trocarLojaMutation = useTrocarLoja()

  function aoSelecionar(lojaId: string) {
    trocarLojaMutation.mutate(lojaId, {
      onSuccess: () => navigate('/', { replace: true }),
    })
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Selecione a loja</CardTitle>
          <CardDescription>Você tem acesso a mais de uma loja.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {lojas.map((loja) => (
            <Button
              key={loja.lojaId}
              variant="outline"
              className="w-full justify-between"
              disabled={trocarLojaMutation.isPending}
              onClick={() => aoSelecionar(loja.lojaId)}
            >
              <span>{loja.nome}</span>
              <span className="text-xs text-muted-foreground">{loja.perfil}</span>
            </Button>
          ))}
          {trocarLojaMutation.isError && (
            <p className="text-sm text-destructive">Não foi possível entrar nessa loja. Tente novamente.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
