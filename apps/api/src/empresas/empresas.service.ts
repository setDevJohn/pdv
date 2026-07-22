import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EmpresaResolvida {
  existe: boolean;
  nome?: string;
  slug?: string;
}

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  // Endpoint público: só confirma existência + nome de exibição, nunca
  // documento/plano/dados internos (evita vazar informação de outra empresa).
  async resolverPorSlug(slug: string): Promise<EmpresaResolvida> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { slug },
      select: { nome: true, slug: true },
    });

    if (!empresa) {
      return { existe: false };
    }

    return { existe: true, nome: empresa.nome, slug: empresa.slug };
  }
}
