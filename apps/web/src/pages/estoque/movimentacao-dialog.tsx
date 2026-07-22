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
import { useEntrada, useSaida, useAjuste } from '@/hooks/use-estoque'
import { usePerfilAtivo } from '@/hooks/use-perfil-ativo'
import { validarCodigoGerente } from '@/services/auth-service'
import { formatarQuantidade } from '@/lib/format'
import type { Variacao } from '@/services/produtos-service'

type Tipo = 'ENTRADA' | 'SAIDA' | 'AJUSTE'

interface Props {
  aberto: boolean
  aoFechar: () => void
  variacao: (Variacao & { produtoNome?: string }) | null
}

function paraNumero(texto: string): number | undefined {
  if (texto.trim() === '') return undefined
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

export function MovimentacaoDialog({ aberto, aoFechar, variacao }: Props) {
  const perfil = usePerfilAtivo()
  const ehVendedor = perfil === 'VENDEDOR'

  const entrada = useEntrada()
  const saida = useSaida()
  const ajuste = useAjuste()

  const [tipo, setTipo] = useState<Tipo>('ENTRADA')
  const [quantidade, setQuantidade] = useState('')
  const [observacao, setObservacao] = useState('')
  const [codigoGerente, setCodigoGerente] = useState('')
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    if (aberto) {
      setTipo('ENTRADA')
      setQuantidade('')
      setObservacao('')
      setCodigoGerente('')
    }
  }, [aberto])

  if (!variacao) return null

  const precisaCodigo = tipo === 'AJUSTE' && ehVendedor

  function tratarErro(erro: unknown) {
    if (isAxiosError(erro) && erro.response?.status === 400) {
      toast.error('Estoque insuficiente para a saída.')
    } else if (isAxiosError(erro) && erro.response?.status === 403) {
      toast.error('Código de gerente inválido ou ação não autorizada.')
    } else {
      toast.error('Não foi possível registrar a movimentação.')
    }
  }

  async function aoSubmeter(evento: FormEvent) {
    evento.preventDefault()
    const qtd = paraNumero(quantidade)
    if (qtd === undefined || qtd < 0 || (tipo !== 'AJUSTE' && qtd <= 0)) {
      toast.error('Informe uma quantidade válida.')
      return
    }
    const produtoVariacaoId = variacao!.id

    try {
      setProcessando(true)
      if (tipo === 'ENTRADA') {
        await entrada.mutateAsync({ produtoVariacaoId, quantidade: qtd, observacao: observacao || undefined })
      } else if (tipo === 'SAIDA') {
        await saida.mutateAsync({ produtoVariacaoId, quantidade: qtd, observacao: observacao || undefined })
      } else {
        let gerenteToken: string | undefined
        if (ehVendedor) {
          const { gerenteToken: token } = await validarCodigoGerente(codigoGerente, 'AJUSTE_ESTOQUE')
          gerenteToken = token
        }
        await ajuste.mutateAsync({
          input: { produtoVariacaoId, quantidadeContada: qtd, observacao: observacao || undefined },
          gerenteToken,
        })
      }
      toast.success('Estoque atualizado.')
      aoFechar()
    } catch (erro) {
      tratarErro(erro)
    } finally {
      setProcessando(false)
    }
  }

  const nomeCompleto = `${variacao.produtoNome ? `${variacao.produtoNome} — ` : ''}${variacao.nome}`

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Movimentar estoque</DialogTitle>
          <DialogDescription>
            {nomeCompleto} · atual: {formatarQuantidade(variacao.estoqueAtual)}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={aoSubmeter}>
          <div className="grid grid-cols-3 gap-2">
            {(['ENTRADA', 'SAIDA', 'AJUSTE'] as Tipo[]).map((t) => (
              <Button
                key={t}
                type="button"
                variant={tipo === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTipo(t)}
              >
                {t === 'ENTRADA' ? 'Entrada' : t === 'SAIDA' ? 'Saída' : 'Ajuste'}
              </Button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qtd">{tipo === 'AJUSTE' ? 'Quantidade contada (novo total)' : 'Quantidade'}</Label>
            <Input id="qtd" inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="obs">Observação (opcional)</Label>
            <Input id="obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>

          {precisaCodigo && (
            <div className="space-y-1.5">
              <Label htmlFor="cod-gerente">Código de gerente</Label>
              <Input
                id="cod-gerente"
                type="password"
                value={codigoGerente}
                onChange={(e) => setCodigoGerente(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Ajuste de contagem exige aprovação de um gerente.</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={processando}>
              {processando ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
