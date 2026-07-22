import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CONTAR_INSERCAO_TRIAL_KEY } from './contar-insercao-trial.decorator';
import { AssinaturaService } from './assinatura.service';
import { RequestUser } from '../auth/interfaces/jwt-payload.interface';

// Roda depois do JwtAuthGuard (request.user já populado). Sem
// @ContarInsercaoTrial(), não faz nada — só rotas que criam registro contável
// declaram o decorator e passam por aqui.
//
// Trade-off assumido (ver checkpoint): a inserção é consumida ANTES do handler,
// então uma criação que falhe por outro motivo (validação, etc.) ainda gasta a
// cota. Para o MVP é aceitável; migrar para interceptor (só em sucesso) se
// virar problema na prática.
@Injectable()
export class TrialGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly assinaturaService: AssinaturaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const contar = this.reflector.getAllAndOverride<boolean>(CONTAR_INSERCAO_TRIAL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!contar) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser | undefined = request.user;
    if (!user) {
      throw new UnauthorizedException('Autenticação necessária');
    }

    await this.assinaturaService.consumirInsercao(user.empresaId);
    return true;
  }
}
