import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PerfilAcesso } from '../../generated/prisma/enums';
import { RequestUser } from '../interfaces/jwt-payload.interface';

// Roda depois do JwtAuthGuard (request.user já populado). Sem @Roles(), libera
// geral — a rota que precisa restringir por perfil declara explicitamente.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const perfisPermitidos = this.reflector.getAllAndOverride<PerfilAcesso[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!perfisPermitidos || perfisPermitidos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;

    if (!user?.perfil || !perfisPermitidos.includes(user.perfil)) {
      throw new ForbiddenException('Perfil sem permissão para esta ação');
    }
    return true;
  }
}
