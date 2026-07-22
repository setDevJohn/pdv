import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ArrowDownCircleIcon, LockIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EstadoErro, EstadoVazio } from '@/components/estado'
import { useAbrirCaixa, useCaixaAtual } from '@/hooks/use-caixa'
import { formatarBRL } from '@/lib/format'
import type { CaixaResumo } from '@/services/caixa-service'
import { SangriaDialog } from './sangria-dialog'
import { FecharCaixaDialog } from './fechar-caixa-dialog'

function paraNumero(texto: string): number | undefined {
  if (texto.trim() === '') return undefined
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

function AbrirCaixa() {
  const abrir = useAbrirCaixa()
  const [valor, setValor] = useState('')

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault()
    const v = paraNumero(valor)
    if (v === undefined || v < 0) {
      toast.error('Informe o valor inicial (pode ser 0).')
      return
    }
    abrir.mutate(v, {
      onSuccess: () => toast.success('Caixa aberto.'),
      onError: () => toast.error('Não foi possível abrir o caixa.'),
    })
  }

  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Abrir caixa</CardTitle>
        <CardDescription>Declare o valor em dinheiro que inicia o turno.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={aoSubmeter}>
          <div className="space-y-1.5">
            <Label htmlFor="valor-inicial">Valor inicial (R$)</Label>
            <Input id="valor-inicial" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
          </div>
          <Button type="submit" className="w-full" disabled={abrir.isPending}>
            {abrir.isPending ? 'Abrindo...' : 'Abrir caixa'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function CaixaAberto({ caixa }: { caixa: CaixaResumo }) {
  const [sangriaAberta, setSangriaAberta] = useState(false)
  const [fecharAberto, setFecharAberto] = useState(false)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Valor inicial</p>
            <p className="font-heading text-lg font-semibold tabular-nums">{formatarBRL(caixa.valorInicial)}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Sangrias</p>
            <p className="font-heading text-lg font-semibold tabular-nums">{formatarBRL(caixa.totalSangrias)}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-xs text-muted-foreground">Saldo em dinheiro</p>
            <p className="font-heading text-lg font-semibold tabular-nums">{formatarBRL(caixa.saldoEmDinheiro)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setSangriaAberta(true)}>
          <ArrowDownCircleIcon />
          Sangria
        </Button>
        <Button variant="destructive" onClick={() => setFecharAberto(true)}>
          <LockIcon />
          Fechar caixa
        </Button>
      </div>

      <div>
        <h2 className="mb-2 font-heading text-base font-medium">Sangrias do turno</h2>
        {caixa.sangrias.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma sangria registrada.</p>
        ) : (
          <ul className="divide-y rounded-lg ring-1 ring-foreground/10">
            {caixa.sangrias.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <span className="tabular-nums font-medium">{formatarBRL(s.valor)}</span>
                  {s.motivo && <span className="ml-2 text-muted-foreground">{s.motivo}</span>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {s.usuario}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SangriaDialog aberto={sangriaAberta} aoFechar={() => setSangriaAberta(false)} saldoDisponivel={caixa.saldoEmDinheiro} />
      <FecharCaixaDialog aberto={fecharAberto} aoFechar={() => setFecharAberto(false)} saldoEsperado={caixa.saldoEmDinheiro} />
    </div>
  )
}

export function CaixaPage() {
  const { data, isPending, isError, refetch } = useCaixaAtual()

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">Caixa</h1>
        <p className="text-sm text-muted-foreground">Abertura, sangria e fechamento do turno.</p>
      </div>

      {isError ? (
        <EstadoErro aoTentarNovamente={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full max-w-sm" />
        </div>
      ) : data ? (
        <CaixaAberto caixa={data} />
      ) : (
        <>
          <EstadoVazio titulo="Nenhum caixa aberto" descricao="Abra o caixa para começar o turno." />
          <div className="flex justify-center">
            <AbrirCaixa />
          </div>
        </>
      )}
    </div>
  )
}
