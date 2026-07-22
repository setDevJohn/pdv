import { IsString, MinLength } from 'class-validator';

export class ValidarCodigoGerenteDto {
  @IsString()
  @MinLength(1)
  codigo: string;

  // Identificador livre da ação sendo autorizada, ex.: "CANCELAR_VENDA",
  // "AJUSTE_ESTOQUE" — precisa bater com o valor em @RequerGerente() da rota
  // que vai consumir o gerente-token gerado aqui.
  @IsString()
  @MinLength(1)
  acao: string;
}
