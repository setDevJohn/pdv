import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MovimentacaoDialog } from './movimentacao-dialog'
import * as estoqueService from '@/services/estoque-service'
import * as authService from '@/services/auth-service'
import { useAuthStore } from '@/stores/auth-store'
import type { Variacao } from '@/services/produtos-service'

vi.mock('@/services/estoque-service')
vi.mock('@/services/auth-service')

const estadoInicial = useAuthStore.getState()

const variacao: Variacao & { produtoNome: string } = {
  id: 'v1',
  produtoId: 'p1',
  produtoNome: 'Refrigerante',
  nome: 'Lata',
  sku: null,
  codigoBarras: null,
  precoVenda: 6.5,
  precoCusto: null,
  estoqueAtual: 10,
  estoqueMinimo: 3,
  emRuptura: false,
  ativo: true,
}

function entrarComo(perfil: 'ADMIN' | 'VENDEDOR') {
  useAuthStore.getState().definirSessaoLogin({
    accessToken: 't',
    usuario: { id: 'u1', nome: 'Fulano', email: 'f@e.com' },
    lojas: [{ lojaId: 'l1', nome: 'Loja', perfil }],
    lojaAtivaId: 'l1',
  })
}

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MovimentacaoDialog aberto aoFechar={() => {}} variacao={variacao} />
    </QueryClientProvider>,
  )
}

describe('MovimentacaoDialog', () => {
  beforeEach(() => {
    useAuthStore.setState(estadoInicial, true)
    vi.clearAllMocks()
    vi.mocked(estoqueService.registrarEntrada).mockResolvedValue({} as never)
    vi.mocked(estoqueService.registrarAjuste).mockResolvedValue({} as never)
    vi.mocked(authService.validarCodigoGerente).mockResolvedValue({ gerenteToken: 'g-token' })
  });

  it('registra entrada com a quantidade informada', async () => {
    entrarComo('ADMIN')
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByLabelText('Quantidade'), '5')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() =>
      expect(estoqueService.registrarEntrada).toHaveBeenCalledWith(
        expect.objectContaining({ produtoVariacaoId: 'v1', quantidade: 5 }),
      ),
    )
  });

  it('Vendedor: ajuste pede código de gerente e valida antes de ajustar', async () => {
    entrarComo('VENDEDOR')
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Ajuste' }))
    expect(screen.getByLabelText('Código de gerente')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Quantidade contada/), '8')
    await user.type(screen.getByLabelText('Código de gerente'), '1234')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(authService.validarCodigoGerente).toHaveBeenCalledWith('1234', 'AJUSTE_ESTOQUE'))
    expect(estoqueService.registrarAjuste).toHaveBeenCalledWith(
      expect.objectContaining({ produtoVariacaoId: 'v1', quantidadeContada: 8 }),
      'g-token',
    )
  });

  it('Admin: ajuste não pede código nem valida gerente', async () => {
    entrarComo('ADMIN')
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Ajuste' }))
    expect(screen.queryByLabelText('Código de gerente')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/Quantidade contada/), '8')
    await user.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() =>
      expect(estoqueService.registrarAjuste).toHaveBeenCalledWith(
        expect.objectContaining({ quantidadeContada: 8 }),
        undefined,
      ),
    )
    expect(authService.validarCodigoGerente).not.toHaveBeenCalled()
  });
});
