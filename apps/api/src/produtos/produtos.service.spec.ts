import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProdutosService } from './produtos.service';

describe('ProdutosService', () => {
  let prisma: {
    produto: { count: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    produtoVariacao: { count: jest.Mock; create: jest.Mock; update: jest.Mock; findFirst: jest.Mock };
    categoria: { findFirst: jest.Mock };
  };
  let service: ProdutosService;

  beforeEach(() => {
    prisma = {
      produto: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
      produtoVariacao: { count: jest.fn(), create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
      categoria: { findFirst: jest.fn() },
    };
    service = new ProdutosService(prisma as any);
  });

  const variacaoPrisma = (over = {}) => ({
    id: 'v1',
    produtoId: 'p1',
    nome: 'Padrão',
    sku: null,
    codigoBarras: '789',
    precoVenda: 6.5,
    precoCusto: 3,
    estoqueAtual: 2,
    estoqueMinimo: 5,
    ativo: true,
    ...over,
  });

  const produtoPrisma = (over = {}) => ({
    id: 'p1',
    nome: 'Refrigerante',
    descricao: null,
    categoriaId: null,
    categoria: null,
    tipoVenda: 'UNIDADE',
    ativo: true,
    criadoEm: new Date(),
    variacoes: [variacaoPrisma()],
    ...over,
  });

  describe('listar', () => {
    it('aplica filtro de loja, ativos e paginação com valores padrão', async () => {
      prisma.produto.count.mockResolvedValue(1);
      prisma.produto.findMany.mockResolvedValue([produtoPrisma()]);

      const resultado = await service.listar('loja-1', {});

      expect(prisma.produto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ lojaId: 'loja-1', ativo: true }),
          skip: 0,
          take: 20,
        }),
      );
      expect(resultado.total).toBe(1);
      expect(resultado.items[0].variacoes[0].emRuptura).toBe(true); // 2 <= 5
    });

    it('inclui inativos quando apenasAtivos=false', async () => {
      prisma.produto.count.mockResolvedValue(0);
      prisma.produto.findMany.mockResolvedValue([]);

      await service.listar('loja-1', { apenasAtivos: false });

      const args = prisma.produto.findMany.mock.calls[0][0];
      expect(args.where.ativo).toBeUndefined();
    });
  });

  describe('criar', () => {
    it('valida que a categoria pertence à loja', async () => {
      prisma.categoria.findFirst.mockResolvedValue(null);

      await expect(
        service.criar('loja-1', { nome: 'X', categoriaId: 'c-outra', variacoes: [{ precoVenda: 1 }] }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.produto.create).not.toHaveBeenCalled();
    });

    it('cria produto com variação padrão e nome default', async () => {
      prisma.produto.create.mockResolvedValue(produtoPrisma());

      await service.criar('loja-1', { nome: 'Refrigerante', variacoes: [{ precoVenda: 6.5 }] });

      const data = prisma.produto.create.mock.calls[0][0].data;
      expect(data.lojaId).toBe('loja-1');
      expect(data.variacoes.create[0]).toMatchObject({ lojaId: 'loja-1', nome: 'Padrão', precoVenda: 6.5, estoqueMinimo: 0 });
    });

    it('traduz código de barras duplicado em Conflict', async () => {
      prisma.produto.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.criar('loja-1', { nome: 'X', variacoes: [{ precoVenda: 1, codigoBarras: '789' }] }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remover', () => {
    it('faz soft delete (ativo=false), não apaga do banco', async () => {
      prisma.produto.findFirst.mockResolvedValue({ id: 'p1' });

      await service.remover('loja-1', 'p1');

      expect(prisma.produto.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { ativo: false } });
    });

    it('rejeita produto de outra loja', async () => {
      prisma.produto.findFirst.mockResolvedValue(null);

      await expect(service.remover('loja-1', 'p1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removerVariacao', () => {
    it('não deixa remover a última variação ativa', async () => {
      prisma.produtoVariacao.findFirst.mockResolvedValue({ id: 'v1' });
      prisma.produtoVariacao.count.mockResolvedValue(1);

      await expect(service.removerVariacao('loja-1', 'p1', 'v1')).rejects.toThrow(BadRequestException);
      expect(prisma.produtoVariacao.update).not.toHaveBeenCalled();
    });

    it('desativa a variação quando há outras ativas', async () => {
      prisma.produtoVariacao.findFirst.mockResolvedValue({ id: 'v1' });
      prisma.produtoVariacao.count.mockResolvedValue(2);

      await service.removerVariacao('loja-1', 'p1', 'v1');

      expect(prisma.produtoVariacao.update).toHaveBeenCalledWith({ where: { id: 'v1' }, data: { ativo: false } });
    });
  });
});
