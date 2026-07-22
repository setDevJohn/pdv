import { create } from 'zustand'
import type { PerfilAcesso } from '@pdv/shared-types'
import { decodeJwtPayload } from '@/lib/jwt'

export interface LojaAcesso {
  lojaId: string
  nome: string
  perfil: PerfilAcesso
}

export interface UsuarioSessao {
  id: string
  nome: string
  email: string
}

interface AccessTokenPayload {
  lojaAtivaId?: string
}

interface AuthState {
  accessToken: string | null
  usuario: UsuarioSessao | null
  lojas: LojaAcesso[]
  lojaAtivaId: string | null
  // true enquanto o app tenta restaurar a sessão via refresh no carregamento
  // (o access token só vive em memória — some a cada F5).
  bootstrapping: boolean
  definirSessaoLogin: (params: {
    accessToken: string
    usuario: UsuarioSessao
    lojas: LojaAcesso[]
    lojaAtivaId?: string
  }) => void
  atualizarToken: (accessToken: string) => void
  encerrarSessao: () => void
  finalizarBootstrap: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  usuario: null,
  lojas: [],
  lojaAtivaId: null,
  bootstrapping: true,

  definirSessaoLogin: ({ accessToken, usuario, lojas, lojaAtivaId }) =>
    set({ accessToken, usuario, lojas, lojaAtivaId: lojaAtivaId ?? null, bootstrapping: false }),

  // Usado após /auth/refresh e /auth/trocar-loja, que só devolvem um novo
  // accessToken — a loja ativa é lida de volta do próprio token.
  atualizarToken: (accessToken) => {
    const payload = decodeJwtPayload<AccessTokenPayload>(accessToken)
    set({ accessToken, lojaAtivaId: payload.lojaAtivaId ?? null })
  },

  encerrarSessao: () => set({ accessToken: null, usuario: null, lojas: [], lojaAtivaId: null }),

  finalizarBootstrap: () => set({ bootstrapping: false }),
}))
