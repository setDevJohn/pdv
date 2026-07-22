import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GerenteGuard } from './guards/gerente.guard';

@Module({
  // Sem secret/expiresIn global de propósito: access, refresh e gerente-token
  // usam segredos e TTLs distintos, passados explicitamente em cada sign/verify
  // (ver AuthService e os guards) para não misturar os três tipos de token.
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: GerenteGuard },
  ],
  exports: [JwtModule],
})
export class AuthModule {}
