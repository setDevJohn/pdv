import { Controller, Get } from '@nestjs/common';
import { AssinaturaService } from './assinatura.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';

@Controller('assinatura')
export class AssinaturaController {
  constructor(private readonly assinaturaService: AssinaturaService) {}

  // Qualquer usuário autenticado da empresa pode ver o status do trial (o
  // banner aparece igual para Admin e Vendedor).
  @Get()
  obterStatus(@CurrentUser() user: RequestUser) {
    return this.assinaturaService.obterStatus(user.empresaId);
  }
}
