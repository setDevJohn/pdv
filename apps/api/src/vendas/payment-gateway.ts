import { Injectable } from '@nestjs/common';
import { FormaPagamento } from '../generated/prisma/enums';

export interface ConfirmarPagamentoInput {
  forma: FormaPagamento;
  valor: number;
}

export interface ConfirmarPagamentoResultado {
  // Identificador da transação no adquirente (Stone/Cielo/GetNet/PagSeguro).
  // Nulo enquanto não há integração real — ver ManualPaymentGateway.
  transacaoGatewayId: string | null;
}

// Abstração para a integração futura com maquininha (ver docs/07-escopo-fechado.md).
// Hoje só existe confirmação manual: o operador já recebeu o pagamento fora do
// sistema e está apenas registrando. Uma implementação real (StonePaymentGateway
// etc.) troca esta injeção sem tocar em VendasService.
export interface PaymentGateway {
  confirmar(input: ConfirmarPagamentoInput): Promise<ConfirmarPagamentoResultado>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

@Injectable()
export class ManualPaymentGateway implements PaymentGateway {
  async confirmar(_input: ConfirmarPagamentoInput): Promise<ConfirmarPagamentoResultado> {
    return { transacaoGatewayId: null };
  }
}
