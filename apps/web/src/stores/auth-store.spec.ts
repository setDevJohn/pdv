import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './auth-store'

function criarTokenFalso(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.assinatura-nao-verificada`
}

describe('useAuthStore', () => {
  const estadoInicial = useAuthStore.getState()

  beforeEach(() => {
    useAuthStore.setState(estadoInicial, true)
  });

  it('começa com bootstrapping true e sessão vazia', () => {
    const estado = useAuthStore.getState()
    expect(estado.bootstrapping).toBe(true)
    expect(estado.accessToken).toBeNull()
  });

  it('definirSessaoLogin preenche a sessão e encerra o bootstrapping', () => {
    useAuthStore.getState().definirSessaoLogin({
      accessToken: 'token-1',
      usuario: { id: 'u1', nome: 'Admin', email: 'admin@exemplo.com' },
      lojas: [{ lojaId: 'l1', nome: 'Loja 1', perfil: 'ADMIN' }],
      lojaAtivaId: 'l1',
    })

    const estado = useAuthStore.getState()
    expect(estado.accessToken).toBe('token-1')
    expect(estado.usuario?.nome).toBe('Admin')
    expect(estado.lojaAtivaId).toBe('l1')
    expect(estado.bootstrapping).toBe(false)
  });

  it('definirSessaoLogin sem lojaAtivaId deixa lojaAtivaId null (várias lojas)', () => {
    useAuthStore.getState().definirSessaoLogin({
      accessToken: 'token-1',
      usuario: { id: 'u1', nome: 'Admin', email: 'admin@exemplo.com' },
      lojas: [
        { lojaId: 'l1', nome: 'Loja 1', perfil: 'ADMIN' },
        { lojaId: 'l2', nome: 'Loja 2', perfil: 'VENDEDOR' },
      ],
    })

    expect(useAuthStore.getState().lojaAtivaId).toBeNull()
  });

  it('atualizarToken decodifica lojaAtivaId de dentro do próprio token', () => {
    const token = criarTokenFalso({ sub: 'u1', lojaAtivaId: 'l2' })

    useAuthStore.getState().atualizarToken(token)

    const estado = useAuthStore.getState()
    expect(estado.accessToken).toBe(token)
    expect(estado.lojaAtivaId).toBe('l2')
  });

  it('atualizarToken sem lojaAtivaId no payload zera a loja ativa', () => {
    const token = criarTokenFalso({ sub: 'u1' })

    useAuthStore.getState().atualizarToken(token)

    expect(useAuthStore.getState().lojaAtivaId).toBeNull()
  });

  it('finalizarBootstrap só desliga a flag, sem tocar no resto do estado', () => {
    useAuthStore.getState().finalizarBootstrap()

    const estado = useAuthStore.getState()
    expect(estado.bootstrapping).toBe(false)
    expect(estado.accessToken).toBeNull()
  });

  it('encerrarSessao limpa toda a sessão', () => {
    useAuthStore.getState().definirSessaoLogin({
      accessToken: 'token-1',
      usuario: { id: 'u1', nome: 'Admin', email: 'admin@exemplo.com' },
      lojas: [{ lojaId: 'l1', nome: 'Loja 1', perfil: 'ADMIN' }],
      lojaAtivaId: 'l1',
    })

    useAuthStore.getState().encerrarSessao()

    const estado = useAuthStore.getState()
    expect(estado.accessToken).toBeNull()
    expect(estado.usuario).toBeNull()
    expect(estado.lojas).toEqual([])
    expect(estado.lojaAtivaId).toBeNull()
  });
});
