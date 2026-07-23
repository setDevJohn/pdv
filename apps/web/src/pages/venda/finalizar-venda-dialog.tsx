import { useEffect, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
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
import { useFinalizarVenda, useReiniciarVenda } from '@/hooks/use-vendas'
import { formatarBRL } from '@/lib/format'
import type { FormaPagamento, VendaResumo } from '@/services/vendas-service'

const ROTULO_FORMA: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  PIX: 'Pix',
}

interface Props {
  aberto: boolean
  aoFechar: () => void
  venda: VendaResumo
}

function paraNumero(texto: string): number {
  if (texto.trim() === '') return 0
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function FinalizarVendaDialog({ aberto, aoFechar, venda }: Props) {
  const finalizar = useFinalizarVenda(venda.id)
  const reiniciarVenda = useReiniciarVenda()

  const [dinheiro, setDinheiro] = useState('')
  const [cartao, setCartao] = useState('')
  const [pix, setPix] = useState('')
  const [resultado, setResultado] = useState<VendaResumo | null>(null)

  useEffect(() => {
    if (aberto) {
      setDinheiro('')
      setCartao('')
      setPix('')
      setResultado(null)
    }
  }, [aberto])

  const valorDinheiro = paraNumero(dinheiro)
  const valorCartao = paraNumero(cartao)
  const valorPix = paraNumero(pix)
  const outrasFormas = valorCartao + valorPix
  const faltaEmDinheiro = Math.max(0, venda.total - outrasFormas)
  const troco = Math.max(0, valorDinheiro - faltaEmDinheiro)
  const totalPago = valorDinheiro + outrasFormas
  // Tolerância de arredondamento de ponto flutuante nos centavos.
  const cobreOTotal = totalPago >= venda.total - 0.001

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault()
    if (outrasFormas > venda.total + 0.001) {
      toast.error('Pagamento em cartão/Pix não pode exceder o total.')
      return
    }
    if (!cobreOTotal) {
      toast.error('O valor pago é menor que o total da venda.')
      return
    }

    const pagamentos = (
      [
        valorDinheiro > 0 && { forma: 'DINHEIRO' as const, valor: valorDinheiro },
        valorCartao > 0 && { forma: 'CARTAO' as const, valor: valorCartao },
        valorPix > 0 && { forma: 'PIX' as const, valor: valorPix },
      ] as const
    ).filter((p): p is { forma: FormaPagamento; valor: number } => Boolean(p))

    if (pagamentos.length === 0) {
      toast.error('Informe ao menos uma forma de pagamento.')
      return
    }

    finalizar.mutate(pagamentos, {
      onSuccess: setResultado,
      onError: (erro) => {
        if (isAxiosError(erro) && erro.response?.status === 404) {
          toast.error('Abra o caixa antes de finalizar a venda.')
        } else if (isAxiosError(erro) && erro.response?.status === 400) {
          toast.error('Não foi possível finalizar: confira os valores informados.')
        } else {
          toast.error('Não foi possível finalizar a venda.')
        }
      },
    })
  }

  function aoConcluir() {
    reiniciarVenda()
    aoFechar()
  }

  if (resultado) {
    return (
      <Dialog open={aberto} onOpenChange={(v) => !v && aoConcluir()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Venda finalizada</DialogTitle>
            <DialogDescription>Total {formatarBRL(resultado.total)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            {resultado.pagamentos.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span className="text-muted-foreground">{ROTULO_FORMA[p.forma]}</span>
                <span className="tabular-nums">{formatarBRL(p.valor)}</span>
              </div>
            ))}
            {resultado.troco > 0 && (
              <div className="flex justify-between border-t pt-1 font-medium">
                <span>Troco</span>
                <span className="tabular-nums">{formatarBRL(resultado.troco)}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={aoConcluir} autoFocus>
              Nova venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar venda</DialogTitle>
          <DialogDescription>Total a pagar: {formatarBRL(venda.total)}</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={aoSubmeter}>
          <div className="space-y-1.5">
            <Label htmlFor="pg-dinheiro">Dinheiro (R$)</Label>
            <Input id="pg-dinheiro" inputMode="decimal" value={dinheiro} onChange={(e) => setDinheiro(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-cartao">Cartão (R$)</Label>
            <Input id="pg-cartao" inputMode="decimal" value={cartao} onChange={(e) => setCartao(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-pix">Pix (R$)</Label>
            <Input id="pg-pix" inputMode="decimal" value={pix} onChange={(e) => setPix(e.target.value)} />
          </div>
          {valorDinheiro > 0 && (
            <p className="text-sm text-muted-foreground">
              Troco: <span className="tabular-nums font-medium text-foreground">{formatarBRL(troco)}</span>
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={finalizar.isPending}>
              {finalizar.isPending ? 'Finalizando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
