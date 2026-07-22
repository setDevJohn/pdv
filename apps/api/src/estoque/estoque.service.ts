import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoMovimentacaoEstoque } from '../generated/prisma/enums';
import { mapMovimentacao } from './estoque.mapper';
import { mapVariacao } from '../produtos/produto.mapper';
import { MovimentacaoDto, AjusteDto, ListarMovimentacoesQueryDto } from './dto/movimentacao.dto';

const POR_PAGINA_PADRAO = 20;

@Injectable()
export class EstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  entrada(lojaId: string, usuarioId: string, dto: MovimentacaoDto) {
    return this.aplicar(lojaId, usuarioId, dto.produtoVariacaoId, TipoMovimentacaoEstoque.ENTRADA, dto.quantidade, dto.observacao);
  }

  saida(lojaId: string, usuarioId: string, dto: MovimentacaoDto) {
    return this.aplicar(lojaId, usuarioId, dto.produtoVariacaoId, TipoMovimentacaoEstoque.SAIDA, dto.quantidade, dto.observacao);
  }

  ajuste(lojaId: string, usuarioId: string, dto: AjusteDto) {
    return this.aplicar(
      lojaId,
      usuarioId,
      dto.produtoVariacaoId,
      TipoMovimentacaoEstoque.AJUSTE,
      dto.quantidadeContada,
      dto.observacao,
    );
  }

  // Atualiza estoque e grava a movimentação numa transação — os dois writes
  // commitam juntos. `estoqueResultante` reflete o valor após esta operação.
  private async aplicar(
    lojaId: string,
    usuarioId: string,
    produtoVariacaoId: string,
    tipo: TipoMovimentacaoEstoque,
    valor: number,
    observacao?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const variacao = await tx.produtoVariacao.findFirst({ where: { id: produtoVariacaoId, lojaId } });
      if (!variacao || !variacao.ativo) {
        throw new NotFoundException('Variação de produto não encontrada');
      }

      const atual = Number(variacao.estoqueAtual);
      let novoEstoque: number;
      let quantidadeMovimento: number;

      if (tipo === TipoMovimentacaoEstoque.ENTRADA) {
        novoEstoque = atual + valor;
        quantidadeMovimento = valor;
      } else if (tipo === TipoMovimentacaoEstoque.SAIDA) {
        novoEstoque = atual - valor;
        quantidadeMovimento = -valor;
        if (novoEstoque < 0) {
          throw new BadRequestException('Estoque insuficiente para a saída');
        }
      } else {
        // AJUSTE: valor é a contagem nova (absoluta); a movimentação guarda a diferença.
        novoEstoque = valor;
        quantidadeMovimento = novoEstoque - atual;
      }

      const atualizada = await tx.produtoVariacao.update({
        where: { id: produtoVariacaoId },
        data: { estoqueAtual: novoEstoque },
      });
      const movimentacao = await tx.movimentacaoEstoque.create({
        data: {
          lojaId,
          produtoVariacaoId,
          usuarioId,
          tipo,
          quantidade: quantidadeMovimento,
          estoqueResultante: novoEstoque,
          observacao,
        },
      });

      return { variacao: mapVariacao(atualizada), movimentacao: mapMovimentacao(movimentacao) };
    });
  }

  async listarMovimentacoes(lojaId: string, query: ListarMovimentacoesQueryDto) {
    const pagina = query.pagina ?? 1;
    const porPagina = query.porPagina ?? POR_PAGINA_PADRAO;
    const where = {
      lojaId,
      ...(query.produtoVariacaoId ? { produtoVariacaoId: query.produtoVariacaoId } : {}),
    };

    const [total, movimentacoes] = await Promise.all([
      this.prisma.movimentacaoEstoque.count({ where }),
      this.prisma.movimentacaoEstoque.findMany({
        where,
        include: { usuario: true, produtoVariacao: { include: { produto: true } } },
        orderBy: { criadoEm: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    ]);

    return { items: movimentacoes.map(mapMovimentacao), total, pagina, porPagina };
  }

  // Variações ativas (de produtos ativos) com estoque no piso ou abaixo. A
  // comparação entre duas colunas é feita em memória — ok no volume do MVP.
  async ruptura(lojaId: string) {
    const variacoes = await this.prisma.produtoVariacao.findMany({
      where: { lojaId, ativo: true, produto: { ativo: true } },
      include: { produto: true },
      orderBy: { estoqueAtual: 'asc' },
    });

    return variacoes
      .filter((v) => Number(v.estoqueAtual) <= Number(v.estoqueMinimo))
      .map((v) => ({ ...mapVariacao(v), produtoNome: v.produto.nome }));
  }
}
