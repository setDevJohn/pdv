import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EstadoErro, EstadoVazio } from '@/components/estado'
import { useMovimentacoes } from '@/hooks/use-estoque'
import { formatarQuantidade } from '@/lib/format'
import type { Variacao } from '@/services/produtos-service'
import type { TipoMovimentacao } from '@/services/estoque-service'

const rotuloTipo: Record<TipoMovimentacao, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  AJUSTE: 'Ajuste',
  VENDA: 'Venda',
  CANCELAMENTO_VENDA: 'Cancelamento',
}

interface Props {
  aberto: boolean
  aoFechar: () => void
  variacao: (Variacao & { produtoNome?: string }) | null
}

export function HistoricoDialog({ aberto, aoFechar, variacao }: Props) {
  const { data, isPending, isError, refetch } = useMovimentacoes(aberto ? variacao?.id : undefined)

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Histórico de movimentação</DialogTitle>
          <DialogDescription>
            {variacao?.produtoNome ? `${variacao.produtoNome} — ` : ''}
            {variacao?.nome}
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <EstadoErro aoTentarNovamente={() => refetch()} />
        ) : isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <EstadoVazio titulo="Sem movimentações" descricao="Ainda não há histórico para esta variação." />
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {data.items.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                <div>
                  <span className="font-medium">{rotuloTipo[m.tipo]}</span>
                  <span className="ml-2 text-muted-foreground tabular-nums">
                    {m.quantidade > 0 ? '+' : ''}
                    {formatarQuantidade(m.quantidade)}
                  </span>
                  {m.observacao && <p className="text-xs text-muted-foreground">{m.observacao}</p>}
                </div>
                <div className="text-right">
                  <p className="tabular-nums">→ {formatarQuantidade(m.estoqueResultante)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    {m.usuario ? ` · ${m.usuario.nome}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
