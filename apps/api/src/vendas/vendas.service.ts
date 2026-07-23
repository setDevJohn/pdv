import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstoqueService } from '../estoque/estoque.service';
import { StatusCaixa, StatusVenda, FormaPagamento } from '../generated/prisma/enums';
import { PAYMENT_GATEWAY, type PaymentGateway } from './payment-gateway';
import {
  AdicionarItemDto,
  AtualizarItemDto,
  CancelarVendaDto,
  FinalizarVendaDto,
  ListarVendasQueryDto,
} from './dto/venda.dto';
import { mapVenda } from './venda.mapper';

const POR_PAGINA_PADRAO = 20;

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly estoqueService: EstoqueService,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: PaymentGateway,
  ) {}

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
  async descartar(lojaId: string, operadorId: string, vendaId: string) {
    await this.exigirVendaAberta(this.prisma, lojaId, operadorId, vendaId);
    await this.prisma.venda.delete({ where: { id: vendaId } });
  }

  // Pagamento + baixa de estoque + vínculo com o caixa aberto, tudo na mesma
  // transação (ou tudo commita, ou nada muda). Só dinheiro gera troco — cartão
  // e Pix não podem exceder o total (o adquirente não devolve troco).
  async finalizar(lojaId: string, operadorId: string, vendaId: string, dto: FinalizarVendaDto) {
    return this.prisma.$transaction(async (tx) => {
      const venda = await tx.venda.findFirst({
        where: { id: vendaId, lojaId, operadorId, status: StatusVenda.ABERTA },
        include: { itens: true },
      });
      if (!venda) {
        throw new NotFoundException('Venda aberta não encontrada');
      }
      if (venda.itens.length === 0) {
        throw new BadRequestException('Venda sem itens não pode ser finalizada');
      }

      const caixa = await tx.caixa.findFirst({ where: { lojaId, status: StatusCaixa.ABERTO } });
      if (!caixa) {
        throw new NotFoundException('Nenhum caixa aberto nesta loja');
      }

      const porForma = new Map<FormaPagamento, number>();
      for (const pagamento of dto.pagamentos) {
        if (porForma.has(pagamento.forma)) {
          throw new BadRequestException('Informe cada forma de pagamento uma única vez');
        }
        porForma.set(pagamento.forma, pagamento.valor);
      }

      const total = Number(venda.total);
      const valorCartao = porForma.get(FormaPagamento.CARTAO) ?? 0;
      const valorPix = porForma.get(FormaPagamento.PIX) ?? 0;
      const emOutrasFormas = dinheiro(valorCartao + valorPix);
      if (emOutrasFormas > total) {
        throw new BadRequestException('Pagamento em cartão/Pix não pode exceder o total da venda');
      }
      const dinheiroInformado = porForma.get(FormaPagamento.DINHEIRO) ?? 0;
      const faltaCobrirEmDinheiro = dinheiro(total - emOutrasFormas);
      if (dinheiroInformado < faltaCobrirEmDinheiro) {
        throw new BadRequestException('Valor pago é menor que o total da venda');
      }
      const troco = dinheiro(dinheiroInformado - faltaCobrirEmDinheiro);

      // Baixa de estoque por item, na mesma transação da venda — se algum item
      // não tiver estoque suficiente, tudo é revertido (nenhum pagamento fica
      // registrado, nenhum estoque é alterado).
      for (const item of venda.itens) {
        await this.estoqueService.aplicarNaVenda(tx, lojaId, operadorId, item.produtoVariacaoId, Number(item.quantidade), vendaId);
      }

      // O PagamentoVenda registra o valor que fica no caixa/gateway — nunca o
      // valor bruto que o cliente entregou. Em dinheiro isso é só a parte que
      // cobriu o total (faltaCobrirEmDinheiro); o troco devolvido não é
      // receita e não pode inflar o saldo do caixa (ver CaixaService.saldoEmDinheiro).
      if (valorCartao > 0) {
        const { transacaoGatewayId } = await this.paymentGateway.confirmar({ forma: FormaPagamento.CARTAO, valor: valorCartao });
        await tx.pagamentoVenda.create({ data: { vendaId, forma: FormaPagamento.CARTAO, valor: valorCartao, transacaoGatewayId } });
      }
      if (valorPix > 0) {
        const { transacaoGatewayId } = await this.paymentGateway.confirmar({ forma: FormaPagamento.PIX, valor: valorPix });
        await tx.pagamentoVenda.create({ data: { vendaId, forma: FormaPagamento.PIX, valor: valorPix, transacaoGatewayId } });
      }
      if (faltaCobrirEmDinheiro > 0) {
        await tx.pagamentoVenda.create({
          data: { vendaId, forma: FormaPagamento.DINHEIRO, valor: faltaCobrirEmDinheiro, transacaoGatewayId: null },
        });
      }

      const finalizada = await tx.venda.update({
        where: { id: vendaId },
        data: { status: StatusVenda.FINALIZADA, caixaId: caixa.id, troco, finalizadoEm: new Date() },
        include: { itens: true, pagamentos: true },
      });
      return mapVenda(finalizada);
    });
  }

  // Cancelamento de venda finalizada exige código de gerente (ver GerenteGuard
  // na rota). Estorna o estoque; o caixa se ajusta sozinho porque o saldo em
  // dinheiro (CaixaService.saldoEmDinheiro) só soma pagamentos de vendas com
  // status FINALIZADA — uma venda CANCELADA some do cálculo automaticamente.
  async cancelar(lojaId: string, aprovadorId: string, vendaId: string, dto: CancelarVendaDto) {
    return this.prisma.$transaction(async (tx) => {
      const venda = await tx.venda.findFirst({
        where: { id: vendaId, lojaId, status: StatusVenda.FINALIZADA },
        include: { itens: true },
      });
      if (!venda) {
        throw new NotFoundException('Venda finalizada não encontrada');
      }

      for (const item of venda.itens) {
        await this.estoqueService.estornarVenda(tx, lojaId, aprovadorId, item.produtoVariacaoId, Number(item.quantidade), vendaId);
      }

      const cancelada = await tx.venda.update({
        where: { id: vendaId },
        data: {
          status: StatusVenda.CANCELADA,
          canceladoEm: new Date(),
          canceladoMotivo: dto.motivo,
          canceladoAprovadorId: aprovadorId,
        },
        include: { itens: true, pagamentos: true },
      });

      await tx.logAuditoria.create({
        data: {
          lojaId,
          usuarioId: aprovadorId,
          acao: 'VENDA_CANCELADA',
          entidade: 'Venda',
          entidadeId: vendaId,
          valorAnterior: { status: 'FINALIZADA' },
          valorNovo: { status: 'CANCELADA', motivo: dto.motivo ?? null },
        },
      });

      return mapVenda(cancelada);
    });
  }

  async listar(lojaId: string, query: ListarVendasQueryDto) {
    const pagina = query.pagina ?? 1;
    const porPagina = query.porPagina ?? POR_PAGINA_PADRAO;
    const where = { lojaId, ...(query.status ? { status: query.status } : {}) };

    const [total, vendas] = await Promise.all([
      this.prisma.venda.count({ where }),
      this.prisma.venda.findMany({
        where,
        include: { operador: true },
        orderBy: { criadoEm: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    ]);

    return { items: vendas.map(mapVenda), total, pagina, porPagina };
  }

  async buscarPorId(lojaId: string, id: string) {
    const venda = await this.prisma.venda.findFirst({
      where: { id, lojaId },
      include: { itens: true, pagamentos: true, operador: true },
    });
    if (!venda) {
      throw new NotFoundException('Venda não encontrada');
    }
    return mapVenda(venda);
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
