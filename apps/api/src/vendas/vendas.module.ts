import { Module } from '@nestjs/common';
import { EstoqueModule } from '../estoque/estoque.module';
import { VendasController } from './vendas.controller';
import { VendasService } from './vendas.service';
import { PAYMENT_GATEWAY, ManualPaymentGateway } from './payment-gateway';

@Module({
  imports: [EstoqueModule],
  controllers: [VendasController],
  providers: [VendasService, { provide: PAYMENT_GATEWAY, useClass: ManualPaymentGateway }],
})
export class VendasModule {}
