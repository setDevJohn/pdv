import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AbrirCaixaDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorInicial: number;
}

export class SangriaDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  motivo?: string;
}

export class FecharCaixaDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorFechamento: number;
}

export class HistoricoCaixaQueryDto {
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
