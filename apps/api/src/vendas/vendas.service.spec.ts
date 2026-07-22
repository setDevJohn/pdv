import { NotFoundException } from '@nestjs/common';
import { VendasService } from './vendas.service';

describe('VendasService', () => {
  let tx: {
    venda: { findFirst: jest.Mock; update: jest.Mock };
    produtoVariacao: { findFirst: jest.Mock };
    itemVenda: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let prisma: {
    $transaction: jest.Mock;
    venda: { findFirst: jest.Mock; create: jest.Mock; delete: jest.Mock };
    produtoVariacao: { findFirst: jest.Mock; findMany: jest.Mock };
  };
  let service: VendasService;

  beforeEach(() => {
    tx = {
      venda: { findFirst: jest.fn(), update: jest.fn() },
      produtoVariacao: { findFirst: jest.fn() },
      itemVenda: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    prisma = {
      $transaction: jest.fn((cb) => cb(tx)),
      venda: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
      produtoVariacao: { findFirst: jest.fn(), findMany: jest.fn() },
    };
    service = new VendasService(prisma as any);
  });

  const variacao = (over = {}) => ({
    id: 'v1',
    nome: 'Padrão',
    codigoBarras: '789',
    precoVenda: 5,
    estoqueAtual: 10,
    ativo: true,
    produto: { nome: 'Refrigerante', ativo: true },
    ...over,
  });

  const vendaAberta = {
    id: 'venda-1',
    lojaId: 'loja-1',
    operadorId: 'u1',
    status: 'ABERTA',
  };

  function prepararRecalculo(itens: Array<{ total: number }>) {
    tx.itemVenda.findMany.mockResolvedValue(
      itens.map((i, idx) => ({ id: `i${idx}`, ...i })),
    );
    tx.venda.update.mockImplementation(({ data }) => ({
      id: 'venda-1',
      status: 'ABERTA',
      subtotal: data.subtotal,
      desconto: 0,
      total: data.total,
      criadoEm: new Date(),
      itens: itens.map((i, idx) => ({
        id: `i${idx}`,
        produtoVariacaoId: 'v1',
        descricao: 'Refrigerante',
        quantidade: 1,
        precoUnitario: i.total,
        total: i.total,
      })),
    }));
  }

  describe('abrir', () => {
    it('reaproveita a venda aberta existente do operador', async () => {
      prisma.venda.findFirst.mockResolvedValue({
        ...vendaAberta,
        subtotal: 0,
        desconto: 0,
        total: 0,
        criadoEm: new Date(),
        itens: [],
      });

      const r = await service.abrir('loja-1', 'u1');

      expect(prisma.venda.create).not.toHaveBeenCalled();
      expect(r.id).toBe('venda-1');
    });

    it('cria uma venda nova quando não há aberta', async () => {
      prisma.venda.findFirst.mockResolvedValue(null);
      prisma.venda.create.mockResolvedValue({
        ...vendaAberta,
        subtotal: 0,
        desconto: 0,
        total: 0,
        criadoEm: new Date(),
        itens: [],
      });

      await service.abrir('loja-1', 'u1');

      expect(prisma.venda.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { lojaId: 'loja-1', operadorId: 'u1' },
        }),
      );
    });
  });

  describe('adicionarItem', () => {
    it('cria um item novo com preço congelado da variação', async () => {
      tx.venda.findFirst.mockResolvedValue(vendaAberta);
      tx.produtoVariacao.findFirst.mockResolvedValue(variacao());
      tx.itemVenda.findFirst.mockResolvedValue(null);
      prepararRecalculo([{ total: 10 }]);

      await service.adicionarItem('loja-1', 'u1', 'venda-1', {
        produtoVariacaoId: 'v1',
        quantidade: 2,
      });

      expect(tx.itemVenda.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            descricao: 'Refrigerante',
            quantidade: 2,
            precoUnitario: 5,
            total: 10,
          }),
        }),
      );
    });

    it('soma na linha existente ao bipar o mesmo produto de novo', async () => {
      tx.venda.findFirst.mockResolvedValue(vendaAberta);
      tx.produtoVariacao.findFirst.mockResolvedValue(variacao());
      tx.itemVenda.findFirst.mockResolvedValue({
        id: 'i0',
        quantidade: 1,
        precoUnitario: 5,
      });
      prepararRecalculo([{ total: 15 }]);

      await service.adicionarItem('loja-1', 'u1', 'venda-1', {
        produtoVariacaoId: 'v1',
        quantidade: 2,
      });

      expect(tx.itemVenda.create).not.toHaveBeenCalled();
      expect(tx.itemVenda.update).toHaveBeenCalledWith({
        where: { id: 'i0' },
        data: { quantidade: 3, total: 15 },
      });
    });

    it('rejeita variação inexistente ou inativa na loja', async () => {
      tx.venda.findFirst.mockResolvedValue(vendaAberta);
      tx.produtoVariacao.findFirst.mockResolvedValue(null);

      await expect(
        service.adicionarItem('loja-1', 'u1', 'venda-1', {
          produtoVariacaoId: 'x',
          quantidade: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejeita quando não há venda aberta do operador com esse id', async () => {
      tx.venda.findFirst.mockResolvedValue(null);

      await expect(
        service.adicionarItem('loja-1', 'u1', 'venda-1', {
          produtoVariacaoId: 'v1',
          quantidade: 1,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(tx.produtoVariacao.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('atualizarItem', () => {
    it('recalcula o total do item pela nova quantidade', async () => {
      tx.venda.findFirst.mockResolvedValue(vendaAberta);
      tx.itemVenda.findFirst.mockResolvedValue({ id: 'i0', precoUnitario: 5 });
      prepararRecalculo([{ total: 20 }]);

      await service.atualizarItem('loja-1', 'u1', 'venda-1', 'i0', {
        quantidade: 4,
      });

      expect(tx.itemVenda.update).toHaveBeenCalledWith({
        where: { id: 'i0' },
        data: { quantidade: 4, total: 20 },
      });
    });

    it('rejeita item que não pertence à venda', async () => {
      tx.venda.findFirst.mockResolvedValue(vendaAberta);
      tx.itemVenda.findFirst.mockResolvedValue(null);

      await expect(
        service.atualizarItem('loja-1', 'u1', 'venda-1', 'inexistente', {
          quantidade: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removerItem', () => {
    it('remove o item e recalcula o total da venda', async () => {
      tx.venda.findFirst.mockResolvedValue(vendaAberta);
      tx.itemVenda.findFirst.mockResolvedValue({ id: 'i0' });
      prepararRecalculo([]);

      const r = await service.removerItem('loja-1', 'u1', 'venda-1', 'i0');

      expect(tx.itemVenda.delete).toHaveBeenCalledWith({ where: { id: 'i0' } });
      expect(r.total).toBe(0);
    });
  });

  describe('descartar', () => {
    it('apaga a venda aberta', async () => {
      prisma.venda.findFirst.mockResolvedValue(vendaAberta);

      await service.descartar('loja-1', 'u1', 'venda-1');

      expect(prisma.venda.delete).toHaveBeenCalledWith({
        where: { id: 'venda-1' },
      });
    });

    it('rejeita descartar venda que não está aberta ou não é do operador', async () => {
      prisma.venda.findFirst.mockResolvedValue(null);

      await expect(
        service.descartar('loja-1', 'u1', 'venda-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.venda.delete).not.toHaveBeenCalled();
    });
  });

  describe('buscar', () => {
    it('retorna a variação exata quando o código de barras bate', async () => {
      prisma.produtoVariacao.findFirst.mockResolvedValue(variacao());

      const r = await service.buscar('loja-1', '789');

      expect(r.exato).toMatchObject({
        produtoVariacaoId: 'v1',
        descricao: 'Refrigerante',
        precoVenda: 5,
      });
      expect(r.opcoes).toEqual([]);
      expect(prisma.produtoVariacao.findMany).not.toHaveBeenCalled();
    });

    it('busca por nome/SKU quando não há match exato de código de barras', async () => {
      prisma.produtoVariacao.findFirst.mockResolvedValue(null);
      prisma.produtoVariacao.findMany.mockResolvedValue([variacao()]);

      const r = await service.buscar('loja-1', 'refri');

      expect(r.exato).toBeNull();
      expect(r.opcoes).toHaveLength(1);
      expect(r.opcoes[0].produtoVariacaoId).toBe('v1');
    });
  });
});
