import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { GerenteGuard } from './gerente.guard';

function criarContexto(headers: Record<string, string>, user?: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers, user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('GerenteGuard', () => {
  const jwtService = new JwtService({});
  process.env.JWT_GERENTE_SECRET = 'gerente-secret';

  it('libera quando a rota não declara @RequerGerente()', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new GerenteGuard(jwtService, reflector);

    expect(guard.canActivate(criarContexto({}))).toBe(true);
  });

  it('rejeita quando o header X-Gerente-Token está ausente', () => {
    const reflector = { getAllAndOverride: () => 'CANCELAR_VENDA' } as unknown as Reflector;
    const guard = new GerenteGuard(jwtService, reflector);

    expect(() => guard.canActivate(criarContexto({}))).toThrow(ForbiddenException);
  });

  it('rejeita um gerente-token para uma ação diferente da exigida', () => {
    const reflector = { getAllAndOverride: () => 'CANCELAR_VENDA' } as unknown as Reflector;
    const guard = new GerenteGuard(jwtService, reflector);
    const token = jwtService.sign(
      { tipo: 'gerente', lojaId: 'loja-1', acao: 'AJUSTE_ESTOQUE', aprovadoPorUsuarioId: 'usuario-1' },
      { secret: 'gerente-secret' },
    );

    expect(() =>
      guard.canActivate(criarContexto({ 'x-gerente-token': token }, { lojaAtivaId: 'loja-1' })),
    ).toThrow(ForbiddenException);
  });

  it('rejeita um gerente-token emitido para outra loja', () => {
    const reflector = { getAllAndOverride: () => 'CANCELAR_VENDA' } as unknown as Reflector;
    const guard = new GerenteGuard(jwtService, reflector);
    const token = jwtService.sign(
      { tipo: 'gerente', lojaId: 'loja-2', acao: 'CANCELAR_VENDA', aprovadoPorUsuarioId: 'usuario-1' },
      { secret: 'gerente-secret' },
    );

    expect(() =>
      guard.canActivate(criarContexto({ 'x-gerente-token': token }, { lojaAtivaId: 'loja-1' })),
    ).toThrow(ForbiddenException);
  });

  it('libera quando o gerente-token bate com a ação e a loja ativa', () => {
    const reflector = { getAllAndOverride: () => 'CANCELAR_VENDA' } as unknown as Reflector;
    const guard = new GerenteGuard(jwtService, reflector);
    const token = jwtService.sign(
      { tipo: 'gerente', lojaId: 'loja-1', acao: 'CANCELAR_VENDA', aprovadoPorUsuarioId: 'usuario-1' },
      { secret: 'gerente-secret' },
    );

    expect(
      guard.canActivate(criarContexto({ 'x-gerente-token': token }, { lojaAtivaId: 'loja-1' })),
    ).toBe(true);
  });
});
