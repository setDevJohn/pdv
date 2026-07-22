import { EmpresasService } from './empresas.service';

describe('EmpresasService', () => {
  let prisma: { empresa: { findUnique: jest.Mock } };
  let service: EmpresasService;

  beforeEach(() => {
    prisma = { empresa: { findUnique: jest.fn() } };
    service = new EmpresasService(prisma as any);
  });

  it('retorna existe:false quando não há empresa com o slug', async () => {
    prisma.empresa.findUnique.mockResolvedValue(null);

    await expect(service.resolverPorSlug('nao-existe')).resolves.toEqual({ existe: false });
  });

  it('retorna nome e slug sem vazar outros dados quando a empresa existe', async () => {
    prisma.empresa.findUnique.mockResolvedValue({ nome: 'Mercadinho Exemplo', slug: 'mercadinho-exemplo' });

    await expect(service.resolverPorSlug('mercadinho-exemplo')).resolves.toEqual({
      existe: true,
      nome: 'Mercadinho Exemplo',
      slug: 'mercadinho-exemplo',
    });
  });
});
