import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssinaturaService } from './assinatura.service';
import { PlanoTipo, StatusAssinatura } from '../generated/prisma/enums';

const DIA_MS = 24 * 60 * 60 * 1000;

describe('AssinaturaService', () => {
  let prisma: { assinatura: { findUnique: jest.Mock; updateMany: jest.Mock } };
  let service: AssinaturaService;

  beforeEach(() => {
    prisma = { assinatura: { findUnique: jest.fn(), updateMany: jest.fn() } };
    service = new AssinaturaService(prisma as any);
  });

  function assinaturaTrial(overrides: Record<string, unknown> = {}) {
    return {
      empresaId: 'empresa-1',
      plano: PlanoTipo.MENSAL,
      status: StatusAssinatura.TRIAL,
      trialIniciadoEm: new Date(Date.now() - 2 * DIA_MS), // começou há 2 dias
      trialLimiteInsercoes: 50,
      trialInsercoesUsadas: 10,
      ...overrides,
    };
  }

  describe('obterStatus', () => {
    it('lança NotFound quando não há assinatura', async () => {
      prisma.assinatura.findUnique.mockResolvedValue(null);
      await expect(service.obterStatus('empresa-1')).rejects.toThrow(NotFoundException);
    });

    it('calcula dias restantes e inserções para um trial ativo', async () => {
      prisma.assinatura.findUnique.mockResolvedValue(assinaturaTrial());

      const status = await service.obterStatus('empresa-1');

      expect(status.emTrial).toBe(true);
      expect(status.expirado).toBe(false);
      expect(status.diasRestantes).toBe(5); // 7 - 2
      expect(status.insercoesUsadas).toBe(10);
      expect(status.insercoesLimite).toBe(50);
    });

    it('marca expirado quando passou dos 7 dias', async () => {
      prisma.assinatura.findUnique.mockResolvedValue(
        assinaturaTrial({ trialIniciadoEm: new Date(Date.now() - 8 * DIA_MS) }),
      );

      const status = await service.obterStatus('empresa-1');

      expect(status.expirado).toBe(true);
      expect(status.diasRestantes).toBe(0);
    });

    it('marca expirado quando atingiu o limite de inserções', async () => {
      prisma.assinatura.findUnique.mockResolvedValue(assinaturaTrial({ trialInsercoesUsadas: 50 }));

      const status = await service.obterStatus('empresa-1');

      expect(status.expirado).toBe(true);
    });

    it('não expõe dados de trial para assinatura já ativa', async () => {
      prisma.assinatura.findUnique.mockResolvedValue(
        assinaturaTrial({ status: StatusAssinatura.ATIVA }),
      );

      const status = await service.obterStatus('empresa-1');

      expect(status.emTrial).toBe(false);
      expect(status.expirado).toBe(false);
      expect(status.diasRestantes).toBeNull();
      expect(status.insercoesUsadas).toBeNull();
    });
  });

  describe('consumirInsercao', () => {
    it('não faz nada fora do trial (assinatura ativa)', async () => {
      prisma.assinatura.findUnique.mockResolvedValue(assinaturaTrial({ status: StatusAssinatura.ATIVA }));

      await service.consumirInsercao('empresa-1');

      expect(prisma.assinatura.updateMany).not.toHaveBeenCalled();
    });

    it('bloqueia quando o trial expirou por tempo', async () => {
      prisma.assinatura.findUnique.mockResolvedValue(
        assinaturaTrial({ trialIniciadoEm: new Date(Date.now() - 8 * DIA_MS) }),
      );

      await expect(service.consumirInsercao('empresa-1')).rejects.toThrow(ForbiddenException);
      expect(prisma.assinatura.updateMany).not.toHaveBeenCalled();
    });

    it('bloqueia quando o limite de inserções já foi atingido', async () => {
      prisma.assinatura.findUnique.mockResolvedValue(assinaturaTrial({ trialInsercoesUsadas: 50 }));

      await expect(service.consumirInsercao('empresa-1')).rejects.toThrow(ForbiddenException);
      expect(prisma.assinatura.updateMany).not.toHaveBeenCalled();
    });

    it('incrementa o contador quando dentro do limite', async () => {
      prisma.assinatura.findUnique.mockResolvedValue(assinaturaTrial());
      prisma.assinatura.updateMany.mockResolvedValue({ count: 1 });

      await service.consumirInsercao('empresa-1');

      expect(prisma.assinatura.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { trialInsercoesUsadas: { increment: 1 } },
        }),
      );
    });

    it('barra corrida concorrente quando o updateMany não afeta linha nenhuma', async () => {
      prisma.assinatura.findUnique.mockResolvedValue(assinaturaTrial());
      prisma.assinatura.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.consumirInsercao('empresa-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
