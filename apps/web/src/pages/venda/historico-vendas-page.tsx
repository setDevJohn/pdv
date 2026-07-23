import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EstadoErro, EstadoVazio } from '@/components/estado'
import { useHistoricoVendas } from '@/hooks/use-vendas'
import { formatarBRL } from '@/lib/format'
import type { VendaResumo } from '@/services/vendas-service'
import { CancelarVendaDialog } from './cancelar-venda-dialog'

const ROTULO_STATUS: Record<VendaResumo['status'], string> = {
  ABERTA: 'Aberta',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
}

export function HistoricoVendasPage() {
  const { data, isPending, isError, refetch } = useHistoricoVendas({ status: 'FINALIZADA' })
  const [cancelarVenda, setCancelarVenda] = useState<VendaResumo | null>(null)

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" asChild aria-label="Voltar">
          <Link to="/venda">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-xl font-semibold">Histórico de vendas</h1>
          <p className="text-sm text-muted-foreground">Vendas finalizadas — cancelamento exige aprovação de gerente.</p>
        </div>
      </div>

      {isError ? (
        <EstadoErro aoTentarNovamente={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EstadoVazio titulo="Nenhuma venda finalizada" descricao="Vendas concluídas aparecem aqui." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead className="text-center">Itens</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((venda) => (
              <TableRow key={venda.id}>
                <TableCell className="tabular-nums">
                  {venda.finalizadoEm ? new Date(venda.finalizadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                </TableCell>
                <TableCell>{venda.operador ?? '—'}</TableCell>
                <TableCell className="text-center tabular-nums">{venda.quantidadeItens}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatarBRL(venda.total)}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={venda.status === 'CANCELADA' ? 'destructive' : 'default'}>{ROTULO_STATUS[venda.status]}</Badge>
                </TableCell>
                <TableCell>
                  {venda.status === 'FINALIZADA' && (
                    <Button size="sm" variant="outline" onClick={() => setCancelarVenda(venda)}>
                      Cancelar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CancelarVendaDialog aberto={Boolean(cancelarVenda)} aoFechar={() => setCancelarVenda(null)} venda={cancelarVenda} />
    </div>
  )
}
