import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ehViolacaoDeUnicidade } from '../common/prisma-errors';
import { CriarProdutoDto, AtualizarProdutoDto, ListarProdutosQueryDto } from './dto/produto.dto';
import { CriarVariacaoDto, AtualizarVariacaoDto } from './dto/variacao.dto';
import { mapProduto, mapVariacao } from './produto.mapper';

const POR_PAGINA_PADRAO = 20;

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(lojaId: string, query: ListarProdutosQueryDto) {
    const apenasAtivos = query.apenasAtivos ?? true;
    const pagina = query.pagina ?? 1;
    const porPagina = query.porPagina ?? POR_PAGINA_PADRAO;

    const where = {
      lojaId,
      ...(apenasAtivos ? { ativo: true } : {}),
      ...(query.categoriaId ? { categoriaId: query.categoriaId } : {}),
      ...(query.busca
        ? {
            OR: [
              { nome: { contains: query.busca, mode: 'insensitive' as const } },
              { variacoes: { some: { codigoBarras: { contains: query.busca } } } },
              { variacoes: { some: { sku: { contains: query.busca, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    };

    const [total, produtos] = await Promise.all([
      this.prisma.produto.count({ where }),
      this.prisma.produto.findMany({
        where,
        include: { categoria: true, variacoes: { orderBy: { criadoEm: 'asc' } } },
        orderBy: { nome: 'asc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    ]);

    return {
      items: produtos.map(mapProduto),
      total,
      pagina,
      porPagina,
    };
  }

  async buscarPorId(lojaId: string, id: string) {
    const produto = await this.prisma.produto.findFirst({
      where: { id, lojaId },
      include: { categoria: true, variacoes: { orderBy: { criadoEm: 'asc' } } },
    });
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    return mapProduto(produto);
  }

  async criar(lojaId: string, dto: CriarProdutoDto) {
    if (dto.categoriaId) {
      await this.garantirCategoriaNaLoja(lojaId, dto.categoriaId);
    }

    try {
      // Nested create é atômico: produto + todas as variações numa transação.
      // Estoque inicial fica em 0 — entrada de estoque é feita pela feature de
      // Estoque (movimentação registrada para auditoria).
      const produto = await this.prisma.produto.create({
        data: {
          lojaId,
          nome: dto.nome,
          descricao: dto.descricao,
          categoriaId: dto.categoriaId,
          tipoVenda: dto.tipoVenda,
          variacoes: {
            create: dto.variacoes.map((v) => this.dadosVariacao(lojaId, v)),
          },
        },
        include: { categoria: true, variacoes: { orderBy: { criadoEm: 'asc' } } },
      });
      return mapProduto(produto);
    } catch (error) {
      throw this.traduzirErroCodigoBarras(error);
    }
  }

  async atualizar(lojaId: string, id: string, dto: AtualizarProdutoDto) {
    await this.garantirProdutoNaLoja(lojaId, id);
    if (dto.categoriaId) {
      await this.garantirCategoriaNaLoja(lojaId, dto.categoriaId);
    }

    const produto = await this.prisma.produto.update({
      where: { id },
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        categoriaId: dto.categoriaId,
        tipoVenda: dto.tipoVenda,
        ativo: dto.ativo,
      },
      include: { categoria: true, variacoes: { orderBy: { criadoEm: 'asc' } } },
    });
    return mapProduto(produto);
  }

  // Soft delete: produto com histórico de venda não pode sumir do banco (mantém
  // integridade de relatórios). Apenas marca ativo=false.
  async remover(lojaId: string, id: string) {
    await this.garantirProdutoNaLoja(lojaId, id);
    await this.prisma.produto.update({ where: { id }, data: { ativo: false } });
  }

  async adicionarVariacao(lojaId: string, produtoId: string, dto: CriarVariacaoDto) {
    await this.garantirProdutoNaLoja(lojaId, produtoId);
    try {
      const variacao = await this.prisma.produtoVariacao.create({
        data: { produtoId, ...this.dadosVariacao(lojaId, dto) },
      });
      return mapVariacao(variacao);
    } catch (error) {
      throw this.traduzirErroCodigoBarras(error);
    }
  }

  async atualizarVariacao(lojaId: string, produtoId: string, variacaoId: string, dto: AtualizarVariacaoDto) {
    await this.garantirVariacaoNoProduto(lojaId, produtoId, variacaoId);
    try {
      const variacao = await this.prisma.produtoVariacao.update({
        where: { id: variacaoId },
        data: {
          nome: dto.nome,
          sku: dto.sku,
          codigoBarras: dto.codigoBarras,
          precoVenda: dto.precoVenda,
          precoCusto: dto.precoCusto,
          estoqueMinimo: dto.estoqueMinimo,
          ativo: dto.ativo,
        },
      });
      return mapVariacao(variacao);
    } catch (error) {
      throw this.traduzirErroCodigoBarras(error);
    }
  }

  // Soft delete da variação. Não deixa desativar a última variação ativa —
  // um produto ativo precisa de ao menos uma variação vendável.
  async removerVariacao(lojaId: string, produtoId: string, variacaoId: string) {
    await this.garantirVariacaoNoProduto(lojaId, produtoId, variacaoId);

    const ativas = await this.prisma.produtoVariacao.count({
      where: { produtoId, ativo: true },
    });
    if (ativas <= 1) {
      throw new BadRequestException('Não é possível remover a última variação do produto');
    }

    await this.prisma.produtoVariacao.update({ where: { id: variacaoId }, data: { ativo: false } });
  }

  private dadosVariacao(lojaId: string, v: CriarVariacaoDto) {
    return {
      lojaId,
      nome: v.nome ?? 'Padrão',
      sku: v.sku,
      codigoBarras: v.codigoBarras,
      precoVenda: v.precoVenda,
      precoCusto: v.precoCusto,
      estoqueMinimo: v.estoqueMinimo ?? 0,
    };
  }

  private async garantirProdutoNaLoja(lojaId: string, id: string) {
    const produto = await this.prisma.produto.findFirst({ where: { id, lojaId }, select: { id: true } });
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
  }

  private async garantirCategoriaNaLoja(lojaId: string, categoriaId: string) {
    const categoria = await this.prisma.categoria.findFirst({ where: { id: categoriaId, lojaId }, select: { id: true } });
    if (!categoria) {
      throw new NotFoundException('Categoria não encontrada');
    }
  }

  private async garantirVariacaoNoProduto(lojaId: string, produtoId: string, variacaoId: string) {
    const variacao = await this.prisma.produtoVariacao.findFirst({
      where: { id: variacaoId, produtoId, lojaId },
      select: { id: true },
    });
    if (!variacao) {
      throw new NotFoundException('Variação não encontrada');
    }
  }

  private traduzirErroCodigoBarras(error: unknown): unknown {
    if (ehViolacaoDeUnicidade(error)) {
      return new ConflictException('Já existe uma variação com esse código de barras nesta loja');
    }
    return error;
  }
}
