import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { PeriodoQueryDto, ProdutosMaisVendidosQueryDto } from './dto/dashboard.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { LojaAtiva } from '../auth/decorators/loja-ativa.decorator';
import { PerfilAcesso } from '../generated/prisma/enums';

// Dado financeiro/gerencial: Admin apenas. Vendedor tem acesso a venda e
// consultas de produto/estoque (ver docs/07-escopo-fechado.md), não a
// faturamento da loja.
@Roles(PerfilAcesso.ADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumo')
  resumo(@LojaAtiva() lojaId: string) {
    return this.dashboardService.resumo(lojaId);
  }

  @Get('vendas-por-dia')
  vendasPorDia(@LojaAtiva() lojaId: string, @Query() query: PeriodoQueryDto) {
    return this.dashboardService.vendasPorDia(lojaId, query);
  }

  @Get('produtos-mais-vendidos')
  produtosMaisVendidos(@LojaAtiva() lojaId: string, @Query() query: ProdutosMaisVendidosQueryDto) {
    return this.dashboardService.produtosMaisVendidos(lojaId, query);
  }

  @Get('exportar')
  async exportar(@LojaAtiva() lojaId: string, @Query() query: PeriodoQueryDto, @Res() res: Response) {
    const workbook = await this.dashboardService.gerarPlanilha(lojaId, query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-vendas.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  }
}
