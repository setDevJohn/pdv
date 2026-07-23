import { useId, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatarBRL } from '@/lib/format'
import type { VendaPorDia } from '@/services/dashboard-service'

// Altura das barras + cabeçalho reservado pro rótulo do pico. Reservar o
// espaço dentro do próprio container (em vez de deixar o rótulo vazar pra
// fora do fluxo) importa porque o Card ancestral corta overflow — um rótulo
// fora da caixa do container simplesmente some, sem aviso.
const ALTURA_BARRAS = 100
const ALTURA_ROTULO = 20
const ALTURA_GRAFICO = ALTURA_BARRAS + ALTURA_ROTULO

function formatarDataCurta(iso: string): string {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

interface Props {
  dados: VendaPorDia[]
}

// Barras de faturamento por dia — série única, uma cor só (sequencial),
// rótulo direto apenas no pico (evita poluir com um valor por barra) e
// tooltip por barra no hover/foco. Alternativa em tabela para acessibilidade.
export function VendasPorDiaChart({ dados }: Props) {
  const [comoTabela, setComoTabela] = useState(false)
  const [ativo, setAtivo] = useState<number | null>(null)
  const idTabela = useId()

  if (dados.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sem vendas no período.</p>
  }

  const maiorFaturamento = Math.max(...dados.map((d) => d.faturamento), 0.01)
  const indicePico = dados.reduce((maiorIdx, d, i) => (d.faturamento > dados[maiorIdx].faturamento ? i : maiorIdx), 0)
  const larguraBarra = Math.max(4, Math.min(28, 640 / dados.length))

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          onClick={() => setComoTabela((v) => !v)}
          aria-expanded={comoTabela}
          aria-controls={idTabela}
        >
          {comoTabela ? 'Ver gráfico' : 'Ver como tabela'}
        </button>
      </div>

      {comoTabela ? (
        <div id={idTabela} className="max-h-64 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((d) => (
                <TableRow key={d.data}>
                  <TableCell>{formatarDataCurta(d.data)}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.quantidadeVendas}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatarBRL(d.faturamento)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        // Sem overflow-x-auto de propósito: `larguraBarra` já encolhe pra
        // caber em ~640px em qualquer contagem de dias (mínimo 4px), e
        // `overflow-x` sozinho faria o navegador computar `overflow-y` como
        // `auto` também (regra do spec CSS Overflow), cortando o tooltip que
        // aparece acima da barra.
        <div id={idTabela}>
          <div className="flex items-end gap-0.5" style={{ height: ALTURA_GRAFICO }}>
            {dados.map((d, i) => {
              // Dia sem venda vira um traço recessivo (tom de grade), não uma
              // barra "pequena" na cor da série — senão uma sequência de dias
              // zerados lê como uma linha tracejada em vez de "sem dado".
              const semVenda = d.faturamento === 0
              const altura = semVenda ? 1 : Math.max(3, (d.faturamento / maiorFaturamento) * ALTURA_BARRAS)
              return (
                <div key={d.data} className="relative flex h-full flex-col justify-end" style={{ width: larguraBarra }}>
                  {i === indicePico && d.faturamento > 0 && (
                    // Posicionado a partir do topo da própria barra (não
                    // `bottom-full`) para ficar dentro da caixa do container,
                    // que reserva ALTURA_ROTULO de sobra exatamente pra isso.
                    <span
                      className="absolute left-1/2 -translate-x-1/2 text-center text-[10px] whitespace-nowrap text-muted-foreground tabular-nums"
                      style={{ bottom: altura + 4 }}
                    >
                      {formatarBRL(d.faturamento)}
                    </span>
                  )}
                  <button
                    type="button"
                    className={
                      semVenda
                        ? 'w-full rounded-t bg-foreground/15'
                        : 'w-full rounded-t bg-primary/80 transition-colors hover:bg-primary focus-visible:bg-primary focus-visible:outline-none'
                    }
                    style={{ height: altura }}
                    onMouseEnter={() => setAtivo(i)}
                    onMouseLeave={() => setAtivo(null)}
                    onFocus={() => setAtivo(i)}
                    onBlur={() => setAtivo(null)}
                    aria-label={`${formatarDataCurta(d.data)}: ${d.quantidadeVendas} ${d.quantidadeVendas === 1 ? 'venda' : 'vendas'}, ${formatarBRL(d.faturamento)}`}
                  />
                  {ativo === i && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground ring-1 ring-foreground/10">
                      <p className="font-medium">{formatarDataCurta(d.data)}</p>
                      <p className="text-muted-foreground">
                        {d.quantidadeVendas} {d.quantidadeVendas === 1 ? 'venda' : 'vendas'} · {formatarBRL(d.faturamento)}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-1 h-px bg-foreground/10" />
        </div>
      )}
    </div>
  )
}
