import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// Entrada e saída: quantidade positiva a somar/subtrair do estoque.
export class MovimentacaoDto {
  @IsString()
  produtoVariacaoId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantidade: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  observacao?: string;
}

// Ajuste: informa a quantidade contada (novo valor absoluto do estoque).
export class AjusteDto {
  @IsString()
  produtoVariacaoId: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantidadeContada: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  observacao?: string;
}

export class ListarMovimentacoesQueryDto {
  @IsOptional()
  @IsString()
  produtoVariacaoId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  porPagina?: number;
}
