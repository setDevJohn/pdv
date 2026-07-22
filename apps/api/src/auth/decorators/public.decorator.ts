import { SetMetadata } from '@nestjs/common';

// Marca uma rota como acessível sem JWT. O guard global (ver JwtAuthGuard) nega
// por padrão — isso é a única forma de abrir uma exceção explícita.
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
