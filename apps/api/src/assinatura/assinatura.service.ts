import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatusAssinatura, PlanoTipo } from '../generated/prisma/enums';

const TRIAL_DURACAO_DIAS = 7;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface StatusTrial {
  status: StatusAssinatura;
  plano: PlanoTipo;
  emTrial: boolean;
  expirado: boolean;
  diasRestantes: number | null;
  insercoesUsadas: number | null;
  insercoesLimite: number | null;
}

@Injectable()
export class AssinaturaService {
  constructor(private readonly prisma: PrismaService) {}

  async obterStatus(empresaId: string): Promise<StatusTrial> {
    const assinatura = await this.prisma.assinatura.findUnique({ where: { empresaId } });
    if (!assinatura) {
      throw new NotFoundException('Assinatura não encontrada para esta empresa');
    }

    const emTrial = assinatura.status === StatusAssinatura.TRIAL;
    if (!emTrial) {
      return {
        status: assinatura.status,
        plano: assinatura.plano,
        emTrial: false,
        expirado: false,
        diasRestantes: null,
        insercoesUsadas: null,
        insercoesLimite: null,
      };
    }

    const diasRestantes = this.calcularDiasRestantes(assinatura.trialIniciadoEm);
    const limiteInsercoes = assinatura.trialLimiteInsercoes;
    const expiradoPorTempo = diasRestantes <= 0;
    const expiradoPorInsercoes = limiteInsercoes !== null && assinatura.trialInsercoesUsadas >= limiteInsercoes;

    return {
      status: assinatura.status,
      plano: assinatura.plano,
      emTrial: true,
      expirado: expiradoPorTempo || expiradoPorInsercoes,
      diasRestantes,
      insercoesUsadas: assinatura.trialInsercoesUsadas,
      insercoesLimite: limiteInsercoes,
    };
  }

  // Consome uma inserção do trial de forma atômica. Fora do trial não faz nada.
  // Chamado pelo TrialGuard em rotas decoradas com @ContarInsercaoTrial.
  async consumirInsercao(empresaId: string): Promise<void> {
    const assinatura = await this.prisma.assinatura.findUnique({ where: { empresaId } });
    if (!assinatura || assinatura.status !== StatusAssinatura.TRIAL) {
      return;
    }

    if (this.calcularDiasRestantes(assinatura.trialIniciadoEm) <= 0) {
      throw new ForbiddenException('Seu período de teste expirou. Assine um plano para continuar.');
    }

    const limite = assinatura.trialLimiteInsercoes;
    if (limite !== null && assinatura.trialInsercoesUsadas >= limite) {
      throw new ForbiddenException('Limite de inserções do período de teste atingido. Assine um plano para continuar.');
    }

    // Incremento condicional numa única query: se outra requisição concorrente
    // já atingiu o limite entre o SELECT acima e agora, o updateMany não
    // encontra a linha (count 0) e barramos — evita ultrapassar a cota.
    const resultado = await this.prisma.assinatura.updateMany({
      where: {
        empresaId,
        status: StatusAssinatura.TRIAL,
        ...(limite !== null ? { trialInsercoesUsadas: { lt: limite } } : {}),
      },
      data: { trialInsercoesUsadas: { increment: 1 } },
    });

    if (resultado.count === 0) {
      throw new ForbiddenException('Limite de inserções do período de teste atingido. Assine um plano para continuar.');
    }
  }

  private calcularDiasRestantes(trialIniciadoEm: Date | null): number {
    if (!trialIniciadoEm) {
      return 0;
    }
    const fim = trialIniciadoEm.getTime() + TRIAL_DURACAO_DIAS * MS_POR_DIA;
    const restanteMs = fim - Date.now();
    if (restanteMs <= 0) {
      return 0;
    }
    return Math.ceil(restanteMs / MS_POR_DIA);
  }
}
