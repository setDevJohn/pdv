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
import { useSangria } from '@/hooks/use-caixa'
import { formatarBRL } from '@/lib/format'

interface Props {
  aberto: boolean
  aoFechar: () => void
  saldoDisponivel: number
}

function paraNumero(texto: string): number | undefined {
  if (texto.trim() === '') return undefined
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

export function SangriaDialog({ aberto, aoFechar, saldoDisponivel }: Props) {
  const sangria = useSangria()
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (aberto) {
      setValor('')
      setMotivo('')
    }
  }, [aberto])

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault()
    const v = paraNumero(valor)
    if (v === undefined || v <= 0) {
      toast.error('Informe um valor válido.')
      return
    }
    sangria.mutate(
      { valor: v, motivo: motivo.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Sangria registrada.')
          aoFechar()
        },
        onError: (erro) => {
          if (isAxiosError(erro) && erro.response?.status === 400) {
            toast.error('Sangria maior que o saldo em dinheiro disponível.')
          } else {
            toast.error('Não foi possível registrar a sangria.')
          }
        },
      },
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar sangria</DialogTitle>
          <DialogDescription>Retirada de dinheiro do caixa. Disponível: {formatarBRL(saldoDisponivel)}.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={aoSubmeter}>
          <div className="space-y-1.5">
            <Label htmlFor="sangria-valor">Valor (R$)</Label>
            <Input id="sangria-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sangria-motivo">Motivo (opcional)</Label>
            <Input id="sangria-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={sangria.isPending}>
              {sangria.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
