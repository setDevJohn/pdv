import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { PerfilAcesso } from '../../generated/prisma/enums';

function criarContexto(user?: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('libera quando a rota não declara @Roles()', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(criarContexto({ perfil: PerfilAcesso.VENDEDOR }))).toBe(true);
  });

  it('libera quando o perfil do usuário está na lista permitida', () => {
    const reflector = { getAllAndOverride: () => [PerfilAcesso.ADMIN] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(criarContexto({ perfil: PerfilAcesso.ADMIN }))).toBe(true);
  });

  it('rejeita quando o perfil do usuário não está na lista permitida', () => {
    const reflector = { getAllAndOverride: () => [PerfilAcesso.ADMIN] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(criarContexto({ perfil: PerfilAcesso.VENDEDOR }))).toThrow(ForbiddenException);
  });

  it('rejeita quando não há loja/perfil ativo no token', () => {
    const reflector = { getAllAndOverride: () => [PerfilAcesso.ADMIN] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(criarContexto({}))).toThrow(ForbiddenException);
  });
});
