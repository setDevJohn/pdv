import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CaixaPage } from './caixa-page'
import * as caixaService from '@/services/caixa-service'
import type { CaixaResumo } from '@/services/caixa-service'

vi.mock('@/services/caixa-service')

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CaixaPage />
    </QueryClientProvider>,
  )
}

const caixaAberto: CaixaResumo = {
  id: 'cx1',
  status: 'ABERTO',
  valorInicial: 100,
  valorFechamento: null,
  abertoEm: '2026-07-22T10:00:00Z',
  fechadoEm: null,
  operador: 'Fulano',
  totalSangrias: 30,
  vendasDinheiro: 0,
  saldoEmDinheiro: 70,
  sangrias: [{ id: 's1', valor: 30, motivo: 'troco', criadoEm: '2026-07-22T11:00:00Z', usuario: 'Fulano' }],
}

describe('CaixaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  });

  it('mostra o formulário de abertura quando não há caixa aberto', async () => {
    vi.mocked(caixaService.obterCaixaAtual).mockResolvedValue(null)

    renderPage()

    expect(await screen.findByText('Nenhum caixa aberto')).toBeInTheDocument()
    expect(screen.getByLabelText('Valor inicial (R$)')).toBeInTheDocument()
  });

  it('abre o caixa com o valor informado', async () => {
    vi.mocked(caixaService.obterCaixaAtual).mockResolvedValue(null)
    vi.mocked(caixaService.abrirCaixa).mockResolvedValue(caixaAberto)
    const user = userEvent.setup()

    renderPage()

    await user.type(await screen.findByLabelText('Valor inicial (R$)'), '100')
    await user.click(screen.getByRole('button', { name: 'Abrir caixa' }))

    await waitFor(() => expect(caixaService.abrirCaixa).toHaveBeenCalledWith(100))
  });

  it('mostra o resumo (saldo e sangrias) quando há caixa aberto', async () => {
    vi.mocked(caixaService.obterCaixaAtual).mockResolvedValue(caixaAberto)

    renderPage()

    // saldo em dinheiro 70 aparece
    expect(await screen.findByText(/R\$\s*70,00/)).toBeInTheDocument()
    expect(screen.getByText('Saldo em dinheiro')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fechar caixa/i })).toBeInTheDocument()
    expect(screen.getByText('troco')).toBeInTheDocument()
  });
});
