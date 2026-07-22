import { SetMetadata } from '@nestjs/common';

// Marca uma rota como exigindo um gerente-token válido (emitido por
// POST /auth/validar-codigo-gerente) para a ação informada. Ver GerenteGuard.
export const REQUER_GERENTE_KEY = 'requerGerenteAcao';
export const RequerGerente = (acao: string) => SetMetadata(REQUER_GERENTE_KEY, acao);
