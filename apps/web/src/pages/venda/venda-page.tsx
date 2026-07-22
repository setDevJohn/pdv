import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { MinusIcon, PlusIcon, ScanBarcodeIcon, Trash2Icon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EstadoErro, EstadoVazio } from '@/components/estado'
import { useAbrirVenda, useAdicionarItem, useAtualizarItem, useRemoverItem, useVendaAberta } from '@/hooks/use-vendas'
import { buscarItens, type ItemCatalogo, type ItemVenda } from '@/services/vendas-service'
import { formatarBRL } from '@/lib/format'
import { DescartarVendaDialog } from './descartar-venda-dialog'

export function VendaPage() {
  const vendaQuery = useVendaAberta()
  const abrirVenda = useAbrirVenda()
  const venda = vendaQuery.data

  const adicionarItem = useAdicionarItem(venda?.id)
  const atualizarItem = useAtualizarItem(venda?.id)
  const removerItem = useRemoverItem(venda?.id)

  const [termo, setTermo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [opcoes, setOpcoes] = useState<ItemCatalogo[]>([])
  const [descartarAberto, setDescartarAberto] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Não há venda em andamento ainda: abre uma (o backend reaproveita se já
  // existir aberta do operador) para o carrinho ficar pronto pra bipar.
  const abriuRef = useRef(false)
  useEffect(() => {
    if (vendaQuery.isSuccess && venda === null && !abriuRef.current) {
      abriuRef.current = true
      abrirVenda.mutate()
    }
  }, [vendaQuery.isSuccess, venda, abrirVenda])

  function adicionar(item: ItemCatalogo) {
    adicionarItem.mutate({
      produtoVariacaoId: item.produtoVariacaoId,
      quantidade: 1,
      descricao: item.descricao,
      precoUnitario: item.precoVenda,
    })
    setTermo('')
    setOpcoes([])
    inputRef.current?.focus()
  }

  async function aoBipar(evento: FormEvent) {
    evento.preventDefault()
    const buscaAtual = termo.trim()
    if (!buscaAtual) return

    setBuscando(true)
    try {
      const resultado = await buscarItens(buscaAtual)
      if (resultado.exato) {
        adicionar(resultado.exato)
      } else if (resultado.opcoes.length === 0) {
        toast.error('Produto não encontrado.')
      } else {
        setOpcoes(resultado.opcoes)
      }
    } catch {
      toast.error('Não foi possível buscar o produto.')
    } finally {
      setBuscando(false)
    }
  }

  function alterarQuantidade(item: ItemVenda, delta: number) {
    const nova = item.quantidade + delta
    if (nova <= 0) {
      removerItem.mutate(item.id)
    } else {
      atualizarItem.mutate({ itemId: item.id, quantidade: nova })
    }
  }

  if (vendaQuery.isError) {
    return <EstadoErro aoTentarNovamente={() => vendaQuery.refetch()} />
  }

  if (vendaQuery.isPending || !venda) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold">Venda</h1>
          <p className="text-sm text-muted-foreground">Bipe o código de barras ou busque por nome/SKU.</p>
        </div>
        {venda.itens.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setDescartarAberto(true)}>
            Descartar venda
          </Button>
        )}
      </div>

      <form className="flex gap-2" onSubmit={aoBipar}>
        <div className="relative flex-1">
          <ScanBarcodeIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            className="pl-8"
            placeholder="Código de barras, nome ou SKU"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            autoFocus
          />
        </div>
        <Button type="submit" disabled={buscando}>
          {buscando ? 'Buscando...' : 'Adicionar'}
        </Button>
      </form>

      {opcoes.length > 0 && (
        <Card size="sm">
          <CardContent className="space-y-1">
            <p className="mb-1 text-xs text-muted-foreground">Vários produtos encontrados — escolha um:</p>
            {opcoes.map((item) => (
              <button
                key={item.produtoVariacaoId}
                type="button"
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                onClick={() => adicionar(item)}
              >
                <span>{item.descricao}</span>
                <span className="tabular-nums text-muted-foreground">{formatarBRL(item.precoVenda)}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {venda.itens.length === 0 ? (
        <EstadoVazio titulo="Carrinho vazio" descricao="Bipe um produto para começar a venda." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-center">Qtd.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {venda.itens.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-48 truncate">{item.descricao}</TableCell>
                <TableCell className="text-right tabular-nums">{formatarBRL(item.precoUnitario)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button size="icon-sm" variant="outline" aria-label="Diminuir" onClick={() => alterarQuantidade(item, -1)}>
                      <MinusIcon />
                    </Button>
                    <span className="w-6 text-center tabular-nums">{item.quantidade}</span>
                    <Button size="icon-sm" variant="outline" aria-label="Aumentar" onClick={() => alterarQuantidade(item, 1)}>
                      <PlusIcon />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">{formatarBRL(item.total)}</TableCell>
                <TableCell>
                  <Button size="icon-sm" variant="ghost" aria-label="Remover item" onClick={() => removerItem.mutate(item.id)}>
                    <Trash2Icon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Card>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-heading text-2xl font-semibold tabular-nums">{formatarBRL(venda.total)}</span>
        </CardContent>
      </Card>

      <DescartarVendaDialog aberto={descartarAberto} aoFechar={() => setDescartarAberto(false)} vendaId={venda.id} />
    </div>
  )
}
