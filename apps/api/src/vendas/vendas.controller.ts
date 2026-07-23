import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { VendasService } from './vendas.service';
import {
  AdicionarItemDto,
  AtualizarItemDto,
  BuscarItemQueryDto,
  CancelarVendaDto,
  FinalizarVendaDto,
  ListarVendasQueryDto,
} from './dto/venda.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequerGerente } from '../auth/decorators/requer-gerente.decorator';
import { LojaAtiva } from '../auth/decorators/loja-ativa.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { PerfilAcesso } from '../generated/prisma/enums';

// Frente de caixa: Admin e Vendedor (mesma matriz de Estoque/Caixa).
@Roles(PerfilAcesso.ADMIN, PerfilAcesso.VENDEDOR)
@Controller('vendas')
export class VendasController {
  constructor(private readonly vendasService: VendasService) {}

  // Sem consumir inserção de trial: venda é operação, não cadastro.
  @HttpCode(200)
  @Post('abrir')
  abrir(@LojaAtiva() lojaId: string, @CurrentUser() user: RequestUser) {
    return this.vendasService.abrir(lojaId, user.usuarioId);
  }

  @Get('aberta')
  aberta(@LojaAtiva() lojaId: string, @CurrentUser() user: RequestUser) {
    return this.vendasService.aberta(lojaId, user.usuarioId);
  }

  @Get('buscar')
  buscar(@LojaAtiva() lojaId: string, @Query() query: BuscarItemQueryDto) {
    return this.vendasService.buscar(lojaId, query.termo);
  }

  @HttpCode(200)
  @Post(':id/itens')
  adicionarItem(
    @LojaAtiva() lojaId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') vendaId: string,
    @Body() dto: AdicionarItemDto,
  ) {
    return this.vendasService.adicionarItem(
      lojaId,
      user.usuarioId,
      vendaId,
      dto,
    );
  }

  @Patch(':id/itens/:itemId')
  atualizarItem(
    @LojaAtiva() lojaId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') vendaId: string,
    @Param('itemId') itemId: string,
    @Body() dto: AtualizarItemDto,
  ) {
    return this.vendasService.atualizarItem(
      lojaId,
      user.usuarioId,
      vendaId,
      itemId,
      dto,
    );
  }

  @Delete(':id/itens/:itemId')
  removerItem(
    @LojaAtiva() lojaId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') vendaId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.vendasService.removerItem(
      lojaId,
      user.usuarioId,
      vendaId,
      itemId,
    );
  }

  @HttpCode(204)
  @Post(':id/descartar')
  descartar(
    @LojaAtiva() lojaId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') vendaId: string,
  ) {
    return this.vendasService.descartar(lojaId, user.usuarioId, vendaId);
  }

  @HttpCode(200)
  @Post(':id/finalizar')
  finalizar(
    @LojaAtiva() lojaId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') vendaId: string,
    @Body() dto: FinalizarVendaDto,
  ) {
    return this.vendasService.finalizar(lojaId, user.usuarioId, vendaId, dto);
  }

  // Cancelamento de venda finalizada exige aprovação de gerente (Admin passa
  // direto — ver GerenteGuard).
  @HttpCode(200)
  @RequerGerente('CANCELAR_VENDA')
  @Post(':id/cancelar')
  cancelar(
    @LojaAtiva() lojaId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') vendaId: string,
    @Body() dto: CancelarVendaDto,
  ) {
    return this.vendasService.cancelar(lojaId, user.usuarioId, vendaId, dto);
  }

  @Get()
  listar(@LojaAtiva() lojaId: string, @Query() query: ListarVendasQueryDto) {
    return this.vendasService.listar(lojaId, query);
  }

  @Get(':id')
  buscarPorId(@LojaAtiva() lojaId: string, @Param('id') id: string) {
    return this.vendasService.buscarPorId(lojaId, id);
  }
}
