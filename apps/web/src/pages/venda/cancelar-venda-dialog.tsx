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
import { useCancelarVenda } from '@/hooks/use-vendas'
import { usePerfilAtivo } from '@/hooks/use-perfil-ativo'
import { validarCodigoGerente } from '@/services/auth-service'
import { formatarBRL } from '@/lib/format'
import type { VendaResumo } from '@/services/vendas-service'

interface Props {
  aberto: boolean
  aoFechar: () => void
  venda: VendaResumo | null
}

export function CancelarVendaDialog({ aberto, aoFechar, venda }: Props) {
  const perfil = usePerfilAtivo()
  const ehVendedor = perfil === 'VENDEDOR'
  const cancelar = useCancelarVenda()

  const [motivo, setMotivo] = useState('')
  const [codigoGerente, setCodigoGerente] = useState('')
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    if (aberto) {
      setMotivo('')
      setCodigoGerente('')
    }
  }, [aberto])

  if (!venda) return null

  async function aoSubmeter(evento: FormEvent) {
    evento.preventDefault()
    try {
      setProcessando(true)
      let gerenteToken: string | undefined
      if (ehVendedor) {
        const r = await validarCodigoGerente(codigoGerente, 'CANCELAR_VENDA')
        gerenteToken = r.gerenteToken
      }
      await cancelar.mutateAsync({ vendaId: venda!.id, motivo: motivo.trim() || undefined, gerenteToken })
      toast.success('Venda cancelada.')
      aoFechar()
    } catch (erro) {
      if (isAxiosError(erro) && erro.response?.status === 403) {
        toast.error('Código de gerente inválido ou ação não autorizada.')
      } else {
        toast.error('Não foi possível cancelar a venda.')
      }
    } finally {
      setProcessando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar venda</DialogTitle>
          <DialogDescription>
            Total {formatarBRL(venda.total)} — o estoque dos itens é devolvido automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={aoSubmeter}>
          <div className="space-y-1.5">
            <Label htmlFor="cancelar-motivo">Motivo (opcional)</Label>
            <Input id="cancelar-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus={!ehVendedor} />
          </div>

          {ehVendedor && (
            <div className="space-y-1.5">
              <Label htmlFor="cancelar-cod-gerente">Código de gerente</Label>
              <Input
                id="cancelar-cod-gerente"
                type="password"
                value={codigoGerente}
                onChange={(e) => setCodigoGerente(e.target.value)}
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">Cancelamento de venda finalizada exige aprovação de um gerente.</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar}>
              Voltar
            </Button>
            <Button type="submit" variant="destructive" disabled={processando}>
              {processando ? 'Cancelando...' : 'Cancelar venda'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
