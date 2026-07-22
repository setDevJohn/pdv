import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function criarContexto(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const jwtService = new JwtService({});
  process.env.JWT_ACCESS_SECRET = 'access-secret';

  it('libera rotas marcadas como @Public() sem exigir token', () => {
    const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
    const guard = new JwtAuthGuard(jwtService, reflector);

    expect(guard.canActivate(criarContexto({ headers: {} }))).toBe(true);
  });

  it('rejeita quando não há header Authorization', () => {
    const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
    const guard = new JwtAuthGuard(jwtService, reflector);

    expect(() => guard.canActivate(criarContexto({ headers: {} }))).toThrow(UnauthorizedException);
  });

  it('rejeita um token inválido', () => {
    const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
    const guard = new JwtAuthGuard(jwtService, reflector);
    const request = { headers: { authorization: 'Bearer token-invalido' } };

    expect(() => guard.canActivate(criarContexto(request))).toThrow(UnauthorizedException);
  });

  it('popula request.user e libera quando o token é válido', () => {
    const reflector = { getAllAndOverride: () => false } as unknown as Reflector;
    const guard = new JwtAuthGuard(jwtService, reflector);
    const token = jwtService.sign(
      { sub: 'usuario-1', empresaId: 'empresa-1', lojaAtivaId: 'loja-1', perfil: 'ADMIN' },
      { secret: 'access-secret' },
    );
    const request: any = { headers: { authorization: `Bearer ${token}` } };

    expect(guard.canActivate(criarContexto(request))).toBe(true);
    expect(request.user).toMatchObject({
      usuarioId: 'usuario-1',
      empresaId: 'empresa-1',
      lojaAtivaId: 'loja-1',
      perfil: 'ADMIN',
    });
  });
});
