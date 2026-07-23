import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { FormaPagamento, StatusVenda } from '../../generated/prisma/enums';

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

export class PagamentoDto {
  @IsEnum(FormaPagamento)
  forma: FormaPagamento;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor: number;
}

export class FinalizarVendaDto {
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PagamentoDto)
  pagamentos: PagamentoDto[];
}

export class CancelarVendaDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  motivo?: string;
}

export class ListarVendasQueryDto {
  @IsOptional()
  @IsEnum(StatusVenda)
  status?: StatusVenda;

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
