import { PerfilAcesso } from '../../generated/prisma/enums';

// Loja/perfil ficam no token para autorizar requests sem round-trip ao banco.
// `lojaAtivaId`/`perfil` só existem depois que o usuário seleciona a loja
// (ver POST /auth/trocar-loja) — um usuário com acesso a só uma loja já
// recebe isso preenchido no login.
export interface AccessTokenPayload {
  sub: string; // usuarioId
  empresaId: string;
  lojaAtivaId?: string;
  perfil?: PerfilAcesso;
}

export interface RefreshTokenPayload {
  sub: string; // usuarioId
  tipo: 'refresh';
  lojaAtivaId?: string;
}

// Emitido por POST /auth/validar-codigo-gerente, autoriza uma ação restrita
// específica por um tempo curto. Nunca contém o código em si.
export interface GerenteTokenPayload {
  tipo: 'gerente';
  lojaId: string;
  acao: string;
  aprovadoPorUsuarioId: string;
}

export interface RequestUser {
  usuarioId: string;
  empresaId: string;
  lojaAtivaId?: string;
  perfil?: PerfilAcesso;
}
