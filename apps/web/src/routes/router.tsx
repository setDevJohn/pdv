import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RotaProtegida } from './rota-protegida'
import { RotaPublica } from './rota-publica'
import { LoginPage } from '@/pages/login-page'
import { SelecionarLojaPage } from '@/pages/selecionar-loja-page'
import { HomePage } from '@/pages/home-page'

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
    element: <RotaProtegida />,
    children: [{ path: '/', element: <HomePage /> }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
