import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CriarCategoriaDto, AtualizarCategoriaDto } from './dto/categoria.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { LojaAtiva } from '../auth/decorators/loja-ativa.decorator';
import { PerfilAcesso } from '../generated/prisma/enums';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  // Consulta liberada para Admin e Vendedor (ex.: filtrar produtos por categoria
  // na tela de venda). Escrita só para Admin.
  @Roles(PerfilAcesso.ADMIN, PerfilAcesso.VENDEDOR)
  @Get()
  listar(@LojaAtiva() lojaId: string) {
    return this.categoriasService.listar(lojaId);
  }

  @Roles(PerfilAcesso.ADMIN)
  @Post()
  criar(@LojaAtiva() lojaId: string, @Body() dto: CriarCategoriaDto) {
    return this.categoriasService.criar(lojaId, dto);
  }

  @Roles(PerfilAcesso.ADMIN)
  @Patch(':id')
  atualizar(@LojaAtiva() lojaId: string, @Param('id') id: string, @Body() dto: AtualizarCategoriaDto) {
    return this.categoriasService.atualizar(lojaId, id, dto);
  }

  @Roles(PerfilAcesso.ADMIN)
  @HttpCode(204)
  @Delete(':id')
  remover(@LojaAtiva() lojaId: string, @Param('id') id: string) {
    return this.categoriasService.remover(lojaId, id);
  }
}
