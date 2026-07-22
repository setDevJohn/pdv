import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ProdutosService } from './produtos.service';
import { CriarProdutoDto, AtualizarProdutoDto, ListarProdutosQueryDto } from './dto/produto.dto';
import { CriarVariacaoDto, AtualizarVariacaoDto } from './dto/variacao.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { LojaAtiva } from '../auth/decorators/loja-ativa.decorator';
import { ContarInsercaoTrial } from '../assinatura/contar-insercao-trial.decorator';
import { PerfilAcesso } from '../generated/prisma/enums';

@Controller('produtos')
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  // Consulta liberada para Vendedor também (precisa ver produtos/preços na venda).
  @Roles(PerfilAcesso.ADMIN, PerfilAcesso.VENDEDOR)
  @Get()
  listar(@LojaAtiva() lojaId: string, @Query() query: ListarProdutosQueryDto) {
    return this.produtosService.listar(lojaId, query);
  }

  @Roles(PerfilAcesso.ADMIN, PerfilAcesso.VENDEDOR)
  @Get(':id')
  buscar(@LojaAtiva() lojaId: string, @Param('id') id: string) {
    return this.produtosService.buscarPorId(lojaId, id);
  }

  // Criar produto conta uma inserção no período de teste (ver TrialGuard).
  @Roles(PerfilAcesso.ADMIN)
  @ContarInsercaoTrial()
  @Post()
  criar(@LojaAtiva() lojaId: string, @Body() dto: CriarProdutoDto) {
    return this.produtosService.criar(lojaId, dto);
  }

  @Roles(PerfilAcesso.ADMIN)
  @Patch(':id')
  atualizar(@LojaAtiva() lojaId: string, @Param('id') id: string, @Body() dto: AtualizarProdutoDto) {
    return this.produtosService.atualizar(lojaId, id, dto);
  }

  @Roles(PerfilAcesso.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  remover(@LojaAtiva() lojaId: string, @Param('id') id: string) {
    return this.produtosService.remover(lojaId, id);
  }

  @Roles(PerfilAcesso.ADMIN)
  @Post(':id/variacoes')
  adicionarVariacao(@LojaAtiva() lojaId: string, @Param('id') produtoId: string, @Body() dto: CriarVariacaoDto) {
    return this.produtosService.adicionarVariacao(lojaId, produtoId, dto);
  }

  @Roles(PerfilAcesso.ADMIN)
  @Patch(':id/variacoes/:variacaoId')
  atualizarVariacao(
    @LojaAtiva() lojaId: string,
    @Param('id') produtoId: string,
    @Param('variacaoId') variacaoId: string,
    @Body() dto: AtualizarVariacaoDto,
  ) {
    return this.produtosService.atualizarVariacao(lojaId, produtoId, variacaoId, dto);
  }

  @Roles(PerfilAcesso.ADMIN)
  @HttpCode(204)
  @Delete(':id/variacoes/:variacaoId')
  removerVariacao(
    @LojaAtiva() lojaId: string,
    @Param('id') produtoId: string,
    @Param('variacaoId') variacaoId: string,
  ) {
    return this.produtosService.removerVariacao(lojaId, produtoId, variacaoId);
  }
}
