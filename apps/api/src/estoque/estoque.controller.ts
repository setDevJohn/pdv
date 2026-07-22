import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EstoqueService } from './estoque.service';
import { MovimentacaoDto, AjusteDto, ListarMovimentacoesQueryDto } from './dto/movimentacao.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequerGerente } from '../auth/decorators/requer-gerente.decorator';
import { LojaAtiva } from '../auth/decorators/loja-ativa.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { PerfilAcesso } from '../generated/prisma/enums';

@Controller('estoque')
export class EstoqueController {
  constructor(private readonly estoqueService: EstoqueService) {}

  // Entrada e saída: Admin e Vendedor (reposição, quebra, perda).
  @Roles(PerfilAcesso.ADMIN, PerfilAcesso.VENDEDOR)
  @Post('entrada')
  entrada(@LojaAtiva() lojaId: string, @CurrentUser() user: RequestUser, @Body() dto: MovimentacaoDto) {
    return this.estoqueService.entrada(lojaId, user.usuarioId, dto);
  }

  @Roles(PerfilAcesso.ADMIN, PerfilAcesso.VENDEDOR)
  @Post('saida')
  saida(@LojaAtiva() lojaId: string, @CurrentUser() user: RequestUser, @Body() dto: MovimentacaoDto) {
    return this.estoqueService.saida(lojaId, user.usuarioId, dto);
  }

  // Ajuste manual (corrigir contagem): Vendedor precisa de código de gerente;
  // Admin passa direto (ver GerenteGuard).
  @Roles(PerfilAcesso.ADMIN, PerfilAcesso.VENDEDOR)
  @RequerGerente('AJUSTE_ESTOQUE')
  @Post('ajuste')
  ajuste(@LojaAtiva() lojaId: string, @CurrentUser() user: RequestUser, @Body() dto: AjusteDto) {
    return this.estoqueService.ajuste(lojaId, user.usuarioId, dto);
  }

  @Roles(PerfilAcesso.ADMIN, PerfilAcesso.VENDEDOR)
  @Get('movimentacoes')
  listarMovimentacoes(@LojaAtiva() lojaId: string, @Query() query: ListarMovimentacoesQueryDto) {
    return this.estoqueService.listarMovimentacoes(lojaId, query);
  }

  @Roles(PerfilAcesso.ADMIN, PerfilAcesso.VENDEDOR)
  @Get('ruptura')
  ruptura(@LojaAtiva() lojaId: string) {
    return this.estoqueService.ruptura(lojaId);
  }
}
