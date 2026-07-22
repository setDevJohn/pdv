import { IsString, MaxLength, MinLength } from 'class-validator';

export class CriarCategoriaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nome: string;
}

export class AtualizarCategoriaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nome: string;
}
