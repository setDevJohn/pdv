import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FinalizarVendaDialog } from './finalizar-venda-dialog'
import * as vendasService from '@/services/vendas-service'
import type { VendaResumo } from '@/services/vendas-service'

vi.mock('@/services/vendas-service')

const venda: VendaResumo = {
  id: 'venda-1',
  status: 'ABERTA',
  subtotal: 20,
  desconto: 0,
  total: 20,
  troco: 0,
  criadoEm: '2026-07-22T10:00:00Z',
  finalizadoEm: null,
  canceladoEm: null,
  canceladoMotivo: null,
  quantidadeItens: 2,
  itens: [],
  pagamentos: [],
  operador: null,
}

function renderDialog(aoFechar = () => {}) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <FinalizarVendaDialog aberto aoFechar={aoFechar} venda={venda} />
    </QueryClientProvider>,
  )
}

describe('FinalizarVendaDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  });

  it('calcula o troco em tempo real conforme o dinheiro informado', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText('Dinheiro (R$)'), '25')

    expect(await screen.findByText(/R\$\s*5,00/)).toBeInTheDocument()
  });

  it('finaliza dividindo entre dinheiro e cartão e mostra o recibo', async () => {
    vi.mocked(vendasService.finalizarVenda).mockResolvedValue({
      ...venda,
      status: 'FINALIZADA',
      troco: 0,
      pagamentos: [
        { id: 'p1', forma: 'CARTAO', valor: 12, transacaoGatewayId: null },
        { id: 'p2', forma: 'DINHEIRO', valor: 8, transacaoGatewayId: null },
      ],
    })
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText('Cartão (R$)'), '12')
    await user.type(screen.getByLabelText('Dinheiro (R$)'), '8')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(vendasService.finalizarVenda).toHaveBeenCalledWith('venda-1', [
        { forma: 'DINHEIRO', valor: 8 },
        { forma: 'CARTAO', valor: 12 },
      ]),
    )
    expect(await screen.findByText('Venda finalizada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nova venda' })).toBeInTheDocument()
  });

  it('rejeita finalizar com valor pago menor que o total', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText('Dinheiro (R$)'), '10')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(vendasService.finalizarVenda).not.toHaveBeenCalled()
  });
});
