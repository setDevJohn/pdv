import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TipoVenda } from '../../generated/prisma/enums';
import { CriarVariacaoDto } from './variacao.dto';

export class CriarProdutoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nome: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  @IsOptional()
  @IsString()
  categoriaId?: string;

  // MVP vende só por UNIDADE, mas o campo já aceita PESO/VOLUME (modelagem futura).
  @IsOptional()
  @IsEnum(TipoVenda)
  tipoVenda?: TipoVenda;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CriarVariacaoDto)
  variacoes: CriarVariacaoDto[];
}

export class AtualizarProdutoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  // Aceita null explícito para "remover categoria".
  @IsOptional()
  @IsString()
  categoriaId?: string | null;

  @IsOptional()
  @IsEnum(TipoVenda)
  tipoVenda?: TipoVenda;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class ListarProdutosQueryDto {
  @IsOptional()
  @IsString()
  busca?: string;

  @IsOptional()
  @IsString()
  categoriaId?: string;

  // Query string precisa de transform explícito: Boolean('false') seria true.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  apenasAtivos?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  porPagina?: number;
}
