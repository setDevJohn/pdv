import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AssinaturaController } from './assinatura.controller';
import { AssinaturaService } from './assinatura.service';
import { TrialGuard } from './trial.guard';

@Module({
  controllers: [AssinaturaController],
  providers: [AssinaturaService, { provide: APP_GUARD, useClass: TrialGuard }],
})
export class AssinaturaModule {}
