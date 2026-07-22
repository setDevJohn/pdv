import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TrialGuard } from './trial.guard';
import { AssinaturaService } from './assinatura.service';

function criarContexto(user?: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('TrialGuard', () => {
  let assinaturaService: { consumirInsercao: jest.Mock };

  beforeEach(() => {
    assinaturaService = { consumirInsercao: jest.fn() };
  });

  it('libera sem consumir quando a rota não declara @ContarInsercaoTrial()', async () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new TrialGuard(reflector, assinaturaService as unknown as AssinaturaService);

    await expect(guard.canActivate(criarContexto({ empresaId: 'e1' }))).resolves.toBe(true);
    expect(assinaturaService.consumirInsercao).not.toHaveBeenCalled();
  });

  it('rejeita quando não há usuário autenticado', async () => {
    const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
    const guard = new TrialGuard(reflector, assinaturaService as unknown as AssinaturaService);

    await expect(guard.canActivate(criarContexto(undefined))).rejects.toThrow(UnauthorizedException);
  });

  it('consome uma inserção e libera quando dentro do trial', async () => {
    const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
    assinaturaService.consumirInsercao.mockResolvedValue(undefined);
    const guard = new TrialGuard(reflector, assinaturaService as unknown as AssinaturaService);

    await expect(guard.canActivate(criarContexto({ empresaId: 'e1' }))).resolves.toBe(true);
    expect(assinaturaService.consumirInsercao).toHaveBeenCalledWith('e1');
  });

  it('propaga o bloqueio quando o serviço barra a inserção', async () => {
    const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
    assinaturaService.consumirInsercao.mockRejectedValue(new ForbiddenException());
    const guard = new TrialGuard(reflector, assinaturaService as unknown as AssinaturaService);

    await expect(guard.canActivate(criarContexto({ empresaId: 'e1' }))).rejects.toThrow(ForbiddenException);
  });
});
