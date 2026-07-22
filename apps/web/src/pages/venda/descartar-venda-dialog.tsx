import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDescartarVenda } from '@/hooks/use-vendas'

interface Props {
  aberto: boolean
  aoFechar: () => void
  vendaId: string
}

export function DescartarVendaDialog({ aberto, aoFechar, vendaId }: Props) {
  const descartar = useDescartarVenda()

  function aoConfirmar() {
    descartar.mutate(vendaId, {
      onSuccess: () => {
        toast.success('Venda descartada.')
        aoFechar()
      },
      onError: () => toast.error('Não foi possível descartar a venda.'),
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Descartar venda</DialogTitle>
          <DialogDescription>Os itens do carrinho serão perdidos. Nenhum estoque foi baixado ainda.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={aoConfirmar} disabled={descartar.isPending}>
            {descartar.isPending ? 'Descartando...' : 'Descartar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
