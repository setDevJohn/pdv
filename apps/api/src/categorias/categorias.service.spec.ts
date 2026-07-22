import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriasService } from './categorias.service';

describe('CategoriasService', () => {
  let prisma: {
    categoria: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let service: CategoriasService;

  beforeEach(() => {
    prisma = {
      categoria: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new CategoriasService(prisma as any);
  });

  it('lista as categorias da loja em ordem alfabética', async () => {
    prisma.categoria.findMany.mockResolvedValue([{ id: 'c1', nome: 'Bebidas' }]);

    await service.listar('loja-1');

    expect(prisma.categoria.findMany).toHaveBeenCalledWith({
      where: { lojaId: 'loja-1' },
      orderBy: { nome: 'asc' },
    });
  });

  it('cria uma categoria na loja', async () => {
    prisma.categoria.create.mockResolvedValue({ id: 'c1', nome: 'Bebidas' });

    await service.criar('loja-1', { nome: 'Bebidas' });

    expect(prisma.categoria.create).toHaveBeenCalledWith({ data: { lojaId: 'loja-1', nome: 'Bebidas' } });
  });

  it('converte violação de unicidade em Conflict ao criar', async () => {
    prisma.categoria.create.mockRejectedValue({ code: 'P2002' });

    await expect(service.criar('loja-1', { nome: 'Bebidas' })).rejects.toThrow(ConflictException);
  });

  it('rejeita atualizar categoria de outra loja', async () => {
    prisma.categoria.findFirst.mockResolvedValue(null);

    await expect(service.atualizar('loja-1', 'c1', { nome: 'Doces' })).rejects.toThrow(NotFoundException);
    expect(prisma.categoria.update).not.toHaveBeenCalled();
  });

  it('rejeita remover categoria de outra loja', async () => {
    prisma.categoria.findFirst.mockResolvedValue(null);

    await expect(service.remover('loja-1', 'c1')).rejects.toThrow(NotFoundException);
    expect(prisma.categoria.delete).not.toHaveBeenCalled();
  });

  it('remove categoria existente na loja', async () => {
    prisma.categoria.findFirst.mockResolvedValue({ id: 'c1', lojaId: 'loja-1' });

    await service.remover('loja-1', 'c1');

    expect(prisma.categoria.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});
