import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HistoricoVendasPage } from './historico-vendas-page'
import * as vendasService from '@/services/vendas-service'
import * as authService from '@/services/auth-service'
import * as impressora from '@/lib/webusb-printer'
import { useAuthStore } from '@/stores/auth-store'
import type { VendaResumo } from '@/services/vendas-service'

vi.mock('@/services/vendas-service')
vi.mock('@/services/auth-service')
vi.mock('@/lib/webusb-printer')

const estadoInicial = useAuthStore.getState()

function entrarComo(perfil: 'ADMIN' | 'VENDEDOR') {
  useAuthStore.getState().definirSessaoLogin({
    accessToken: 't',
    usuario: { id: 'u1', nome: 'Fulano', email: 'f@e.com' },
    lojas: [{ lojaId: 'l1', nome: 'Loja', perfil }],
    lojaAtivaId: 'l1',
  })
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HistoricoVendasPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const vendaFinalizada: VendaResumo = {
  id: 'venda-1',
  status: 'FINALIZADA',
  subtotal: 20,
  desconto: 0,
  total: 20,
  troco: 0,
  criadoEm: '2026-07-22T10:00:00Z',
  finalizadoEm: '2026-07-22T10:05:00Z',
  canceladoEm: null,
  canceladoMotivo: null,
  quantidadeItens: 2,
  itens: [],
  pagamentos: [],
  operador: 'Fulano',
}

describe('HistoricoVendasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState(estadoInicial, true)
  });

  it('lista as vendas finalizadas', async () => {
    vi.mocked(vendasService.listarVendas).mockResolvedValue({ items: [vendaFinalizada], total: 1, pagina: 1, porPagina: 20 })

    renderPage()

    expect(await screen.findByText('Fulano')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  });

  it('Admin cancela sem precisar de código de gerente', async () => {
    entrarComo('ADMIN')
    vi.mocked(vendasService.listarVendas).mockResolvedValue({ items: [vendaFinalizada], total: 1, pagina: 1, porPagina: 20 })
    vi.mocked(vendasService.cancelarVenda).mockResolvedValue({ ...vendaFinalizada, status: 'CANCELADA' })
    const user = userEvent.setup()

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar venda' }))

    await waitFor(() => expect(vendasService.cancelarVenda).toHaveBeenCalledWith('venda-1', undefined, undefined))
    expect(authService.validarCodigoGerente).not.toHaveBeenCalled()
  });

  it('Vendedor precisa validar o código de gerente antes de cancelar', async () => {
    entrarComo('VENDEDOR')
    vi.mocked(vendasService.listarVendas).mockResolvedValue({ items: [vendaFinalizada], total: 1, pagina: 1, porPagina: 20 })
    vi.mocked(authService.validarCodigoGerente).mockResolvedValue({ gerenteToken: 'tok-1' })
    vi.mocked(vendasService.cancelarVenda).mockResolvedValue({ ...vendaFinalizada, status: 'CANCELADA' })
    const user = userEvent.setup()

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))
    await user.type(screen.getByLabelText('Código de gerente'), '1234')
    await user.click(screen.getByRole('button', { name: 'Cancelar venda' }))

    await waitFor(() => expect(authService.validarCodigoGerente).toHaveBeenCalledWith('1234', 'CANCELAR_VENDA'))
    expect(vendasService.cancelarVenda).toHaveBeenCalledWith('venda-1', undefined, 'tok-1')
  });

  it('não mostra o botão de imprimir sem suporte a WebUSB', async () => {
    vi.mocked(impressora.impressoraSuportada).mockReturnValue(false)
    vi.mocked(vendasService.listarVendas).mockResolvedValue({ items: [vendaFinalizada], total: 1, pagina: 1, porPagina: 20 })

    renderPage()

    await screen.findByText('Fulano')
    expect(screen.queryByRole('button', { name: 'Imprimir recibo' })).not.toBeInTheDocument()
  });

  it('busca o detalhe completo da venda e imprime', async () => {
    vi.mocked(impressora.impressoraSuportada).mockReturnValue(true)
    vi.mocked(impressora.imprimir).mockResolvedValue(undefined)
    vi.mocked(vendasService.listarVendas).mockResolvedValue({ items: [vendaFinalizada], total: 1, pagina: 1, porPagina: 20 })
    const vendaComItens = { ...vendaFinalizada, itens: [{ id: 'i1', produtoVariacaoId: 'v1', descricao: 'Refrigerante', quantidade: 2, precoUnitario: 6.5, total: 13 }] }
    vi.mocked(vendasService.buscarVendaPorId).mockResolvedValue(vendaComItens)
    const user = userEvent.setup()

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Imprimir recibo' }))

    await waitFor(() => expect(vendasService.buscarVendaPorId).toHaveBeenCalledWith('venda-1'))
    expect(impressora.imprimir).toHaveBeenCalled()
  });
});
