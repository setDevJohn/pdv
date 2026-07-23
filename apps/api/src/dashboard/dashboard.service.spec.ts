import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let prisma: {
    venda: { aggregate: jest.Mock; findMany: jest.Mock };
    itemVenda: { groupBy: jest.Mock };
    produtoVariacao: { findMany: jest.Mock };
  };
  let service: DashboardService;

  beforeEach(() => {
    prisma = {
      venda: { aggregate: jest.fn(), findMany: jest.fn() },
      itemVenda: { groupBy: jest.fn() },
      produtoVariacao: { findMany: jest.fn() },
    };
    service = new DashboardService(prisma as any);
  });

  describe('resumo', () => {
    it('agrega quantidade e faturamento de hoje/semana/mês e calcula o ticket médio do mês', async () => {
      prisma.venda.aggregate
        .mockResolvedValueOnce({ _count: { _all: 2 }, _sum: { total: 30 } }) // hoje
        .mockResolvedValueOnce({ _count: { _all: 5 }, _sum: { total: 80 } }) // semana
        .mockResolvedValueOnce({ _count: { _all: 10 }, _sum: { total: 200 } }); // mês

      const r = await service.resumo('loja-1');

      expect(r.hoje).toEqual({ quantidadeVendas: 2, faturamento: 30 });
      expect(r.semana).toEqual({ quantidadeVendas: 5, faturamento: 80 });
      expect(r.mes).toEqual({ quantidadeVendas: 10, faturamento: 200 });
      expect(r.ticketMedioMes).toBe(20);
    });

    it('ticket médio do mês é 0 quando não há vendas', async () => {
      prisma.venda.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { total: null } });

      const r = await service.resumo('loja-1');

      expect(r.ticketMedioMes).toBe(0);
    });
  });

  describe('vendasPorDia', () => {
    it('preenche com zero os dias sem venda no período', async () => {
      prisma.venda.findMany.mockResolvedValue([
        { finalizadoEm: new Date(2026, 6, 21, 15, 30), total: 20 },
        { finalizadoEm: new Date(2026, 6, 21, 18, 0), total: 25.5 },
      ]);

      const r = await service.vendasPorDia('loja-1', { de: '2026-07-20', ate: '2026-07-22' });

      expect(r).toEqual([
        { data: '2026-07-20', quantidadeVendas: 0, faturamento: 0 },
        { data: '2026-07-21', quantidadeVendas: 2, faturamento: 45.5 },
        { data: '2026-07-22', quantidadeVendas: 0, faturamento: 0 },
      ]);
    });

    it('usa o fuso local para agrupar — data-only não desloca um dia', async () => {
      prisma.venda.findMany.mockResolvedValue([]);

      const r = await service.vendasPorDia('loja-1', { de: '2026-07-20', ate: '2026-07-20' });

      expect(r).toEqual([{ data: '2026-07-20', quantidadeVendas: 0, faturamento: 0 }]);
    });
  });

  describe('produtosMaisVendidos', () => {
    it('junta o agrupado com o nome do produto e ordena pela quantidade', async () => {
      prisma.itemVenda.groupBy.mockResolvedValue([{ produtoVariacaoId: 'v1', _sum: { quantidade: 12, total: 78 } }]);
      prisma.produtoVariacao.findMany.mockResolvedValue([{ id: 'v1', nome: 'Padrão', produto: { nome: 'Refrigerante' } }]);

      const r = await service.produtosMaisVendidos('loja-1', {});

      expect(r).toEqual([{ produtoVariacaoId: 'v1', descricao: 'Refrigerante', quantidade: 12, total: 78 }]);
    });

    it('retorna lista vazia sem consultar variações quando não há vendas no período', async () => {
      prisma.itemVenda.groupBy.mockResolvedValue([]);

      const r = await service.produtosMaisVendidos('loja-1', {});

      expect(r).toEqual([]);
      expect(prisma.produtoVariacao.findMany).not.toHaveBeenCalled();
    });

    it('rotula como "Produto removido" quando a variação não existe mais', async () => {
      prisma.itemVenda.groupBy.mockResolvedValue([{ produtoVariacaoId: 'v-excluida', _sum: { quantidade: 1, total: 5 } }]);
      prisma.produtoVariacao.findMany.mockResolvedValue([]);

      const r = await service.produtosMaisVendidos('loja-1', {});

      expect(r[0].descricao).toBe('Produto removido');
    });
  });

  describe('gerarPlanilha', () => {
    it('gera um workbook com as abas de vendas e produtos mais vendidos', async () => {
      prisma.venda.findMany.mockResolvedValue([
        {
          finalizadoEm: new Date('2026-07-22T10:00:00'),
          operador: { nome: 'Fulano' },
          itens: [{ quantidade: 2 }],
          subtotal: 13,
          desconto: 0,
          total: 13,
          troco: 7,
          pagamentos: [{ forma: 'DINHEIRO', valor: 13 }],
        },
      ]);
      prisma.itemVenda.groupBy.mockResolvedValue([]);

      const workbook = await service.gerarPlanilha('loja-1', {});

      expect(workbook.getWorksheet('Vendas')?.rowCount).toBe(2); // cabeçalho + 1 venda
      expect(workbook.getWorksheet('Produtos mais vendidos')).toBeDefined();
    });
  });
});
