import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FormaPagamento, StatusCaixa, StatusVenda } from '../generated/prisma/enums';
import { AbrirCaixaDto, FecharCaixaDto, HistoricoCaixaQueryDto, SangriaDto } from './dto/caixa.dto';

const POR_PAGINA_PADRAO = 20;

function num(valor: unknown): number {
  if (valor && typeof (valor as { toNumber?: () => number }).toNumber === 'function') {
    return (valor as { toNumber: () => number }).toNumber();
  }
  return Number(valor);
}

@Injectable()
export class CaixaService {
  constructor(private readonly prisma: PrismaService) {}

  async abrir(lojaId: string, usuarioId: string, dto: AbrirCaixaDto) {
    const aberto = await this.prisma.caixa.findFirst({ where: { lojaId, status: StatusCaixa.ABERTO } });
    if (aberto) {
      throw new ConflictException('Já existe um caixa aberto nesta loja');
    }

    const caixa = await this.prisma.caixa.create({
      data: { lojaId, usuarioAberturaId: usuarioId, valorInicial: dto.valorInicial },
    });

    await this.registrarAuditoria(lojaId, usuarioId, 'CAIXA_ABERTO', caixa.id, { valorInicial: dto.valorInicial });

    return this.montarResumo(caixa.id);
  }

  // Caixa aberto da loja com resumo, ou null quando não há nenhum aberto.
  async atual(lojaId: string) {
    const caixa = await this.prisma.caixa.findFirst({ where: { lojaId, status: StatusCaixa.ABERTO } });
    if (!caixa) {
      return null;
    }
    return this.montarResumo(caixa.id);
  }

  async sangria(lojaId: string, usuarioId: string, dto: SangriaDto) {
    const caixa = await this.exigirCaixaAberto(lojaId);

    const saldo = await this.saldoEmDinheiro(caixa.id, num(caixa.valorInicial));
    if (dto.valor > saldo) {
      throw new BadRequestException('Sangria maior que o saldo em dinheiro disponível no caixa');
    }

    await this.prisma.sangria.create({
      data: { caixaId: caixa.id, usuarioId, valor: dto.valor, motivo: dto.motivo },
    });

    await this.registrarAuditoria(lojaId, usuarioId, 'SANGRIA', caixa.id, { valor: dto.valor, motivo: dto.motivo ?? null });

    return this.montarResumo(caixa.id);
  }

  async fechar(lojaId: string, usuarioId: string, dto: FecharCaixaDto) {
    const caixa = await this.exigirCaixaAberto(lojaId);
    const esperado = await this.saldoEmDinheiro(caixa.id, num(caixa.valorInicial));

    await this.prisma.caixa.update({
      where: { id: caixa.id },
      data: { status: StatusCaixa.FECHADO, valorFechamento: dto.valorFechamento, fechadoEm: new Date() },
    });

    await this.registrarAuditoria(lojaId, usuarioId, 'CAIXA_FECHADO', caixa.id, {
      valorFechamento: dto.valorFechamento,
      valorEsperado: esperado,
      diferenca: Number((dto.valorFechamento - esperado).toFixed(2)),
    });

    const resumo = await this.montarResumo(caixa.id);
    return {
      ...resumo,
      valorEsperado: esperado,
      diferenca: Number((dto.valorFechamento - esperado).toFixed(2)),
    };
  }

  async historico(lojaId: string, query: HistoricoCaixaQueryDto) {
    const pagina = query.pagina ?? 1;
    const porPagina = query.porPagina ?? POR_PAGINA_PADRAO;
    const where = { lojaId, status: StatusCaixa.FECHADO };

    const [total, caixas] = await Promise.all([
      this.prisma.caixa.count({ where }),
      this.prisma.caixa.findMany({
        where,
        include: { usuarioAbertura: true },
        orderBy: { fechadoEm: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
      }),
    ]);

    return {
      items: caixas.map((c) => ({
        id: c.id,
        valorInicial: num(c.valorInicial),
        valorFechamento: c.valorFechamento === null ? null : num(c.valorFechamento),
        abertoEm: c.abertoEm,
        fechadoEm: c.fechadoEm,
        operador: c.usuarioAbertura.nome,
      })),
      total,
      pagina,
      porPagina,
    };
  }

  private async exigirCaixaAberto(lojaId: string) {
    const caixa = await this.prisma.caixa.findFirst({ where: { lojaId, status: StatusCaixa.ABERTO } });
    if (!caixa) {
      throw new NotFoundException('Nenhum caixa aberto nesta loja');
    }
    return caixa;
  }

  // valorInicial + pagamentos em dinheiro de vendas finalizadas do caixa - sangrias.
  // Enquanto não há vendas (features 5/6), o termo de vendas é 0.
  private async saldoEmDinheiro(caixaId: string, valorInicial: number): Promise<number> {
    const [pagamentos, sangrias] = await Promise.all([
      this.prisma.pagamentoVenda.aggregate({
        _sum: { valor: true },
        where: { forma: FormaPagamento.DINHEIRO, venda: { caixaId, status: StatusVenda.FINALIZADA } },
      }),
      this.prisma.sangria.aggregate({ _sum: { valor: true }, where: { caixaId } }),
    ]);

    const vendasDinheiro = num(pagamentos._sum.valor ?? 0);
    const totalSangrias = num(sangrias._sum.valor ?? 0);
    return Number((valorInicial + vendasDinheiro - totalSangrias).toFixed(2));
  }

  private async montarResumo(caixaId: string) {
    const caixa = await this.prisma.caixa.findUniqueOrThrow({
      where: { id: caixaId },
      include: {
        usuarioAbertura: true,
        sangrias: { include: { usuario: true }, orderBy: { criadoEm: 'desc' } },
      },
    });

    const valorInicial = num(caixa.valorInicial);
    const totalSangrias = caixa.sangrias.reduce((soma, s) => soma + num(s.valor), 0);
    const saldoEmDinheiro = await this.saldoEmDinheiro(caixaId, valorInicial);

    return {
      id: caixa.id,
      status: caixa.status,
      valorInicial,
      valorFechamento: caixa.valorFechamento === null ? null : num(caixa.valorFechamento),
      abertoEm: caixa.abertoEm,
      fechadoEm: caixa.fechadoEm,
      operador: caixa.usuarioAbertura.nome,
      totalSangrias: Number(totalSangrias.toFixed(2)),
      vendasDinheiro: Number((saldoEmDinheiro - valorInicial + totalSangrias).toFixed(2)),
      saldoEmDinheiro,
      sangrias: caixa.sangrias.map((s) => ({
        id: s.id,
        valor: num(s.valor),
        motivo: s.motivo,
        criadoEm: s.criadoEm,
        usuario: s.usuario.nome,
      })),
    };
  }

  private registrarAuditoria(lojaId: string, usuarioId: string, acao: string, caixaId: string, valorNovo: object) {
    return this.prisma.logAuditoria.create({
      data: { lojaId, usuarioId, acao, entidade: 'Caixa', entidadeId: caixaId, valorNovo },
    });
  }
}
