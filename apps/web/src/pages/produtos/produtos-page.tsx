import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EstadoErro, EstadoVazio } from '@/components/estado'
import { useProdutos } from '@/hooks/use-produtos'
import { useDebounce } from '@/hooks/use-debounce'
import { usePerfilAtivo } from '@/hooks/use-perfil-ativo'
import { estoqueTotal, resumoPreco, temRuptura } from './produto-resumo'
import { formatarQuantidade } from '@/lib/format'

const POR_PAGINA = 20

export function ProdutosPage() {
  const navigate = useNavigate()
  const perfil = usePerfilAtivo()
  const ehAdmin = perfil === 'ADMIN'

  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const buscaDebounced = useDebounce(busca)

  const { data, isPending, isError, refetch } = useProdutos({
    busca: buscaDebounced || undefined,
    pagina,
    porPagina: POR_PAGINA,
  })

  function aoBuscar(valor: string) {
    setBusca(valor)
    setPagina(1)
  }

  const totalPaginas = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">Catálogo da loja.</p>
        </div>
        {ehAdmin && (
          <Button onClick={() => navigate('/produtos/novo')}>
            <PlusIcon />
            Novo produto
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Buscar por nome, código de barras ou SKU"
          value={busca}
          onChange={(e) => aoBuscar(e.target.value)}
        />
      </div>

      {isError ? (
        <EstadoErro aoTentarNovamente={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EstadoVazio
          titulo={buscaDebounced ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
          descricao={buscaDebounced ? 'Tente outro termo de busca.' : 'Cadastre o primeiro produto para começar.'}
          acao={ehAdmin && !buscaDebounced ? { label: 'Cadastrar produto', onClick: () => navigate('/produtos/novo') } : undefined}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((produto) => {
                  const qtdVariacoes = produto.variacoes.filter((v) => v.ativo).length
                  return (
                    <TableRow
                      key={produto.id}
                      className={ehAdmin ? 'cursor-pointer' : undefined}
                      onClick={ehAdmin ? () => navigate(`/produtos/${produto.id}`) : undefined}
                    >
                      <TableCell>
                        <div className="font-medium">{produto.nome}</div>
                        {qtdVariacoes > 1 && (
                          <div className="text-xs text-muted-foreground">{qtdVariacoes} variações</div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{produto.categoria?.nome ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{resumoPreco(produto)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="inline-flex items-center gap-2">
                          {temRuptura(produto) && (
                            <Badge className="bg-warning/15 text-warning-foreground dark:text-warning">Ruptura</Badge>
                          )}
                          {formatarQuantidade(estoqueTotal(produto))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {ehAdmin ? 'Editar' : ''}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {data.pagina} de {totalPaginas} · {data.total} produtos
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
