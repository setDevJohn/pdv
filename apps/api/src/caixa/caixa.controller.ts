import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { CaixaService } from './caixa.service';
import { AbrirCaixaDto, FecharCaixaDto, HistoricoCaixaQueryDto, SangriaDto } from './dto/caixa.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { LojaAtiva } from '../auth/decorators/loja-ativa.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { PerfilAcesso } from '../generated/prisma/enums';

// Abertura, sangria e fechamento: Admin e Vendedor (matriz Fase 2a).
@Roles(PerfilAcesso.ADMIN, PerfilAcesso.VENDEDOR)
@Controller('caixa')
export class CaixaController {
  constructor(private readonly caixaService: CaixaService) {}

  @HttpCode(200)
  @Post('abrir')
  abrir(@LojaAtiva() lojaId: string, @CurrentUser() user: RequestUser, @Body() dto: AbrirCaixaDto) {
    return this.caixaService.abrir(lojaId, user.usuarioId, dto);
  }

  @Get('atual')
  atual(@LojaAtiva() lojaId: string) {
    return this.caixaService.atual(lojaId);
  }

  @HttpCode(200)
  @Post('sangria')
  sangria(@LojaAtiva() lojaId: string, @CurrentUser() user: RequestUser, @Body() dto: SangriaDto) {
    return this.caixaService.sangria(lojaId, user.usuarioId, dto);
  }

  @HttpCode(200)
  @Post('fechar')
  fechar(@LojaAtiva() lojaId: string, @CurrentUser() user: RequestUser, @Body() dto: FecharCaixaDto) {
    return this.caixaService.fechar(lojaId, user.usuarioId, dto);
  }

  @Get('historico')
  historico(@LojaAtiva() lojaId: string, @Query() query: HistoricoCaixaQueryDto) {
    return this.caixaService.historico(lojaId, query);
  }
}
