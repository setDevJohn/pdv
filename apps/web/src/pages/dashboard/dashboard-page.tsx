import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EstadoErro } from '@/components/estado'
import { useExportarPlanilha, useProdutosMaisVendidos, useResumoDashboard, useVendasPorDia } from '@/hooks/use-dashboard'
import { formatarBRL } from '@/lib/format'
import { VendasPorDiaChart } from './vendas-por-dia-chart'
import { ProdutosMaisVendidosList } from './produtos-mais-vendidos-list'

const PRESETS = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 90, rotulo: '90 dias' },
] as const

function isoLocal(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function periodoDosUltimos(dias: number): { de: string; ate: string } {
  const hoje = new Date()
  const inicio = new Date(hoje)
  inicio.setDate(inicio.getDate() - (dias - 1))
  return { de: isoLocal(inicio), ate: isoLocal(hoje) }
}

function StatTile({ titulo, valor, subvalor }: { titulo: string; valor: string; subvalor?: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs text-muted-foreground">{titulo}</p>
        <p className="font-heading text-lg font-semibold tabular-nums">{valor}</p>
        {subvalor && <p className="text-xs text-muted-foreground tabular-nums">{subvalor}</p>}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const [dias, setDias] = useState<number>(30)
  const periodo = useMemo(() => periodoDosUltimos(dias), [dias])

  const resumo = useResumoDashboard()
  const vendasPorDia = useVendasPorDia(periodo)
  const produtosMaisVendidos = useProdutosMaisVendidos(periodo)
  const exportar = useExportarPlanilha()

  function aoExportar() {
    exportar.mutate(periodo, {
      onError: () => toast.error('Não foi possível gerar a planilha.'),
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Vendas, faturamento e produtos mais vendidos.</p>
        </div>
      </div>

      {resumo.isError ? (
        <EstadoErro aoTentarNovamente={() => resumo.refetch()} />
      ) : resumo.isPending ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-4">
          <StatTile titulo="Vendas hoje" valor={formatarBRL(resumo.data.hoje.faturamento)} subvalor={`${resumo.data.hoje.quantidadeVendas} vendas`} />
          <StatTile
            titulo="Vendas na semana"
            valor={formatarBRL(resumo.data.semana.faturamento)}
            subvalor={`${resumo.data.semana.quantidadeVendas} vendas`}
          />
          <StatTile titulo="Vendas no mês" valor={formatarBRL(resumo.data.mes.faturamento)} subvalor={`${resumo.data.mes.quantidadeVendas} vendas`} />
          <StatTile titulo="Ticket médio (mês)" valor={formatarBRL(resumo.data.ticketMedioMes)} />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <Button key={p.dias} size="sm" variant={dias === p.dias ? 'default' : 'outline'} onClick={() => setDias(p.dias)}>
              {p.rotulo}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={aoExportar} disabled={exportar.isPending}>
          <DownloadIcon />
          {exportar.isPending ? 'Gerando...' : 'Exportar Excel'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendas por dia</CardTitle>
        </CardHeader>
        <CardContent>
          {vendasPorDia.isError ? (
            <EstadoErro aoTentarNovamente={() => vendasPorDia.refetch()} />
          ) : vendasPorDia.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <VendasPorDiaChart dados={vendasPorDia.data} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtos mais vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          {produtosMaisVendidos.isError ? (
            <EstadoErro aoTentarNovamente={() => produtosMaisVendidos.refetch()} />
          ) : produtosMaisVendidos.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <ProdutosMaisVendidosList produtos={produtosMaisVendidos.data} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
