import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { HashService } from '../common/hash/hash.service';
import { LoginDto } from './dto/login.dto';
import {
  AccessTokenPayload,
  GerenteTokenPayload,
  RefreshTokenPayload,
} from './interfaces/jwt-payload.interface';
import { ACCESS_TOKEN_TTL, GERENTE_TOKEN_TTL, REFRESH_TOKEN_TTL } from './auth.constants';
import { PerfilAcesso } from '../generated/prisma/enums';

export interface LojaAcesso {
  lojaId: string;
  nome: string;
  perfil: PerfilAcesso;
}

export interface SessaoTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult extends SessaoTokens {
  usuario: { id: string; nome: string; email: string };
  lojas: LojaAcesso[];
  lojaAtivaId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const credenciaisInvalidas = () => new UnauthorizedException('Credenciais inválidas');

    const empresa = await this.prisma.empresa.findUnique({ where: { slug: dto.slug } });
    if (!empresa) {
      throw credenciaisInvalidas();
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { empresaId_email: { empresaId: empresa.id, email: dto.email } },
      include: { lojas: { include: { loja: true } } },
    });
    if (!usuario || !usuario.ativo) {
      throw credenciaisInvalidas();
    }

    const senhaValida = await this.hashService.compare(dto.senha, usuario.senhaHash);
    if (!senhaValida) {
      throw credenciaisInvalidas();
    }

    const lojas = this.mapLojas(usuario.lojas);

    // Só uma loja acessível: já entra "logado nela". Mais de uma: front pede
    // pra escolher (POST /auth/trocar-loja) antes de liberar rotas de negócio.
    const lojaUnica = lojas.length === 1 ? lojas[0] : undefined;

    const tokens = this.emitirTokens({
      usuarioId: usuario.id,
      empresaId: empresa.id,
      lojaAtivaId: lojaUnica?.lojaId,
      perfil: lojaUnica?.perfil,
    });

    return {
      ...tokens,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      lojas,
      lojaAtivaId: lojaUnica?.lojaId,
    };
  }

  // Devolve o mesmo formato do login (não só os tokens): o bootstrap de sessão
  // no front (restaurar estado depois de um F5, já que o access token só vive
  // em memória) precisa de usuario/lojas de volta, não só de um novo token.
  async refresh(refreshToken: string): Promise<LoginResult> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Sessão expirada, faça login novamente');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { lojas: { include: { loja: true } } },
    });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('Sessão expirada, faça login novamente');
    }

    const lojas = this.mapLojas(usuario.lojas);

    // Revalida o vínculo com a loja ativa a cada refresh — se o acesso foi
    // revogado nesse meio tempo, a próxima renovação já não carrega mais a loja.
    const lojaAtiva = payload.lojaAtivaId ? lojas.find((loja) => loja.lojaId === payload.lojaAtivaId) : undefined;

    const tokens = this.emitirTokens({
      usuarioId: usuario.id,
      empresaId: usuario.empresaId,
      lojaAtivaId: lojaAtiva?.lojaId,
      perfil: lojaAtiva?.perfil,
    });

    return {
      ...tokens,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      lojas,
      lojaAtivaId: lojaAtiva?.lojaId,
    };
  }

  async trocarLoja(usuarioId: string, empresaId: string, lojaId: string): Promise<SessaoTokens> {
    const vinculo = await this.prisma.usuarioLoja.findUnique({
      where: { usuarioId_lojaId: { usuarioId, lojaId } },
    });
    if (!vinculo) {
      throw new ForbiddenException('Usuário não tem acesso a esta loja');
    }

    return this.emitirTokens({ usuarioId, empresaId, lojaAtivaId: vinculo.lojaId, perfil: vinculo.perfil });
  }

  async validarCodigoGerente(
    lojaId: string,
    codigo: string,
    acao: string,
    solicitanteId: string,
  ): Promise<{ gerenteToken: string }> {
    const loja = await this.prisma.loja.findUnique({ where: { id: lojaId } });
    if (!loja?.codigoGerenteHash) {
      throw new ForbiddenException('Código de gerente não configurado para esta loja');
    }

    const codigoValido = await this.hashService.compare(codigo, loja.codigoGerenteHash);
    if (!codigoValido) {
      throw new ForbiddenException('Código de gerente inválido');
    }

    const payload: GerenteTokenPayload = {
      tipo: 'gerente',
      lojaId,
      acao,
      aprovadoPorUsuarioId: solicitanteId,
    };
    const gerenteToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_GERENTE_SECRET,
      expiresIn: GERENTE_TOKEN_TTL,
    });

    await this.prisma.logAuditoria.create({
      data: {
        lojaId,
        usuarioId: solicitanteId,
        acao: 'CODIGO_GERENTE_VALIDADO',
        entidade: 'Loja',
        entidadeId: lojaId,
        valorNovo: { acaoAutorizada: acao },
      },
    });

    return { gerenteToken };
  }

  private mapLojas(vinculos: { lojaId: string; perfil: PerfilAcesso; loja: { nome: string } }[]): LojaAcesso[] {
    return vinculos.map((vinculo) => ({
      lojaId: vinculo.lojaId,
      nome: vinculo.loja.nome,
      perfil: vinculo.perfil,
    }));
  }

  private emitirTokens(params: {
    usuarioId: string;
    empresaId: string;
    lojaAtivaId?: string;
    perfil?: PerfilAcesso;
  }): SessaoTokens {
    const accessPayload: AccessTokenPayload = {
      sub: params.usuarioId,
      empresaId: params.empresaId,
      lojaAtivaId: params.lojaAtivaId,
      perfil: params.perfil,
    };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const refreshPayload: RefreshTokenPayload = {
      sub: params.usuarioId,
      tipo: 'refresh',
      lojaAtivaId: params.lojaAtivaId,
    };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: REFRESH_TOKEN_TTL,
    });

    return { accessToken, refreshToken };
  }
}
