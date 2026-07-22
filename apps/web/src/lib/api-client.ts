import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import type { LoginResponse } from '@/services/auth-types'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  // manda o cookie httpOnly do refresh token nas requisições de auth.
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

type RequestComRetry = InternalAxiosRequestConfig & { _retry?: boolean }

// Só uma renovação por vez: se várias chamadas tomam 401 juntas, todas
// aguardam o mesmo refresh em vez de disparar um cada uma.
let refreshEmAndamento: Promise<string> | null = null

function renovarToken(): Promise<string> {
  if (!refreshEmAndamento) {
    refreshEmAndamento = apiClient
      .post<LoginResponse>('/auth/refresh')
      .then(({ data }) => {
        useAuthStore.getState().definirSessaoLogin(data)
        return data.accessToken
      })
      .finally(() => {
        refreshEmAndamento = null
      })
  }
  return refreshEmAndamento
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RequestComRetry | undefined
    // login/refresh nunca devem re-tentar via refresh — as demais rotas de
    // auth (trocar-loja, validar-codigo-gerente) são protegidas normalmente
    // e se beneficiam do mesmo retry.
    const naoRetentavel = original?.url === '/auth/login' || original?.url === '/auth/refresh'

    if (error.response?.status === 401 && original && !original._retry && !naoRetentavel) {
      original._retry = true
      try {
        const novoToken = await renovarToken()
        original.headers.set('Authorization', `Bearer ${novoToken}`)
        return apiClient(original)
      } catch {
        useAuthStore.getState().encerrarSessao()
      }
    }

    return Promise.reject(error)
  },
)
