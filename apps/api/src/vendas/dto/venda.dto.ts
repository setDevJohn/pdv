import {
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdicionarItemDto {
  @IsUUID()
  produtoVariacaoId: string;

  // Decimal com 3 casas para suportar peso/volume no futuro; no MVP o frontend
  // só envia inteiros (venda por unidade).
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantidade: number;
}

export class AtualizarItemDto {
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantidade: number;
}

export class BuscarItemQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  termo: string;
}
