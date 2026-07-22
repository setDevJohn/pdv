import { IsString } from 'class-validator';

export class TrocarLojaDto {
  @IsString()
  lojaId: string;
}
