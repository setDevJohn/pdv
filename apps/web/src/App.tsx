import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { EstadoCarregando, EstadoErro, EstadoVazio } from '@/components/estado'
import { formatarBRL } from '@/lib/format'

// Vitrine dos tokens e componentes-base do design system (ver
// docs/08-design-system.md). Serve de checagem visual até a primeira tela
// real (Fase 3) substituir esta página.
function App() {
  const [estadoDemo, setEstadoDemo] = useState<'carregando' | 'vazio' | 'erro'>('carregando')

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold">Design System — PDV</h1>
        <p className="text-sm text-muted-foreground">
          Tokens (cores, tipografia, raio) sobre shadcn/ui + Tailwind. Ver docs/08-design-system.md.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Ações</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => toast.success('Venda finalizada com sucesso')}>Ação primária</Button>
          <Button variant="secondary">Secundária</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="destructive">Destrutiva</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Card de produto + valores em R$</h2>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Refrigerante — Lata 350ml</CardTitle>
            <CardDescription>Bebidas</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="font-heading text-lg font-semibold tabular-nums">{formatarBRL(6.5)}</span>
            <div className="flex gap-1.5">
              <Badge className="bg-success/10 text-success">Em estoque</Badge>
              <Badge className="bg-warning/15 text-warning-foreground dark:text-warning">Estoque baixo</Badge>
              <Badge variant="destructive">Sem estoque</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Padrões de estado (toda tela trata os 4: carregando, vazio, erro, sucesso)
        </h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEstadoDemo('carregando')}>
            Carregando
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEstadoDemo('vazio')}>
            Vazio
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEstadoDemo('erro')}>
            Erro
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.success('Sucesso é sempre via toast')}>
            Sucesso (toast)
          </Button>
        </div>
        <Card>
          <CardContent>
            {estadoDemo === 'carregando' && (
              <div className="space-y-2">
                <EstadoCarregando />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}
            {estadoDemo === 'vazio' && (
              <EstadoVazio
                titulo="Nenhum produto cadastrado"
                descricao="Cadastre o primeiro produto para começar a vender."
                acao={{ label: 'Cadastrar produto', onClick: () => toast.info('Tela de cadastro ainda não existe') }}
              />
            )}
            {estadoDemo === 'erro' && (
              <EstadoErro
                descricao="Verifique sua conexão e tente novamente."
                aoTentarNovamente={() => toast.info('Tentando novamente...')}
              />
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

export default App
