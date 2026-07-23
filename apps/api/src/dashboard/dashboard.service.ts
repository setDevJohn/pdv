import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { StatusVenda } from '../generated/prisma/enums';
import { PeriodoQueryDto, ProdutosMaisVendidosQueryDto } from './dto/dashboard.dto';

const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_PADRAO = 30;
const LIMITE_PADRAO = 10;

function paraNumero(valor: unknown): number {
  if (valor && typeof (valor as { toNumber?: () => number }).toNumber === 'function') {
    return (valor as { toNumber: () => number }).toNumber();
  }
  return Number(valor ?? 0);
}

// "Refrigerante" quando a variação é a padrão; "Refrigerante 500ml" quando não é
// (mesma regra de VendasService.descrever — duplicada aqui por ser só uma linha).
function descrever(produtoNome: string, variacaoNome: string): string {
  return variacaoNome === 'Padrão' ? produtoNome : `${produtoNome} ${variacaoNome}`;
}

function inicioDoDia(data: Date): Date {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fimDoDia(data: Date): Date {
  const d = new Date(data);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Segunda-feira como início da semana.
function inicioDaSemana(data: Date): Date {
  const d = inicioDoDia(data);
  const diaSemana = d.getDay();
  const diff = diaSemana === 0 ? 6 : diaSemana - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function inicioDoMes(data: Date): Date {
  const d = inicioDoDia(data);
  d.setDate(1);
  return d;
}

// Data no fuso do servidor, sem hora — chave de agrupamento por dia. MVP
// assume um único fuso (deploy em VPS único, ver docs/07); não há suporte
// a múltiplos fusos por loja.
function isoData(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// "2026-07-20" só é UTC se passado para `new Date(string)` — sempre desloca
// um dia em fuso negativo (Brasil, UTC-3). Os componentes de ano/mês/dia
// precisam virar um Date local para os filtros de período baterem com o
// dia que o operador realmente escolheu no seletor.
function dataLocal(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async resumo(lojaId: string) {
    const agora = new Date();
    const [hoje, semana, mes] = await Promise.all([
      this.janela(lojaId, inicioDoDia(agora), agora),
      this.janela(lojaId, inicioDaSemana(agora), agora),
      this.janela(lojaId, inicioDoMes(agora), agora),
    ]);

    const ticketMedioMes = mes.quantidadeVendas > 0 ? Number((mes.faturamento / mes.quantidadeVendas).toFixed(2)) : 0;

    return { hoje, semana, mes, ticketMedioMes };
  }

  // Série contínua (preenche dias sem venda com 0) — o gráfico de barras não
  // pode inferir "sem dado" onde deveria mostrar uma barra zerada. Agrupa em
  // JS (em vez de `date_trunc` no Postgres) para o dia bater com o fuso do
  // processo Node — a sessão do banco poderia truncar num fuso diferente.
  async vendasPorDia(lojaId: string, dto: PeriodoQueryDto) {
    const { inicio, fim } = this.resolverPeriodo(dto.de, dto.ate);

    const vendas = await this.prisma.venda.findMany({
      where: { lojaId, status: StatusVenda.FINALIZADA, finalizadoEm: { gte: inicio, lte: fim } },
      select: { finalizadoEm: true, total: true },
    });

    const porDia = new Map<string, { quantidadeVendas: number; faturamento: number }>();
    for (const v of vendas) {
      if (!v.finalizadoEm) continue;
      const chave = isoData(v.finalizadoEm);
      const atual = porDia.get(chave) ?? { quantidadeVendas: 0, faturamento: 0 };
      atual.quantidadeVendas += 1;
      atual.faturamento += paraNumero(v.total);
      porDia.set(chave, atual);
    }

    const dias: Array<{ data: string; quantidadeVendas: number; faturamento: number }> = [];
    for (let d = inicioDoDia(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      const chave = isoData(d);
      const valores = porDia.get(chave);
      dias.push({
        data: chave,
        quantidadeVendas: valores?.quantidadeVendas ?? 0,
        faturamento: Number((valores?.faturamento ?? 0).toFixed(2)),
      });
    }
    return dias;
  }

  async produtosMaisVendidos(lojaId: string, dto: ProdutosMaisVendidosQueryDto) {
    const { inicio, fim } = this.resolverPeriodo(dto.de, dto.ate);
    const limite = dto.limite ?? LIMITE_PADRAO;

    const agrupado = await this.prisma.itemVenda.groupBy({
      by: ['produtoVariacaoId'],
      where: { venda: { lojaId, status: StatusVenda.FINALIZADA, finalizadoEm: { gte: inicio, lte: fim } } },
      _sum: { quantidade: true, total: true },
      orderBy: { _sum: { quantidade: 'desc' } },
      take: limite,
    });
    if (agrupado.length === 0) {
      return [];
    }

    const variacoes = await this.prisma.produtoVariacao.findMany({
      where: { id: { in: agrupado.map((a) => a.produtoVariacaoId) } },
      include: { produto: true },
    });
    const porId = new Map(variacoes.map((v) => [v.id, v]));

    return agrupado.map((a) => {
      const v = porId.get(a.produtoVariacaoId);
      return {
        produtoVariacaoId: a.produtoVariacaoId,
        descricao: v ? descrever(v.produto.nome, v.nome) : 'Produto removido',
        quantidade: paraNumero(a._sum.quantidade),
        total: paraNumero(a._sum.total),
      };
    });
  }

  async gerarPlanilha(lojaId: string, dto: PeriodoQueryDto): Promise<ExcelJS.Workbook> {
    const { inicio, fim } = this.resolverPeriodo(dto.de, dto.ate);

    const [vendas, produtos] = await Promise.all([
      this.prisma.venda.findMany({
        where: { lojaId, status: StatusVenda.FINALIZADA, finalizadoEm: { gte: inicio, lte: fim } },
        include: { operador: true, pagamentos: true, itens: true },
        orderBy: { finalizadoEm: 'asc' },
      }),
      this.produtosMaisVendidos(lojaId, { de: dto.de, ate: dto.ate, limite: 50 }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PDV';
    workbook.created = new Date();

    const abaVendas = workbook.addWorksheet('Vendas');
    abaVendas.columns = [
      { header: 'Data', key: 'data', width: 18 },
      { header: 'Operador', key: 'operador', width: 22 },
      { header: 'Itens', key: 'itens', width: 8 },
      { header: 'Subtotal', key: 'subtotal', width: 12 },
      { header: 'Desconto', key: 'desconto', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Troco', key: 'troco', width: 12 },
      { header: 'Pagamento', key: 'pagamento', width: 28 },
    ];
    for (const v of vendas) {
      abaVendas.addRow({
        data: v.finalizadoEm ? v.finalizadoEm.toLocaleString('pt-BR') : '',
        operador: v.operador.nome,
        itens: v.itens.reduce((soma, i) => soma + paraNumero(i.quantidade), 0),
        subtotal: paraNumero(v.subtotal),
        desconto: paraNumero(v.desconto),
        total: paraNumero(v.total),
        troco: paraNumero(v.troco),
        pagamento: v.pagamentos.map((p) => `${p.forma} ${paraNumero(p.valor).toFixed(2)}`).join(', '),
      });
    }

    const abaProdutos = workbook.addWorksheet('Produtos mais vendidos');
    abaProdutos.columns = [
      { header: 'Produto', key: 'produto', width: 32 },
      { header: 'Quantidade', key: 'quantidade', width: 14 },
      { header: 'Total', key: 'total', width: 14 },
    ];
    for (const p of produtos) {
      abaProdutos.addRow({ produto: p.descricao, quantidade: p.quantidade, total: p.total });
    }

    return workbook;
  }

  private async janela(lojaId: string, inicio: Date, fim: Date) {
    const agregado = await this.prisma.venda.aggregate({
      where: { lojaId, status: StatusVenda.FINALIZADA, finalizadoEm: { gte: inicio, lte: fim } },
      _count: { _all: true },
      _sum: { total: true },
    });
    return { quantidadeVendas: agregado._count._all, faturamento: paraNumero(agregado._sum.total) };
  }

  private resolverPeriodo(de?: string, ate?: string): { inicio: Date; fim: Date } {
    const fim = ate ? fimDoDia(dataLocal(ate)) : new Date();
    const inicio = de ? inicioDoDia(dataLocal(de)) : new Date(fim.getTime() - (DIAS_PADRAO - 1) * DIA_MS);
    return { inicio, fim };
  }
}
