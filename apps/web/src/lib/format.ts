import type { TipoVenda } from '@pdv/shared-types'

const formatadorBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

// Formata valores monetários em Real. Use com a classe utilitária `tabular-nums`
// no elemento que exibe o resultado para alinhar colunas de valores em tabelas.
export function formatarBRL(valor: number): string {
  return formatadorBRL.format(valor)
}

// Produtos por unidade mostram quantidade inteira; peso/volume mostram 3 casas
// decimais (kg/L) — modelagem já prevista mesmo sem venda por peso no MVP.
export function formatarQuantidade(quantidade: number, tipoVenda: TipoVenda = 'UNIDADE'): string {
  if (tipoVenda === 'UNIDADE') {
    return quantidade.toLocaleString('pt-BR')
  }
  return quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}
