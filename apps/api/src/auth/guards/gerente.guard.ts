import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { REQUER_GERENTE_KEY } from '../decorators/requer-gerente.decorator';
import { GerenteTokenPayload, RequestUser } from '../interfaces/jwt-payload.interface';

// Roda depois do JwtAuthGuard. Sem @RequerGerente(), não exige nada — a rota
// que precisa de aprovação de gerente (ex.: cancelar venda finalizada, ajuste
// manual de estoque) declara a ação e este guard cobra o header correspondente.
@Injectable()
export class GerenteGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const acaoExigida = this.reflector.getAllAndOverride<string>(REQUER_GERENTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!acaoExigida) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const gerenteToken = request.headers['x-gerente-token'];
    if (!gerenteToken) {
      throw new ForbiddenException('Ação exige aprovação de um gerente');
    }

    let payload: GerenteTokenPayload;
    try {
      payload = this.jwtService.verify<GerenteTokenPayload>(gerenteToken, {
        secret: process.env.JWT_GERENTE_SECRET,
      });
    } catch {
      throw new ForbiddenException('Aprovação de gerente inválida ou expirada');
    }

    const user: RequestUser | undefined = request.user;
    if (payload.tipo !== 'gerente' || payload.acao !== acaoExigida || payload.lojaId !== user?.lojaAtivaId) {
      throw new ForbiddenException('Aprovação de gerente não corresponde a esta ação');
    }
    return true;
  }
}
