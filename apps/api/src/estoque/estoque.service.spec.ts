import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EstoqueService } from './estoque.service';

describe('EstoqueService', () => {
  let tx: {
    produtoVariacao: { findFirst: jest.Mock; update: jest.Mock };
    movimentacaoEstoque: { create: jest.Mock };
  };
  let prisma: {
    $transaction: jest.Mock;
    produtoVariacao: { findMany: jest.Mock };
    movimentacaoEstoque: { count: jest.Mock; findMany: jest.Mock };
  };
  let service: EstoqueService;

  beforeEach(() => {
    tx = {
      produtoVariacao: { findFirst: jest.fn(), update: jest.fn() },
      movimentacaoEstoque: { create: jest.fn() },
    };
    prisma = {
      // Executa o callback interativo passando o tx mockado.
      $transaction: jest.fn((cb) => cb(tx)),
      produtoVariacao: { findMany: jest.fn() },
      movimentacaoEstoque: { count: jest.fn(), findMany: jest.fn() },
    };
    service = new EstoqueService(prisma as any);
  });

  const variacao = (estoqueAtual: number, over = {}) => ({
    id: 'v1',
    produtoId: 'p1',
    lojaId: 'loja-1',
    nome: 'Padrão',
    sku: null,
    codigoBarras: null,
    precoVenda: 5,
    precoCusto: null,
    estoqueAtual,
    estoqueMinimo: 3,
    ativo: true,
    ...over,
  });

  function prepararMov(estoqueAtualAntes: number) {
    tx.produtoVariacao.findFirst.mockResolvedValue(variacao(estoqueAtualAntes));
    tx.produtoVariacao.update.mockImplementation(({ data }) => variacao(data.estoqueAtual));
    tx.movimentacaoEstoque.create.mockImplementation(({ data }) => ({
      id: 'm1',
      ...data,
      criadoEm: new Date(),
    }));
  }

  describe('entrada', () => {
    it('soma ao estoque e grava movimentação positiva', async () => {
      prepararMov(10);

      const r = await service.entrada('loja-1', 'u1', { produtoVariacaoId: 'v1', quantidade: 5 });

      expect(tx.produtoVariacao.update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { estoqueAtual: 15 } });
      expect(tx.movimentacaoEstoque.create.mock.calls[0][0].data).toMatchObject({
        tipo: 'ENTRADA',
        quantidade: 5,
        estoqueResultante: 15,
      });
      expect(r.variacao.estoqueAtual).toBe(15);
    });
  });

  describe('saida', () => {
    it('subtrai do estoque e grava movimentação negativa', async () => {
      prepararMov(10);

      await service.saida('loja-1', 'u1', { produtoVariacaoId: 'v1', quantidade: 4 });

      expect(tx.produtoVariacao.update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { estoqueAtual: 6 } });
      expect(tx.movimentacaoEstoque.create.mock.calls[0][0].data).toMatchObject({ tipo: 'SAIDA', quantidade: -4, estoqueResultante: 6 });
    });

    it('bloqueia saída que deixaria o estoque negativo', async () => {
      prepararMov(3);

      await expect(service.saida('loja-1', 'u1', { produtoVariacaoId: 'v1', quantidade: 5 })).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.produtoVariacao.update).not.toHaveBeenCalled();
    });
  });

  describe('ajuste', () => {
    it('define o valor absoluto contado e grava a diferença', async () => {
      prepararMov(10);

      await service.ajuste('loja-1', 'u1', { produtoVariacaoId: 'v1', quantidadeContada: 8 });

      expect(tx.produtoVariacao.update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { estoqueAtual: 8 } });
      // diferença negativa (contou menos do que o sistema tinha)
      expect(tx.movimentacaoEstoque.create.mock.calls[0][0].data).toMatchObject({ tipo: 'AJUSTE', quantidade: -2, estoqueResultante: 8 });
    });
  });

  it('rejeita movimentar variação inexistente na loja', async () => {
    tx.produtoVariacao.findFirst.mockResolvedValue(null);

    await expect(service.entrada('loja-1', 'u1', { produtoVariacaoId: 'x', quantidade: 1 })).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('ruptura', () => {
    it('retorna só variações no piso ou abaixo', async () => {
      prisma.produtoVariacao.findMany.mockResolvedValue([
        variacao(1, { estoqueMinimo: 3, produto: { nome: 'A' } }), // 1 <= 3 → ruptura
        variacao(5, { id: 'v2', estoqueMinimo: 3, produto: { nome: 'B' } }), // 5 > 3 → não
      ]);

      const r = await service.ruptura('loja-1');

      expect(r).toHaveLength(1);
      expect(r[0].produtoNome).toBe('A');
    });
  });
});
