import { SetMetadata } from '@nestjs/common';

// Marca uma rota que cria um registro contável no trial (ex.: cadastrar
// produto, registrar venda). O TrialGuard consome uma inserção da assinatura
// em TRIAL e bloqueia quando o teto/prazo estoura. Fora do trial, não afeta nada.
export const CONTAR_INSERCAO_TRIAL_KEY = 'contarInsercaoTrial';
export const ContarInsercaoTrial = () => SetMetadata(CONTAR_INSERCAO_TRIAL_KEY, true);
