import type { LojaAcesso, UsuarioSessao } from '@/stores/auth-store'

// Tipos isolados num arquivo próprio (sem importar o apiClient) para
// api-client.ts poder usar LoginResponse sem criar import circular com
// auth-service.ts (que importa o apiClient).

export interface LoginPayload {
  slug: string
  email: string
  senha: string
}

export interface LoginResponse {
  accessToken: string
  usuario: UsuarioSessao
  lojas: LojaAcesso[]
  lojaAtivaId?: string
}

export interface EmpresaResolvida {
  existe: boolean
  nome?: string
  slug?: string
}
