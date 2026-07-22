import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProdutosPage } from './produtos-page'
import * as produtosService from '@/services/produtos-service'
import { useAuthStore } from '@/stores/auth-store'
import type { Produto } from '@/services/produtos-service'

vi.mock('@/services/produtos-service')

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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProdutosPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const produtoExemplo: Produto = {
  id: 'p1',
  nome: 'Coxinha',
  descricao: null,
  categoriaId: null,
  categoria: { id: 'c1', nome: 'Salgados' },
  tipoVenda: 'UNIDADE',
  ativo: true,
  criadoEm: '2026-07-22',
  variacoes: [
    {
      id: 'v1',
      produtoId: 'p1',
      nome: 'Frango',
      sku: null,
      codigoBarras: '111',
      precoVenda: 8.5,
      precoCusto: null,
      estoqueAtual: 1,
      estoqueMinimo: 5,
      emRuptura: true,
      ativo: true,
    },
  ],
}

describe('ProdutosPage', () => {
  beforeEach(() => {
    useAuthStore.setState(estadoInicial, true)
    vi.clearAllMocks()
  });

  it('mostra o produto e a badge de ruptura', async () => {
    entrarComo('ADMIN')
    vi.mocked(produtosService.listarProdutos).mockResolvedValue({ items: [produtoExemplo], total: 1, pagina: 1, porPagina: 20 })

    renderPage()

    expect(await screen.findByText('Coxinha')).toBeInTheDocument()
    expect(screen.getByText('Ruptura')).toBeInTheDocument()
    // NBSP no separador de milhar/moeda — casa por regex em vez de string literal.
    expect(screen.getByText(/R\$\s*8,50/)).toBeInTheDocument()
  });

  it('mostra botão "Novo produto" para Admin', async () => {
    entrarComo('ADMIN')
    vi.mocked(produtosService.listarProdutos).mockResolvedValue({ items: [], total: 0, pagina: 1, porPagina: 20 })

    renderPage()

    expect(await screen.findByRole('button', { name: /novo produto/i })).toBeInTheDocument()
  });

  it('não mostra "Novo produto" para Vendedor', async () => {
    entrarComo('VENDEDOR')
    vi.mocked(produtosService.listarProdutos).mockResolvedValue({ items: [], total: 0, pagina: 1, porPagina: 20 })

    renderPage()

    await waitFor(() => expect(screen.getByText(/nenhum produto/i)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /novo produto/i })).not.toBeInTheDocument()
  });

  it('mostra estado de erro quando a busca falha', async () => {
    entrarComo('ADMIN')
    vi.mocked(produtosService.listarProdutos).mockRejectedValue(new Error('falhou'))

    renderPage()

    expect(await screen.findByText(/não foi possível carregar/i)).toBeInTheDocument()
  });
});
