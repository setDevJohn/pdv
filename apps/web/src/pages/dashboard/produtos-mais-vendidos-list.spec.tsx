import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProdutosMaisVendidosList } from './produtos-mais-vendidos-list'
import type { ProdutoMaisVendido } from '@/services/dashboard-service'

describe('ProdutosMaisVendidosList', () => {
  it('mostra estado vazio sem produtos', () => {
    render(<ProdutosMaisVendidosList produtos={[]} />)
    expect(screen.getByText('Sem vendas no período.')).toBeInTheDocument()
  })

  it('lista os produtos com quantidade e total', () => {
    const produtos: ProdutoMaisVendido[] = [
      { produtoVariacaoId: 'v1', descricao: 'Refrigerante Lata 350ml', quantidade: 46, total: 299 },
      { produtoVariacaoId: 'v2', descricao: 'Água 500ml', quantidade: 10, total: 25 },
    ]

    render(<ProdutosMaisVendidosList produtos={produtos} />)

    expect(screen.getByText('Refrigerante Lata 350ml')).toBeInTheDocument()
    expect(screen.getByText(/46 · R\$\s*299,00/)).toBeInTheDocument()
    expect(screen.getByText('Água 500ml')).toBeInTheDocument()
    expect(screen.getByText(/10 · R\$\s*25,00/)).toBeInTheDocument()
  })
})
