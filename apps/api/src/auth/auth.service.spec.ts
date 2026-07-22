import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { HashService } from '../common/hash/hash.service';
import { PerfilAcesso } from '../generated/prisma/enums';

describe('AuthService', () => {
  const OLD_ENV = process.env;

  let prisma: {
    empresa: { findUnique: jest.Mock };
    usuario: { findUnique: jest.Mock };
    usuarioLoja: { findUnique: jest.Mock };
    loja: { findUnique: jest.Mock };
    logAuditoria: { create: jest.Mock };
  };
  let hashService: { compare: jest.Mock; hash: jest.Mock };
  let jwtService: JwtService;
  let service: AuthService;

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      JWT_ACCESS_SECRET: 'access-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_GERENTE_SECRET: 'gerente-secret',
    };

    prisma = {
      empresa: { findUnique: jest.fn() },
      usuario: { findUnique: jest.fn() },
      usuarioLoja: { findUnique: jest.fn() },
      loja: { findUnique: jest.fn() },
      logAuditoria: { create: jest.fn() },
    };
    hashService = { compare: jest.fn(), hash: jest.fn() };
    jwtService = new JwtService({});

    service = new AuthService(prisma as any, hashService as HashService, jwtService);
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  describe('login', () => {
    const dto = { slug: 'mercadinho', email: 'admin@exemplo.com', senha: 'senha123' };

    it('rejeita quando a empresa não existe', async () => {
      prisma.empresa.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
    });

    it('rejeita quando o usuário não existe ou está inativo', async () => {
      prisma.empresa.findUnique.mockResolvedValue({ id: 'empresa-1' });
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita quando a senha está incorreta', async () => {
      prisma.empresa.findUnique.mockResolvedValue({ id: 'empresa-1' });
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'usuario-1',
        ativo: true,
        senhaHash: 'hash',
        nome: 'Admin',
        email: dto.email,
        lojas: [],
      });
      hashService.compare.mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('loga com sucesso e já seleciona a loja quando o usuário só tem uma', async () => {
      prisma.empresa.findUnique.mockResolvedValue({ id: 'empresa-1' });
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'usuario-1',
        ativo: true,
        senhaHash: 'hash',
        nome: 'Admin',
        email: dto.email,
        lojas: [
          { lojaId: 'loja-1', perfil: PerfilAcesso.ADMIN, loja: { nome: 'Loja 1' } },
        ],
      });
      hashService.compare.mockResolvedValue(true);

      const resultado = await service.login(dto);

      expect(resultado.lojaAtivaId).toBe('loja-1');
      expect(resultado.lojas).toEqual([{ lojaId: 'loja-1', nome: 'Loja 1', perfil: PerfilAcesso.ADMIN }]);
      expect(resultado.accessToken).toEqual(expect.any(String));
      expect(resultado.refreshToken).toEqual(expect.any(String));

      const payload = jwtService.decode(resultado.accessToken);
      expect(payload).toMatchObject({ sub: 'usuario-1', empresaId: 'empresa-1', lojaAtivaId: 'loja-1', perfil: 'ADMIN' });
    });

    it('não seleciona loja automaticamente quando o usuário tem acesso a mais de uma', async () => {
      prisma.empresa.findUnique.mockResolvedValue({ id: 'empresa-1' });
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'usuario-1',
        ativo: true,
        senhaHash: 'hash',
        nome: 'Admin',
        email: dto.email,
        lojas: [
          { lojaId: 'loja-1', perfil: PerfilAcesso.ADMIN, loja: { nome: 'Loja 1' } },
          { lojaId: 'loja-2', perfil: PerfilAcesso.VENDEDOR, loja: { nome: 'Loja 2' } },
        ],
      });
      hashService.compare.mockResolvedValue(true);

      const resultado = await service.login(dto);

      expect(resultado.lojaAtivaId).toBeUndefined();
      expect(resultado.lojas).toHaveLength(2);
    });
  });

  describe('trocarLoja', () => {
    it('rejeita quando o usuário não tem vínculo com a loja', async () => {
      prisma.usuarioLoja.findUnique.mockResolvedValue(null);

      await expect(service.trocarLoja('usuario-1', 'empresa-1', 'loja-2')).rejects.toThrow(ForbiddenException);
    });

    it('emite novos tokens com a loja e o perfil do vínculo', async () => {
      prisma.usuarioLoja.findUnique.mockResolvedValue({ lojaId: 'loja-2', perfil: PerfilAcesso.VENDEDOR });

      const tokens = await service.trocarLoja('usuario-1', 'empresa-1', 'loja-2');

      const payload = jwtService.decode(tokens.accessToken);
      expect(payload).toMatchObject({ lojaAtivaId: 'loja-2', perfil: 'VENDEDOR' });
    });
  });

  describe('validarCodigoGerente', () => {
    it('rejeita quando a loja não tem código de gerente configurado', async () => {
      prisma.loja.findUnique.mockResolvedValue({ codigoGerenteHash: null });

      await expect(
        service.validarCodigoGerente('loja-1', '1234', 'CANCELAR_VENDA', 'usuario-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejeita quando o código está incorreto', async () => {
      prisma.loja.findUnique.mockResolvedValue({ codigoGerenteHash: 'hash' });
      hashService.compare.mockResolvedValue(false);

      await expect(
        service.validarCodigoGerente('loja-1', '9999', 'CANCELAR_VENDA', 'usuario-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('emite um gerente-token e registra auditoria quando o código está correto', async () => {
      prisma.loja.findUnique.mockResolvedValue({ codigoGerenteHash: 'hash' });
      hashService.compare.mockResolvedValue(true);

      const resultado = await service.validarCodigoGerente('loja-1', '1234', 'CANCELAR_VENDA', 'usuario-1');

      const payload = jwtService.decode(resultado.gerenteToken);
      expect(payload).toMatchObject({
        tipo: 'gerente',
        lojaId: 'loja-1',
        acao: 'CANCELAR_VENDA',
        aprovadoPorUsuarioId: 'usuario-1',
      });
      expect(prisma.logAuditoria.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ acao: 'CODIGO_GERENTE_VALIDADO', lojaId: 'loja-1', usuarioId: 'usuario-1' }),
        }),
      );
    });
  });

  describe('refresh', () => {
    it('rejeita um refresh token inválido', async () => {
      await expect(service.refresh('token-invalido')).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita quando o usuário não existe mais ou está inativo', async () => {
      const refreshToken = jwtService.sign(
        { sub: 'usuario-1', tipo: 'refresh' },
        { secret: 'refresh-secret' },
      );
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('derruba a loja ativa do novo access token se o vínculo foi revogado', async () => {
      const refreshToken = jwtService.sign(
        { sub: 'usuario-1', tipo: 'refresh', lojaAtivaId: 'loja-1' },
        { secret: 'refresh-secret' },
      );
      prisma.usuario.findUnique.mockResolvedValue({ id: 'usuario-1', empresaId: 'empresa-1', ativo: true });
      prisma.usuarioLoja.findUnique.mockResolvedValue(null);

      const tokens = await service.refresh(refreshToken);

      const payload = jwtService.decode<{ lojaAtivaId?: string }>(tokens.accessToken);
      expect(payload?.lojaAtivaId).toBeUndefined();
    });
  });
});
