import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TipoMovimentacaoEstoque } from '../generated/prisma/enums';
import type { Prisma } from '../generated/prisma/client';
import { mapMovimentacao } from './estoque.mapper';
import { mapVariacao } from '../produtos/produto.mapper';
import { MovimentacaoDto, AjusteDto, ListarMovimentacoesQueryDto } from './dto/movimentacao.dto';

const POR_PAGINA_PADRAO = 20;

// Client escopado a uma transação em andamento — usado quando a baixa de
// estoque precisa commitar junto com outra escrita (ex.: VendasService).
export type PrismaTransacao = Prisma.TransactionClient;

@Injectable()
export class EstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  entrada(lojaId: string, usuarioId: string, dto: MovimentacaoDto) {
    return this.prisma.$transaction((tx) =>
      this.aplicarEm(tx, lojaId, usuarioId, dto.produtoVariacaoId, TipoMovimentacaoEstoque.ENTRADA, dto.quantidade, dto.observacao),
    );
  }

  saida(lojaId: string, usuarioId: string, dto: MovimentacaoDto) {
    return this.prisma.$transaction((tx) =>
      this.aplicarEm(tx, lojaId, usuarioId, dto.produtoVariacaoId, TipoMovimentacaoEstoque.SAIDA, dto.quantidade, dto.observacao),
    );
  }

  ajuste(lojaId: string, usuarioId: string, dto: AjusteDto) {
    return this.prisma.$transaction((tx) =>
      this.aplicarEm(
        tx,
        lojaId,
        usuarioId,
        dto.produtoVariacaoId,
        TipoMovimentacaoEstoque.AJUSTE,
        dto.quantidadeContada,
        dto.observacao,
      ),
    );
  }

  // Baixa de estoque de uma venda finalizada — chamado pelo VendasService
  // dentro da própria transação da venda, pra estoque e venda commitarem
  // juntos (ver docs/07). `vendaId` rastreia a origem da movimentação.
  aplicarNaVenda(
    tx: PrismaTransacao,
    lojaId: string,
    usuarioId: string,
    produtoVariacaoId: string,
    quantidade: number,
    vendaId: string,
  ) {
    return this.aplicarEm(tx, lojaId, usuarioId, produtoVariacaoId, TipoMovimentacaoEstoque.VENDA, quantidade, undefined, vendaId);
  }

  // Estorno do cancelamento de uma venda finalizada — mesma transação do
  // cancelamento, mesma rastreabilidade por vendaId.
  estornarVenda(
    tx: PrismaTransacao,
    lojaId: string,
    usuarioId: string,
    produtoVariacaoId: string,
    quantidade: number,
    vendaId: string,
  ) {
    return this.aplicarEm(
      tx,
      lojaId,
      usuarioId,
      produtoVariacaoId,
      TipoMovimentacaoEstoque.CANCELAMENTO_VENDA,
      quantidade,
      undefined,
      vendaId,
    );
  }

  // Atualiza estoque e grava a movimentação na transação recebida — os dois
  // writes commitam juntos. `estoqueResultante` reflete o valor após esta
  // operação. VENDA se comporta como SAIDA (bloqueia estoque negativo);
  // CANCELAMENTO_VENDA se comporta como ENTRADA (devolve ao estoque).
  private async aplicarEm(
    tx: PrismaTransacao,
    lojaId: string,
    usuarioId: string,
    produtoVariacaoId: string,
    tipo: TipoMovimentacaoEstoque,
    valor: number,
    observacao?: string,
    vendaId?: string,
  ) {
    const variacao = await tx.produtoVariacao.findFirst({ where: { id: produtoVariacaoId, lojaId } });
    if (!variacao || !variacao.ativo) {
      throw new NotFoundException('Variação de produto não encontrada');
    }

    const atual = Number(variacao.estoqueAtual);
    let novoEstoque: number;
    let quantidadeMovimento: number;

    if (tipo === TipoMovimentacaoEstoque.ENTRADA || tipo === TipoMovimentacaoEstoque.CANCELAMENTO_VENDA) {
      novoEstoque = atual + valor;
      quantidadeMovimento = valor;
    } else if (tipo === TipoMovimentacaoEstoque.SAIDA || tipo === TipoMovimentacaoEstoque.VENDA) {
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
        vendaId,
      },
    });

    return { variacao: mapVariacao(atualizada), movimentacao: mapMovimentacao(movimentacao) };
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
