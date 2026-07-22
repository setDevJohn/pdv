import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RotaProtegida } from './rota-protegida'
import { RotaPublica } from './rota-publica'
import { AdminLayout } from '@/components/layout/admin-layout'
import { LoginPage } from '@/pages/login-page'
import { SelecionarLojaPage } from '@/pages/selecionar-loja-page'
import { HomePage } from '@/pages/home-page'
import { ProdutosPage } from '@/pages/produtos/produtos-page'
import { ProdutoNovoPage } from '@/pages/produtos/produto-novo-page'
import { ProdutoEditarPage } from '@/pages/produtos/produto-editar-page'
import { CategoriasPage } from '@/pages/categorias/categorias-page'
import { EstoquePage } from '@/pages/estoque/estoque-page'

export const router = createBrowserRouter([
  {
    element: <RotaPublica />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RotaProtegida exigirLojaAtiva={false} />,
    children: [{ path: '/selecionar-loja', element: <SelecionarLojaPage /> }],
  },
  {
    // Área autenticada com loja ativa: layout com sidebar.
    element: <RotaProtegida />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/produtos', element: <ProdutosPage /> },
          // Estoque: leitura e movimentação para Admin e Vendedor.
          { path: '/estoque', element: <EstoquePage /> },
          // Cadastro/edição de produto são Admin-only (o backend também barra).
          {
            element: <RotaProtegida perfisPermitidos={['ADMIN']} />,
            children: [
              { path: '/produtos/novo', element: <ProdutoNovoPage /> },
              { path: '/produtos/:id', element: <ProdutoEditarPage /> },
              { path: '/categorias', element: <CategoriasPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
