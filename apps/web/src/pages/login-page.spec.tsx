import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from './login-page'
import * as authService from '@/services/auth-service'
import { useAuthStore } from '@/stores/auth-store'

vi.mock('@/services/auth-service')

const estadoInicialAuth = useAuthStore.getState()

beforeEach(() => {
  useAuthStore.setState(estadoInicialAuth, true)
});

function renderLoginPage() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Home autenticada</div>} />
          <Route path="/selecionar-loja" element={<div>Selecionar loja</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  it('mostra o passo de identificação da empresa (sem subdomínio detectado em localhost)', async () => {
    renderLoginPage()

    expect(await screen.findByLabelText('Identificador da empresa')).toBeInTheDocument()
  });

  it('mostra erro quando a empresa não é encontrada', async () => {
    vi.mocked(authService.resolverEmpresa).mockResolvedValue({ existe: false })
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(await screen.findByLabelText('Identificador da empresa'), 'nao-existe')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Empresa não encontrada. Verifique o identificador.')).toBeInTheDocument()
  });

  it('avança para e-mail/senha e navega após login com loja única', async () => {
    vi.mocked(authService.resolverEmpresa).mockResolvedValue({
      existe: true,
      nome: 'Mercadinho Exemplo',
      slug: 'mercadinho-exemplo',
    })
    vi.mocked(authService.login).mockResolvedValue({
      accessToken: 'token-1',
      usuario: { id: 'u1', nome: 'Admin', email: 'admin@exemplo.com' },
      lojas: [{ lojaId: 'l1', nome: 'Loja Principal', perfil: 'ADMIN' }],
      lojaAtivaId: 'l1',
    })
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(await screen.findByLabelText('Identificador da empresa'), 'mercadinho-exemplo')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Entrando em Mercadinho Exemplo')).toBeInTheDocument()

    await user.type(screen.getByLabelText('E-mail'), 'admin@exemplo.com')
    await user.type(screen.getByLabelText('Senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(screen.getByText('Home autenticada')).toBeInTheDocument())
  });

  it('vai para seleção de loja quando o login não define loja ativa', async () => {
    vi.mocked(authService.resolverEmpresa).mockResolvedValue({
      existe: true,
      nome: 'Mercadinho Exemplo',
      slug: 'mercadinho-exemplo',
    })
    vi.mocked(authService.login).mockResolvedValue({
      accessToken: 'token-1',
      usuario: { id: 'u1', nome: 'Admin', email: 'admin@exemplo.com' },
      lojas: [
        { lojaId: 'l1', nome: 'Loja 1', perfil: 'ADMIN' },
        { lojaId: 'l2', nome: 'Loja 2', perfil: 'VENDEDOR' },
      ],
    })
    const user = userEvent.setup()
    renderLoginPage()

    await user.type(await screen.findByLabelText('Identificador da empresa'), 'mercadinho-exemplo')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(await screen.findByLabelText('E-mail'), 'admin@exemplo.com')
    await user.type(screen.getByLabelText('Senha'), 'senha123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(screen.getByText('Selecionar loja')).toBeInTheDocument())
  });
});
