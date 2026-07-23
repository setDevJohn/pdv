import { BadRequestException, NotFoundException } from '@nestjs/common';
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
    caixa: { findFirst: jest.Mock };
    pagamentoVenda: { create: jest.Mock };
    logAuditoria: { create: jest.Mock };
  };
  let prisma: {
    $transaction: jest.Mock;
    venda: { findFirst: jest.Mock; create: jest.Mock; delete: jest.Mock; count: jest.Mock; findMany: jest.Mock };
    produtoVariacao: { findFirst: jest.Mock; findMany: jest.Mock };
    itemVenda: { groupBy: jest.Mock };
  };
  let estoqueService: { aplicarNaVenda: jest.Mock; estornarVenda: jest.Mock };
  let paymentGateway: { confirmar: jest.Mock };
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
      caixa: { findFirst: jest.fn() },
      pagamentoVenda: { create: jest.fn() },
      logAuditoria: { create: jest.fn() },
    };
    prisma = {
      $transaction: jest.fn((cb) => cb(tx)),
      venda: { findFirst: jest.fn(), create: jest.fn(), delete: jest.fn(), count: jest.fn(), findMany: jest.fn() },
      produtoVariacao: { findFirst: jest.fn(), findMany: jest.fn() },
      itemVenda: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    estoqueService = { aplicarNaVenda: jest.fn(), estornarVenda: jest.fn() };
    paymentGateway = { confirmar: jest.fn().mockResolvedValue({ transacaoGatewayId: 'gtw-1' }) };
    service = new VendasService(prisma as any, estoqueService as any, paymentGateway as any);
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

  describe('finalizar', () => {
    const vendaComItens = {
      ...vendaAberta,
      total: 20,
      itens: [{ produtoVariacaoId: 'v1', quantidade: 2 }],
    };

    function prepararFinalizar() {
      tx.venda.findFirst.mockResolvedValue(vendaComItens);
      tx.caixa.findFirst.mockResolvedValue({ id: 'caixa-1' });
      tx.venda.update.mockImplementation(({ data }) => ({
        id: 'venda-1',
        status: data.status,
        subtotal: 20,
        desconto: 0,
        total: 20,
        troco: data.troco,
        criadoEm: new Date(),
        finalizadoEm: data.finalizadoEm,
        canceladoEm: null,
        canceladoMotivo: null,
        itens: vendaComItens.itens,
        pagamentos: [],
      }));
    }

    it('finaliza no dinheiro exato, sem troco, e baixa o estoque', async () => {
      prepararFinalizar();

      const r = await service.finalizar('loja-1', 'u1', 'venda-1', {
        pagamentos: [{ forma: 'DINHEIRO' as any, valor: 20 }],
      });

      expect(estoqueService.aplicarNaVenda).toHaveBeenCalledWith(tx, 'loja-1', 'u1', 'v1', 2, 'venda-1');
      expect(tx.pagamentoVenda.create).toHaveBeenCalledWith({
        data: { vendaId: 'venda-1', forma: 'DINHEIRO', valor: 20, transacaoGatewayId: null },
      });
      expect(tx.venda.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'FINALIZADA', caixaId: 'caixa-1', troco: 0 }) }),
      );
      expect(r.troco).toBe(0);
    });

    it('calcula o troco quando o dinheiro recebido excede o total e não deixa o troco inflar o caixa', async () => {
      prepararFinalizar();

      await service.finalizar('loja-1', 'u1', 'venda-1', {
        pagamentos: [{ forma: 'DINHEIRO' as any, valor: 25 }],
      });

      expect(tx.venda.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ troco: 5 }) }));
      // PagamentoVenda registra só o que fica no caixa (20), não o valor bruto
      // entregue pelo cliente (25) — o troco (5) não pode virar saldo.
      expect(tx.pagamentoVenda.create).toHaveBeenCalledWith({
        data: { vendaId: 'venda-1', forma: 'DINHEIRO', valor: 20, transacaoGatewayId: null },
      });
    });

    it('rejeita a mesma forma de pagamento informada duas vezes', async () => {
      prepararFinalizar();

      await expect(
        service.finalizar('loja-1', 'u1', 'venda-1', {
          pagamentos: [
            { forma: 'DINHEIRO' as any, valor: 10 },
            { forma: 'DINHEIRO' as any, valor: 10 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('divide entre cartão e dinheiro sem gerar troco indevido', async () => {
      prepararFinalizar();

      await service.finalizar('loja-1', 'u1', 'venda-1', {
        pagamentos: [
          { forma: 'CARTAO' as any, valor: 12 },
          { forma: 'DINHEIRO' as any, valor: 8 },
        ],
      });

      expect(paymentGateway.confirmar).toHaveBeenCalledWith({ forma: 'CARTAO', valor: 12 });
      expect(tx.venda.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ troco: 0 }) }));
    });

    it('rejeita cartão/Pix que excede o total (não gera troco)', async () => {
      prepararFinalizar();

      await expect(
        service.finalizar('loja-1', 'u1', 'venda-1', { pagamentos: [{ forma: 'CARTAO' as any, valor: 25 }] }),
      ).rejects.toThrow(BadRequestException);
      expect(estoqueService.aplicarNaVenda).not.toHaveBeenCalled();
    });

    it('rejeita valor pago menor que o total', async () => {
      prepararFinalizar();

      await expect(
        service.finalizar('loja-1', 'u1', 'venda-1', { pagamentos: [{ forma: 'DINHEIRO' as any, valor: 10 }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita finalizar sem caixa aberto', async () => {
      tx.venda.findFirst.mockResolvedValue(vendaComItens);
      tx.caixa.findFirst.mockResolvedValue(null);

      await expect(
        service.finalizar('loja-1', 'u1', 'venda-1', { pagamentos: [{ forma: 'DINHEIRO' as any, valor: 20 }] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejeita finalizar venda sem itens', async () => {
      tx.venda.findFirst.mockResolvedValue({ ...vendaAberta, total: 0, itens: [] });

      await expect(
        service.finalizar('loja-1', 'u1', 'venda-1', { pagamentos: [{ forma: 'DINHEIRO' as any, valor: 0 }] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelar', () => {
    it('estorna o estoque de cada item e marca a venda como CANCELADA', async () => {
      tx.venda.findFirst.mockResolvedValue({
        ...vendaAberta,
        status: 'FINALIZADA',
        itens: [{ produtoVariacaoId: 'v1', quantidade: 2 }],
      });
      tx.venda.update.mockImplementation(({ data }) => ({
        id: 'venda-1',
        status: data.status,
        subtotal: 20,
        desconto: 0,
        total: 20,
        troco: 0,
        criadoEm: new Date(),
        finalizadoEm: new Date(),
        canceladoEm: data.canceladoEm,
        canceladoMotivo: data.canceladoMotivo,
        itens: [],
        pagamentos: [],
      }));

      const r = await service.cancelar('loja-1', 'gerente-1', 'venda-1', { motivo: 'cliente desistiu' });

      expect(estoqueService.estornarVenda).toHaveBeenCalledWith(tx, 'loja-1', 'gerente-1', 'v1', 2, 'venda-1');
      expect(tx.logAuditoria.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ acao: 'VENDA_CANCELADA' }) }),
      );
      expect(r.status).toBe('CANCELADA');
    });

    it('rejeita cancelar venda que não está finalizada', async () => {
      tx.venda.findFirst.mockResolvedValue(null);

      await expect(service.cancelar('loja-1', 'gerente-1', 'venda-1', {})).rejects.toThrow(NotFoundException);
      expect(estoqueService.estornarVenda).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('lista vendas da loja com paginação', async () => {
      prisma.venda.count.mockResolvedValue(1);
      prisma.venda.findMany.mockResolvedValue([
        { ...vendaAberta, id: 'venda-1', status: 'FINALIZADA', total: 20, subtotal: 20, desconto: 0, troco: 0, criadoEm: new Date(), finalizadoEm: new Date(), canceladoEm: null, canceladoMotivo: null, itens: [], pagamentos: [], operador: { nome: 'Fulano' } },
      ]);

      const r = await service.listar('loja-1', {});

      expect(prisma.venda.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { lojaId: 'loja-1' }, skip: 0, take: 20 }));
      expect(r.items[0].operador).toBe('Fulano');
      expect(r.total).toBe(1);
    });

    // Bug real pego na auditoria manual: a query de listagem não traz `itens`
    // (ver comentário no service), então mapVenda() sozinho sempre zerava
    // quantidadeItens aqui — a tela de histórico mostrava "0" pra toda venda.
    it('preenche quantidadeItens a partir da soma agregada, não do array de itens (que não vem na query)', async () => {
      prisma.venda.count.mockResolvedValue(1);
      prisma.venda.findMany.mockResolvedValue([
        { ...vendaAberta, id: 'venda-1', status: 'FINALIZADA', total: 19.5, subtotal: 19.5, desconto: 0, troco: 0, criadoEm: new Date(), finalizadoEm: new Date(), canceladoEm: null, canceladoMotivo: null, itens: [], pagamentos: [], operador: { nome: 'Fulano' } },
      ]);
      prisma.itemVenda.groupBy.mockResolvedValue([{ vendaId: 'venda-1', _sum: { quantidade: 3 } }]);

      const r = await service.listar('loja-1', {});

      expect(prisma.itemVenda.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ by: ['vendaId'], where: { vendaId: { in: ['venda-1'] } } }),
      );
      expect(r.items[0].quantidadeItens).toBe(3);
    });

    it('não consulta a soma agregada quando a página está vazia', async () => {
      prisma.venda.count.mockResolvedValue(0);
      prisma.venda.findMany.mockResolvedValue([]);

      const r = await service.listar('loja-1', {});

      expect(prisma.itemVenda.groupBy).not.toHaveBeenCalled();
      expect(r.items).toEqual([]);
    });
  });

  describe('buscarPorId', () => {
    it('rejeita venda de outra loja', async () => {
      prisma.venda.findFirst.mockResolvedValue(null);

      await expect(service.buscarPorId('loja-1', 'venda-1')).rejects.toThrow(NotFoundException);
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
