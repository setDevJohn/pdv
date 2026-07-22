import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { EmpresasService } from './empresas.service';
import { ResolverEmpresaDto } from './dto/resolver-empresa.dto';

@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresasService: EmpresasService) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('resolver')
  resolver(@Query() query: ResolverEmpresaDto) {
    return this.empresasService.resolverPorSlug(query.slug);
  }
}
