import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RequestUser } from '../interfaces/jwt-payload.interface';

// Extrai o lojaAtivaId do usuário e garante que existe — usado por toda rota de
// negócio escopada a uma loja (produtos, estoque, caixa...). Na prática as rotas
// também usam @Roles(), que já exige o perfil (setado junto do lojaAtivaId no
// token); este decorator torna a garantia explícita e entrega o id já tipado
// como string, sem o `| undefined` do RequestUser.
export const LojaAtiva = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const user: RequestUser | undefined = request.user;
  if (!user?.lojaAtivaId) {
    throw new ForbiddenException('Selecione uma loja para continuar');
  }
  return user.lojaAtivaId;
});
