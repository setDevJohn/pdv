import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CaixaService } from './caixa.service';

describe('CaixaService', () => {
  let prisma: {
    caixa: { findFirst: jest.Mock; findUniqueOrThrow: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock; findMany: jest.Mock };
    sangria: { create: jest.Mock; aggregate: jest.Mock };
    pagamentoVenda: { aggregate: jest.Mock };
    logAuditoria: { create: jest.Mock };
  };
  let service: CaixaService;

  beforeEach(() => {
    prisma = {
      caixa: {
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      sangria: { create: jest.fn(), aggregate: jest.fn() },
      pagamentoVenda: { aggregate: jest.fn() },
      logAuditoria: { create: jest.fn() },
    };
    service = new CaixaService(prisma as any);

    // saldo padrão: sem vendas e sem sangrias
    prisma.pagamentoVenda.aggregate.mockResolvedValue({ _sum: { valor: null } });
    prisma.sangria.aggregate.mockResolvedValue({ _sum: { valor: null } });
  });

  function resumoMock(over = {}) {
    prisma.caixa.findUniqueOrThrow.mockResolvedValue({
      id: 'cx1',
      status: 'ABERTO',
      valorInicial: 100,
      abertoEm: new Date(),
      fechadoEm: null,
      usuarioAbertura: { nome: 'Op' },
      sangrias: [],
      ...over,
    });
  }

  describe('abrir', () => {
    it('rejeita abrir quando já há caixa aberto', async () => {
      prisma.caixa.findFirst.mockResolvedValue({ id: 'cx0' });

      await expect(service.abrir('loja-1', 'u1', { valorInicial: 100 })).rejects.toThrow(ConflictException);
      expect(prisma.caixa.create).not.toHaveBeenCalled();
    });

    it('cria caixa e registra auditoria', async () => {
      prisma.caixa.findFirst.mockResolvedValue(null);
      prisma.caixa.create.mockResolvedValue({ id: 'cx1' });
      resumoMock();

      await service.abrir('loja-1', 'u1', { valorInicial: 100 });

      expect(prisma.caixa.create).toHaveBeenCalledWith({
        data: { lojaId: 'loja-1', usuarioAberturaId: 'u1', valorInicial: 100 },
      });
      expect(prisma.logAuditoria.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ acao: 'CAIXA_ABERTO' }) }),
      );
    });
  });

  describe('atual', () => {
    it('retorna null quando não há caixa aberto', async () => {
      prisma.caixa.findFirst.mockResolvedValue(null);
      await expect(service.atual('loja-1')).resolves.toBeNull();
    });

    it('calcula saldo = inicial + vendas dinheiro - sangrias', async () => {
      prisma.caixa.findFirst.mockResolvedValue({ id: 'cx1' });
      prisma.pagamentoVenda.aggregate.mockResolvedValue({ _sum: { valor: 250 } });
      prisma.sangria.aggregate.mockResolvedValue({ _sum: { valor: 50 } });
      resumoMock({ sangrias: [{ id: 's1', valor: 50, motivo: null, criadoEm: new Date(), usuario: { nome: 'Op' } }] });

      const resumo = await service.atual('loja-1');

      expect(resumo?.saldoEmDinheiro).toBe(300); // 100 + 250 - 50
      expect(resumo?.totalSangrias).toBe(50);
      expect(resumo?.vendasDinheiro).toBe(250);
    });
  });

  describe('sangria', () => {
    it('rejeita quando não há caixa aberto', async () => {
      prisma.caixa.findFirst.mockResolvedValue(null);
      await expect(service.sangria('loja-1', 'u1', { valor: 10 })).rejects.toThrow(NotFoundException);
    });

    it('bloqueia sangria maior que o saldo em dinheiro', async () => {
      prisma.caixa.findFirst.mockResolvedValue({ id: 'cx1', valorInicial: 100 });
      // saldo = 100 (sem vendas/sangrias)
      await expect(service.sangria('loja-1', 'u1', { valor: 150 })).rejects.toThrow(BadRequestException);
      expect(prisma.sangria.create).not.toHaveBeenCalled();
    });

    it('registra sangria dentro do saldo e audita', async () => {
      prisma.caixa.findFirst.mockResolvedValue({ id: 'cx1', valorInicial: 100 });
      resumoMock();

      await service.sangria('loja-1', 'u1', { valor: 40, motivo: 'troco' });

      expect(prisma.sangria.create).toHaveBeenCalledWith({
        data: { caixaId: 'cx1', usuarioId: 'u1', valor: 40, motivo: 'troco' },
      });
      expect(prisma.logAuditoria.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ acao: 'SANGRIA' }) }),
      );
    });
  });

  describe('fechar', () => {
    it('fecha e devolve a diferença entre contado e esperado', async () => {
      prisma.caixa.findFirst.mockResolvedValue({ id: 'cx1', valorInicial: 100 });
      prisma.sangria.aggregate.mockResolvedValue({ _sum: { valor: 30 } });
      resumoMock({ status: 'FECHADO', sangrias: [{ id: 's1', valor: 30, motivo: null, criadoEm: new Date(), usuario: { nome: 'Op' } }] });

      // esperado = 100 - 30 = 70; contado 65 → diferença -5 (falta)
      const r = await service.fechar('loja-1', 'u1', { valorFechamento: 65 });

      expect(prisma.caixa.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cx1' }, data: expect.objectContaining({ status: 'FECHADO', valorFechamento: 65 }) }),
      );
      expect(r.valorEsperado).toBe(70);
      expect(r.diferenca).toBe(-5);
    });
  });
});
