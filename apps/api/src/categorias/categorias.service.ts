import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ehViolacaoDeUnicidade } from '../common/prisma-errors';
import { CriarCategoriaDto, AtualizarCategoriaDto } from './dto/categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  listar(lojaId: string) {
    return this.prisma.categoria.findMany({
      where: { lojaId },
      orderBy: { nome: 'asc' },
    });
  }

  async criar(lojaId: string, dto: CriarCategoriaDto) {
    try {
      return await this.prisma.categoria.create({
        data: { lojaId, nome: dto.nome },
      });
    } catch (error) {
      if (ehViolacaoDeUnicidade(error)) {
        throw new ConflictException('Já existe uma categoria com esse nome');
      }
      throw error;
    }
  }

  async atualizar(lojaId: string, id: string, dto: AtualizarCategoriaDto) {
    await this.buscarNaLoja(lojaId, id);
    try {
      return await this.prisma.categoria.update({
        where: { id },
        data: { nome: dto.nome },
      });
    } catch (error) {
      if (ehViolacaoDeUnicidade(error)) {
        throw new ConflictException('Já existe uma categoria com esse nome');
      }
      throw error;
    }
  }

  // Excluir categoria não apaga produtos: o schema usa onDelete SetNull, então
  // os produtos daquela categoria ficam sem categoria (categoriaId null).
  async remover(lojaId: string, id: string) {
    await this.buscarNaLoja(lojaId, id);
    await this.prisma.categoria.delete({ where: { id } });
  }

  private async buscarNaLoja(lojaId: string, id: string) {
    const categoria = await this.prisma.categoria.findFirst({ where: { id, lojaId } });
    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return categoria;
  }
}
