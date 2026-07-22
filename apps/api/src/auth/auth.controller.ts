import { Body, Controller, ForbiddenException, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService, SessaoTokens } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { TrocarLojaDto } from './dto/trocar-loja.dto';
import { ValidarCodigoGerenteDto } from './dto/validar-codigo-gerente.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './interfaces/jwt-payload.interface';
import { REFRESH_COOKIE_NAME, REFRESH_TOKEN_TTL_MS } from './auth.constants';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const resultado = await this.authService.login(dto);
    this.setRefreshCookie(res, resultado.refreshToken);
    return {
      accessToken: resultado.accessToken,
      usuario: resultado.usuario,
      lojas: resultado.lojas,
      lojaAtivaId: resultado.lojaAtivaId,
    };
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException('Sessão expirada, faça login novamente');
    }
    const resultado = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, resultado.refreshToken);
    return {
      accessToken: resultado.accessToken,
      usuario: resultado.usuario,
      lojas: resultado.lojas,
      lojaAtivaId: resultado.lojaAtivaId,
    };
  }

  @Public()
  @HttpCode(200)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth' });
    return { ok: true };
  }

  @HttpCode(200)
  @Post('trocar-loja')
  async trocarLoja(
    @CurrentUser() user: RequestUser,
    @Body() dto: TrocarLojaDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens: SessaoTokens = await this.authService.trocarLoja(user.usuarioId, user.empresaId, dto.lojaId);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  // Código de gerente é curto (ex.: 4 dígitos) — limite mais agressivo que o
  // global para dificultar brute-force.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('validar-codigo-gerente')
  validarCodigoGerente(@CurrentUser() user: RequestUser, @Body() dto: ValidarCodigoGerenteDto) {
    if (!user.lojaAtivaId) {
      throw new ForbiddenException('Selecione uma loja antes de validar o código de gerente');
    }
    return this.authService.validarCodigoGerente(user.lojaAtivaId, dto.codigo, dto.acao, user.usuarioId);
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth',
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
  }
}
