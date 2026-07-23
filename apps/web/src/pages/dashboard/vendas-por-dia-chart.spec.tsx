import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VendasPorDiaChart } from './vendas-por-dia-chart'
import type { VendaPorDia } from '@/services/dashboard-service'

const dados: VendaPorDia[] = [
  { data: '2026-07-20', quantidadeVendas: 0, faturamento: 0 },
  { data: '2026-07-21', quantidadeVendas: 2, faturamento: 26 },
  { data: '2026-07-22', quantidadeVendas: 1, faturamento: 58.5 },
]

describe('VendasPorDiaChart', () => {
  it('mostra estado vazio quando não há dias no período', () => {
    render(<VendasPorDiaChart dados={[]} />)
    expect(screen.getByText('Sem vendas no período.')).toBeInTheDocument()
  })

  it('rotula só o dia de pico faturamento, não todo dia', () => {
    render(<VendasPorDiaChart dados={dados} />)
    expect(screen.getAllByText(/R\$\s*58,50/).length).toBe(1)
    expect(screen.queryByText(/R\$\s*26,00/)).not.toBeInTheDocument()
  })

  it('mostra o tooltip da barra ao passar o mouse', async () => {
    const user = userEvent.setup()
    render(<VendasPorDiaChart dados={dados} />)

    const barraDia21 = screen.getByRole('button', { name: /21\/07.*2 vendas.*R\$\s*26,00/ })
    await user.hover(barraDia21)

    expect(await screen.findByText('21/07')).toBeInTheDocument()
    expect(screen.getByText(/2 vendas · R\$\s*26,00/)).toBeInTheDocument()
  })

  it('alterna para a visão em tabela e volta', async () => {
    const user = userEvent.setup()
    render(<VendasPorDiaChart dados={dados} />)

    await user.click(screen.getByRole('button', { name: 'Ver como tabela' }))
    expect(screen.getByRole('columnheader', { name: 'Faturamento' })).toBeInTheDocument()
    expect(screen.getAllByText(/R\$\s*0,00/).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Ver gráfico' }))
    expect(screen.queryByRole('columnheader', { name: 'Faturamento' })).not.toBeInTheDocument()
  })
})
