import type { Produto, Variacao } from '@/services/produtos-service'
import { formatarBRL } from '@/lib/format'

// Só variações ativas contam para o resumo exibido na lista.
function variacoesAtivas(produto: Produto): Variacao[] {
  return produto.variacoes.filter((v) => v.ativo)
}

// Preço único ("R$ 8,50") ou faixa ("R$ 8,50 – R$ 9,00") quando as variações
// têm preços diferentes.
export function resumoPreco(produto: Produto): string {
  const precos = variacoesAtivas(produto).map((v) => v.precoVenda)
  if (precos.length === 0) {
    return '—'
  }
  const min = Math.min(...precos)
  const max = Math.max(...precos)
  return min === max ? formatarBRL(min) : `${formatarBRL(min)} – ${formatarBRL(max)}`
}

export function estoqueTotal(produto: Produto): number {
  return variacoesAtivas(produto).reduce((soma, v) => soma + v.estoqueAtual, 0)
}

export function temRuptura(produto: Produto): boolean {
  return variacoesAtivas(produto).some((v) => v.emRuptura)
}
