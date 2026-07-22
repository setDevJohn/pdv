import { useEffect, useState, type FormEvent } from 'react'
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
import { useFecharCaixa, useInvalidarCaixa } from '@/hooks/use-caixa'
import { formatarBRL } from '@/lib/format'
import type { FechamentoResultado } from '@/services/caixa-service'

interface Props {
  aberto: boolean
  aoFechar: () => void
  saldoEsperado: number
}

function paraNumero(texto: string): number | undefined {
  if (texto.trim() === '') return undefined
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

export function FecharCaixaDialog({ aberto, aoFechar, saldoEsperado }: Props) {
  const fechar = useFecharCaixa()
  const invalidarCaixa = useInvalidarCaixa()
  const [valor, setValor] = useState('')
  const [resultado, setResultado] = useState<FechamentoResultado | null>(null)

  // Só recarrega o caixa (que passa a não existir) ao concluir — assim a tela
  // de diferença fica visível até o usuário fechá-la.
  function aoConcluir() {
    invalidarCaixa()
    aoFechar()
  }

  useEffect(() => {
    if (aberto) {
      setValor('')
      setResultado(null)
    }
  }, [aberto])

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault()
    const v = paraNumero(valor)
    if (v === undefined || v < 0) {
      toast.error('Informe o valor contado.')
      return
    }
    fechar.mutate(v, {
      onSuccess: (r) => {
        setResultado(r)
        toast.success('Caixa fechado.')
      },
      onError: () => toast.error('Não foi possível fechar o caixa.'),
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && (resultado ? aoConcluir() : aoFechar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar caixa</DialogTitle>
          <DialogDescription>Informe o valor em dinheiro contado na gaveta.</DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Esperado</span>
                <span className="tabular-nums">{formatarBRL(resultado.valorEsperado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contado</span>
                <span className="tabular-nums">{formatarBRL(resultado.valorFechamento ?? 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-medium">
                <span>Diferença</span>
                <span
                  className={
                    resultado.diferenca === 0
                      ? 'tabular-nums text-success'
                      : 'tabular-nums text-destructive'
                  }
                >
                  {formatarBRL(resultado.diferenca)}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {resultado.diferenca === 0
                ? 'Caixa conferido sem diferença.'
                : resultado.diferenca > 0
                  ? 'Sobra em relação ao esperado.'
                  : 'Falta em relação ao esperado.'}
            </p>
            <DialogFooter>
              <Button onClick={aoConcluir}>Concluir</Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={aoSubmeter}>
            <p className="text-sm text-muted-foreground">
              Saldo esperado em dinheiro: <span className="tabular-nums">{formatarBRL(saldoEsperado)}</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="fechar-valor">Valor contado (R$)</Label>
              <Input id="fechar-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={aoFechar}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={fechar.isPending}>
                {fechar.isPending ? 'Fechando...' : 'Fechar caixa'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
