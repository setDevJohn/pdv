import { useState } from 'react'
import { SearchIcon, TriangleAlertIcon, HistoryIcon, ArrowLeftRightIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EstadoErro, EstadoVazio } from '@/components/estado'
import { useProdutos } from '@/hooks/use-produtos'
import { useRuptura } from '@/hooks/use-estoque'
import { useDebounce } from '@/hooks/use-debounce'
import { formatarBRL, formatarQuantidade } from '@/lib/format'
import type { Variacao } from '@/services/produtos-service'
import { MovimentacaoDialog } from './movimentacao-dialog'
import { HistoricoDialog } from './historico-dialog'

type VariacaoComProduto = Variacao & { produtoNome?: string }

export function EstoquePage() {
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca)

  const ruptura = useRuptura()
  const produtos = useProdutos({ busca: buscaDebounced || undefined, porPagina: 50 })

  const [movimentar, setMovimentar] = useState<VariacaoComProduto | null>(null)
  const [historico, setHistorico] = useState<VariacaoComProduto | null>(null)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Estoque</h1>
        <p className="text-sm text-muted-foreground">Entradas, saídas, ajustes e alertas de ruptura.</p>
      </div>

      {/* Alertas de ruptura */}
      {ruptura.data && ruptura.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning-foreground dark:text-warning">
              <TriangleAlertIcon className="size-4" />
              {ruptura.data.length} {ruptura.data.length === 1 ? 'item em ruptura' : 'itens em ruptura'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {ruptura.data.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <span>
                  {v.produtoNome} — {v.nome}
                </span>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-muted-foreground">
                    {formatarQuantidade(v.estoqueAtual)} / mín {formatarQuantidade(v.estoqueMinimo)}
                  </span>
                  <Button size="xs" variant="outline" onClick={() => setMovimentar(v)}>
                    Repor
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Busca de produtos para movimentar */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar produto para movimentar"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {produtos.isError ? (
          <EstadoErro aoTentarNovamente={() => produtos.refetch()} />
        ) : produtos.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : produtos.data.items.length === 0 ? (
          <EstadoVazio titulo="Nenhum produto encontrado" descricao="Cadastre produtos no menu Produtos." />
        ) : (
          <div className="space-y-2">
            {produtos.data.items.map((produto) =>
              produto.variacoes
                .filter((v) => v.ativo)
                .map((v) => {
                  const comProduto: VariacaoComProduto = { ...v, produtoNome: produto.nome }
                  return (
                    <Card key={v.id} size="sm">
                      <CardContent className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {produto.nome}
                            {produto.variacoes.filter((x) => x.ativo).length > 1 ? ` — ${v.nome}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatarBRL(v.precoVenda)} · Estoque: {formatarQuantidade(v.estoqueAtual)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {v.emRuptura && (
                            <Badge className="bg-warning/15 text-warning-foreground dark:text-warning">Ruptura</Badge>
                          )}
                          <Button size="icon-sm" variant="ghost" aria-label="Histórico" onClick={() => setHistorico(comProduto)}>
                            <HistoryIcon />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setMovimentar(comProduto)}>
                            <ArrowLeftRightIcon />
                            Movimentar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                }),
            )}
          </div>
        )}
      </div>

      <MovimentacaoDialog aberto={Boolean(movimentar)} aoFechar={() => setMovimentar(null)} variacao={movimentar} />
      <HistoricoDialog aberto={Boolean(historico)} aoFechar={() => setHistorico(null)} variacao={historico} />
    </div>
  )
}
