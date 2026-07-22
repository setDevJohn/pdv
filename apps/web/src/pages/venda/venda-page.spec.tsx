import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VendaPage } from './venda-page'
import * as vendasService from '@/services/vendas-service'
import type { VendaResumo } from '@/services/vendas-service'

vi.mock('@/services/vendas-service')

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <VendaPage />
    </QueryClientProvider>,
  )
}

const vendaVazia: VendaResumo = {
  id: 'venda-1',
  status: 'ABERTA',
  subtotal: 0,
  desconto: 0,
  total: 0,
  criadoEm: '2026-07-22T10:00:00Z',
  quantidadeItens: 0,
  itens: [],
}

const item = {
  id: 'i1',
  produtoVariacaoId: 'v1',
  descricao: 'Refrigerante',
  quantidade: 1,
  precoUnitario: 5,
  total: 5,
}

describe('VendaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  });

  it('abre uma venda automaticamente quando não há carrinho em andamento', async () => {
    vi.mocked(vendasService.obterVendaAberta).mockResolvedValue(null)
    vi.mocked(vendasService.abrirVenda).mockResolvedValue(vendaVazia)

    renderPage()

    await waitFor(() => expect(vendasService.abrirVenda).toHaveBeenCalled())
    expect(await screen.findByText('Carrinho vazio')).toBeInTheDocument()
  });

  it('bipa um código de barras exato e adiciona o item ao carrinho', async () => {
    // obterVendaAberta reflete o estado "no servidor": muda depois que o mock
    // de adicionarItemVenda resolve, para simular a invalidação pós-mutação.
    let vendaNoServidor: VendaResumo = vendaVazia
    vi.mocked(vendasService.obterVendaAberta).mockImplementation(async () => vendaNoServidor)
    vi.mocked(vendasService.buscarItens).mockResolvedValue({
      exato: { produtoVariacaoId: 'v1', descricao: 'Refrigerante', codigoBarras: '789', precoVenda: 5, estoqueAtual: 10 },
      opcoes: [],
    })
    vi.mocked(vendasService.adicionarItemVenda).mockImplementation(async () => {
      vendaNoServidor = { ...vendaVazia, subtotal: 5, total: 5, quantidadeItens: 1, itens: [item] }
      return vendaNoServidor
    })
    const user = userEvent.setup()

    renderPage()

    const campo = await screen.findByPlaceholderText('Código de barras, nome ou SKU')
    await user.type(campo, '789')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    await waitFor(() =>
      expect(vendasService.adicionarItemVenda).toHaveBeenCalledWith('venda-1', { produtoVariacaoId: 'v1', quantidade: 1 }),
    )
    expect(await screen.findByText('Refrigerante')).toBeInTheDocument()
  });

  it('mostra opções quando a busca não bate em um código de barras exato', async () => {
    vi.mocked(vendasService.obterVendaAberta).mockResolvedValue(vendaVazia)
    vi.mocked(vendasService.buscarItens).mockResolvedValue({
      exato: null,
      opcoes: [
        { produtoVariacaoId: 'v1', descricao: 'Refrigerante Lata', codigoBarras: null, precoVenda: 5, estoqueAtual: 10 },
        { produtoVariacaoId: 'v2', descricao: 'Refrigerante 2L', codigoBarras: null, precoVenda: 9, estoqueAtual: 4 },
      ],
    })
    const user = userEvent.setup()

    renderPage()

    const campo = await screen.findByPlaceholderText('Código de barras, nome ou SKU')
    await user.type(campo, 'refri')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    expect(await screen.findByText('Refrigerante Lata')).toBeInTheDocument()
    expect(screen.getByText('Refrigerante 2L')).toBeInTheDocument()
  });

  it('mostra o carrinho com os itens e o total', async () => {
    vi.mocked(vendasService.obterVendaAberta).mockResolvedValue({
      ...vendaVazia,
      subtotal: 5,
      total: 5,
      quantidadeItens: 1,
      itens: [item],
    })

    renderPage()

    expect(await screen.findByText('Refrigerante')).toBeInTheDocument()
    expect(screen.getAllByText(/R\$\s*5,00/).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Descartar venda' })).toBeInTheDocument()
  });
});
