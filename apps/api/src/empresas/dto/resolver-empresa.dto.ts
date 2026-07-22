import { IsString, MinLength } from 'class-validator';

export class ResolverEmpresaDto {
  @IsString()
  @MinLength(1)
  slug: string;
}
