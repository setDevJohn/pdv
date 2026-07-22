import { useEffect, useState, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { VariacaoInput } from '@/services/produtos-service'

export interface VariacaoFormValor extends VariacaoInput {
  nome: string
}

interface VariacaoDialogProps {
  aberto: boolean
  aoFechar: () => void
  aoSalvar: (valor: VariacaoFormValor) => void
  salvando?: boolean
  // Preenchido no modo edição.
  inicial?: Partial<VariacaoFormValor>
  titulo: string
}

function paraNumero(texto: string): number | undefined {
  if (texto.trim() === '') return undefined
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

export function VariacaoDialog({ aberto, aoFechar, aoSalvar, salvando, inicial, titulo }: VariacaoDialogProps) {
  const [nome, setNome] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [precoCusto, setPrecoCusto] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [sku, setSku] = useState('')
  const [estoqueMinimo, setEstoqueMinimo] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (aberto) {
      setNome(inicial?.nome ?? '')
      setPrecoVenda(inicial?.precoVenda != null ? String(inicial.precoVenda) : '')
      setPrecoCusto(inicial?.precoCusto != null ? String(inicial.precoCusto) : '')
      setCodigoBarras(inicial?.codigoBarras ?? '')
      setSku(inicial?.sku ?? '')
      setEstoqueMinimo(inicial?.estoqueMinimo != null ? String(inicial.estoqueMinimo) : '')
      setErro(null)
    }
  }, [aberto, inicial])

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault()
    const preco = paraNumero(precoVenda)
    if (preco === undefined || preco < 0.01) {
      setErro('Informe um preço de venda válido (maior que zero).')
      return
    }
    aoSalvar({
      nome: nome.trim() || 'Padrão',
      precoVenda: preco,
      precoCusto: paraNumero(precoCusto),
      codigoBarras: codigoBarras.trim() || undefined,
      sku: sku.trim() || undefined,
      estoqueMinimo: paraNumero(estoqueMinimo),
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>Estoque inicial é definido depois, pela tela de Estoque.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={aoSubmeter}>
          <div className="space-y-1.5">
            <Label htmlFor="var-nome">Nome da variação</Label>
            <Input id="var-nome" placeholder="ex.: 500ml, Grande, Chocolate" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="var-preco">Preço de venda (R$)</Label>
              <Input id="var-preco" inputMode="decimal" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="var-custo">Preço de custo (R$)</Label>
              <Input id="var-custo" inputMode="decimal" value={precoCusto} onChange={(e) => setPrecoCusto(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="var-codigo">Código de barras</Label>
              <Input id="var-codigo" value={codigoBarras} onChange={(e) => setCodigoBarras(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="var-min">Estoque mínimo</Label>
              <Input id="var-min" inputMode="decimal" value={estoqueMinimo} onChange={(e) => setEstoqueMinimo(e.target.value)} />
            </div>
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
