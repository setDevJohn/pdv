import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from './dashboard-page'
import * as dashboardService from '@/services/dashboard-service'

vi.mock('@/services/dashboard-service')

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(dashboardService.obterResumo).mockResolvedValue({
      hoje: { quantidadeVendas: 1, faturamento: 32.5 },
      semana: { quantidadeVendas: 3, faturamento: 110.5 },
      mes: { quantidadeVendas: 10, faturamento: 299 },
      ticketMedioMes: 29.9,
    })
    vi.mocked(dashboardService.obterVendasPorDia).mockResolvedValue([{ data: '2026-07-22', quantidadeVendas: 1, faturamento: 32.5 }])
    vi.mocked(dashboardService.obterProdutosMaisVendidos).mockResolvedValue([
      { produtoVariacaoId: 'v1', descricao: 'Refrigerante', quantidade: 46, total: 299 },
    ])
  });

  it('mostra o resumo de hoje/semana/mês e o ticket médio', async () => {
    renderPage()

    expect(await screen.findByText('Vendas hoje')).toBeInTheDocument()
    expect(screen.getAllByText(/R\$\s*32,50/).length).toBeGreaterThan(0)
    expect(screen.getByText(/R\$\s*110,50/)).toBeInTheDocument()
    expect(screen.getAllByText(/R\$\s*299,00/).length).toBeGreaterThan(0)
    expect(screen.getByText(/R\$\s*29,90/)).toBeInTheDocument()
  });

  it('troca o período ao clicar num preset e refaz a busca com o novo intervalo', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Vendas hoje')
    const chamadasAntes = vi.mocked(dashboardService.obterVendasPorDia).mock.calls.length

    await user.click(screen.getByRole('button', { name: '7 dias' }))

    await waitFor(() => expect(vi.mocked(dashboardService.obterVendasPorDia).mock.calls.length).toBeGreaterThan(chamadasAntes))
    const ultimaChamada = vi.mocked(dashboardService.obterVendasPorDia).mock.calls.at(-1)![0]
    const dias =
      (new Date(ultimaChamada.ate as string).getTime() - new Date(ultimaChamada.de as string).getTime()) / (24 * 60 * 60 * 1000)
    expect(dias).toBe(6)
  });

  it('exporta a planilha do período atual', async () => {
    vi.mocked(dashboardService.exportarPlanilha).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Vendas hoje')
    await user.click(screen.getByRole('button', { name: 'Exportar Excel' }))

    await waitFor(() => expect(dashboardService.exportarPlanilha).toHaveBeenCalled())
  });
});
