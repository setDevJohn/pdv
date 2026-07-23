import { formatarBRL, formatarQuantidade } from '@/lib/format'
import type { ProdutoMaisVendido } from '@/services/dashboard-service'

interface Props {
  produtos: ProdutoMaisVendido[]
}

// Ranking (magnitude, baixo→alto) vira barra horizontal — hue único
// (sequencial), rótulo direto em cada linha porque a lista já é curta
// (top 10): aqui labelar tudo é o ranking, não é "poluir o gráfico".
export function ProdutosMaisVendidosList({ produtos }: Props) {
  if (produtos.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sem vendas no período.</p>
  }

  const maiorQuantidade = Math.max(...produtos.map((p) => p.quantidade), 0.01)

  return (
    <ul className="space-y-2">
      {produtos.map((p) => (
        <li key={p.produtoVariacaoId} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate">{p.descricao}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatarQuantidade(p.quantidade)} · {formatarBRL(p.total)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-primary/80"
              style={{ width: `${Math.max(4, (p.quantidade / maiorQuantidade) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
