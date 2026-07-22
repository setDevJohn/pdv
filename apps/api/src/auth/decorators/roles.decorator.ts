import { SetMetadata } from '@nestjs/common';
import { PerfilAcesso } from '../../generated/prisma/enums';

export const ROLES_KEY = 'roles';
export const Roles = (...perfis: PerfilAcesso[]) => SetMetadata(ROLES_KEY, perfis);
