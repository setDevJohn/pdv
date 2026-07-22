import { apiClient } from '@/lib/api-client'
import type { EmpresaResolvida, LoginPayload, LoginResponse } from './auth-types'

export type { LoginPayload, LoginResponse, EmpresaResolvida }

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload)
  return data
}

// Mesmo formato do login: o bootstrap de sessão (restaurar estado após um F5,
// já que o access token só vive em memória) precisa de usuario/lojas de volta,
// não só de um token novo.
export async function refresh(): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/refresh')
  return data
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout')
}

export async function trocarLoja(lojaId: string): Promise<{ accessToken: string }> {
  const { data } = await apiClient.post<{ accessToken: string }>('/auth/trocar-loja', { lojaId })
  return data
}

export async function resolverEmpresa(slug: string): Promise<EmpresaResolvida> {
  const { data } = await apiClient.get<EmpresaResolvida>('/empresas/resolver', { params: { slug } })
  return data
}
