import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatusVenda } from '../generated/prisma/enums';
import { AdicionarItemDto, AtualizarItemDto } from './dto/venda.dto';
import { mapVenda } from './venda.mapper';

const LIMITE_BUSCA = 20;

function dinheiro(valor: number): number {
  return Number(valor.toFixed(2));
}

// "Refrigerante" quando a variação é a padrão; "Refrigerante 500ml" quando não é.
function descrever(produtoNome: string, variacaoNome: string): string {
  return variacaoNome === 'Padrão'
    ? produtoNome
    : `${produtoNome} ${variacaoNome}`;
}

@Injectable()
export class VendasService {
  constructor(private readonly prisma: PrismaService) {}

  // Uma venda ABERTA por operador na loja. Bipar um item numa segunda aba ou
  // depois de um F5 continua o mesmo carrinho em vez de criar outro.
  async abrir(lojaId: string, operadorId: string) {
    const existente = await this.buscarAberta(lojaId, operadorId);
    if (existente) {
      return existente;
    }

    const venda = await this.prisma.venda.create({
      data: { lojaId, operadorId },
      include: { itens: { orderBy: { id: 'asc' } } },
    });
    return mapVenda(venda);
  }

  async aberta(lojaId: string, operadorId: string) {
    return (await this.buscarAberta(lojaId, operadorId)) ?? null;
  }

  async adicionarItem(
    lojaId: string,
    operadorId: string,
    vendaId: string,
    dto: AdicionarItemDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.exigirVendaAberta(tx, lojaId, operadorId, vendaId);

      const variacao = await tx.produtoVariacao.findFirst({
        where: {
          id: dto.produtoVariacaoId,
          lojaId,
          ativo: true,
          produto: { ativo: true },
        },
        include: { produto: true },
      });
      if (!variacao) {
        throw new NotFoundException('Variação de produto não encontrada');
      }

      // Preço vem sempre do banco e fica congelado no item — o cliente manda
      // apenas variação e quantidade, nunca valor.
      const precoUnitario = Number(variacao.precoVenda);
      const existente = await tx.itemVenda.findFirst({
        where: { vendaId, produtoVariacaoId: dto.produtoVariacaoId },
      });

      // Bipar o mesmo produto de novo soma na linha existente em vez de criar
      // outra — é o comportamento que o operador espera no PDV.
      if (existente) {
        const quantidade = Number(existente.quantidade) + dto.quantidade;
        await tx.itemVenda.update({
          where: { id: existente.id },
          data: {
            quantidade,
            total: dinheiro(quantidade * Number(existente.precoUnitario)),
          },
        });
      } else {
        await tx.itemVenda.create({
          data: {
            vendaId,
            produtoVariacaoId: variacao.id,
            descricao: descrever(variacao.produto.nome, variacao.nome),
            quantidade: dto.quantidade,
            precoUnitario,
            total: dinheiro(dto.quantidade * precoUnitario),
          },
        });
      }

      return this.recalcular(tx, vendaId);
    });
  }

  async atualizarItem(
    lojaId: string,
    operadorId: string,
    vendaId: string,
    itemId: string,
    dto: AtualizarItemDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.exigirVendaAberta(tx, lojaId, operadorId, vendaId);
      const item = await this.exigirItem(tx, vendaId, itemId);

      await tx.itemVenda.update({
        where: { id: itemId },
        data: {
          quantidade: dto.quantidade,
          total: dinheiro(dto.quantidade * Number(item.precoUnitario)),
        },
      });

      return this.recalcular(tx, vendaId);
    });
  }

  async removerItem(
    lojaId: string,
    operadorId: string,
    vendaId: string,
    itemId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.exigirVendaAberta(tx, lojaId, operadorId, vendaId);
      await this.exigirItem(tx, vendaId, itemId);

      await tx.itemVenda.delete({ where: { id: itemId } });

      return this.recalcular(tx, vendaId);
    });
  }

  // Carrinho abandonado não é evento de negócio (nada saiu do estoque, nada
  // entrou no caixa): apaga a venda em vez de deixar rascunho no histórico.
  // O CANCELADA do enum é para venda já finalizada (feature 6).
  async descartar(lojaId: string, operadorId: string, vendaId: string) {
    await this.exigirVendaAberta(this.prisma, lojaId, operadorId, vendaId);
    await this.prisma.venda.delete({ where: { id: vendaId } });
  }

  // Leitura do leitor HID: código de barras exato entra direto no carrinho;
  // qualquer outro termo devolve candidatos para o operador escolher.
  async buscar(lojaId: string, termo: string) {
    const busca = termo.trim();

    const exato = await this.prisma.produtoVariacao.findFirst({
      where: {
        lojaId,
        codigoBarras: busca,
        ativo: true,
        produto: { ativo: true },
      },
      include: { produto: true },
    });
    if (exato) {
      return { exato: this.mapCatalogo(exato), opcoes: [] };
    }

    const variacoes = await this.prisma.produtoVariacao.findMany({
      where: {
        lojaId,
        ativo: true,
        produto: { ativo: true },
        OR: [
          {
            produto: {
              nome: { contains: busca, mode: 'insensitive' as const },
            },
          },
          { sku: { contains: busca, mode: 'insensitive' as const } },
          { codigoBarras: { contains: busca } },
        ],
      },
      include: { produto: true },
      orderBy: [{ produto: { nome: 'asc' } }, { nome: 'asc' }],
      take: LIMITE_BUSCA,
    });

    return { exato: null, opcoes: variacoes.map((v) => this.mapCatalogo(v)) };
  }

  private mapCatalogo(v: {
    id: string;
    nome: string;
    codigoBarras: string | null;
    precoVenda: unknown;
    estoqueAtual: unknown;
    produto: { nome: string };
  }) {
    return {
      produtoVariacaoId: v.id,
      descricao: descrever(v.produto.nome, v.nome),
      codigoBarras: v.codigoBarras,
      precoVenda: Number(v.precoVenda),
      // Só informativo: a baixa (e a validação de estoque suficiente) acontece
      // na finalização, feature 6. Aqui serve para a tela avisar o operador.
      estoqueAtual: Number(v.estoqueAtual),
    };
  }

  private async buscarAberta(lojaId: string, operadorId: string) {
    const venda = await this.prisma.venda.findFirst({
      where: { lojaId, operadorId, status: StatusVenda.ABERTA },
      include: { itens: { orderBy: { id: 'asc' } } },
    });
    return venda ? mapVenda(venda) : undefined;
  }

  private async exigirVendaAberta(
    tx: Pick<PrismaService, 'venda'>,
    lojaId: string,
    operadorId: string,
    vendaId: string,
  ) {
    const venda = await tx.venda.findFirst({
      where: { id: vendaId, lojaId, operadorId, status: StatusVenda.ABERTA },
      select: { id: true },
    });
    if (!venda) {
      throw new NotFoundException('Venda aberta não encontrada');
    }
    return venda;
  }

  private async exigirItem(
    tx: Pick<PrismaService, 'itemVenda'>,
    vendaId: string,
    itemId: string,
  ) {
    const item = await tx.itemVenda.findFirst({
      where: { id: itemId, vendaId },
    });
    if (!item) {
      throw new NotFoundException('Item não encontrado nesta venda');
    }
    return item;
  }

  // Totais são derivados dos itens — nunca acumulados incrementalmente, para
  // não divergir depois de uma sequência de adições/remoções.
  private async recalcular(
    tx: Pick<PrismaService, 'venda' | 'itemVenda'>,
    vendaId: string,
  ) {
    const itens = await tx.itemVenda.findMany({
      where: { vendaId },
      orderBy: { id: 'asc' },
    });
    const subtotal = dinheiro(
      itens.reduce((soma, i) => soma + Number(i.total), 0),
    );

    const venda = await tx.venda.update({
      where: { id: vendaId },
      data: { subtotal, total: subtotal },
      include: { itens: { orderBy: { id: 'asc' } } },
    });
    return mapVenda(venda);
  }
}
