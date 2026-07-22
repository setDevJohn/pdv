import { describe, expect, it } from 'vitest'
import { detectarSlugPorSubdominio } from './subdominio'

const BASE_DOMAIN = 'pdv.com.br'

describe('detectarSlugPorSubdominio', () => {
  it('extrai o slug de um subdomínio de tenant', () => {
    expect(detectarSlugPorSubdominio('mercadinho-exemplo.pdv.com.br', BASE_DOMAIN)).toBe('mercadinho-exemplo')
  });

  it('lida com TLD composto (.com.br) sem confundir com o domínio base', () => {
    expect(detectarSlugPorSubdominio('pdv.com.br', BASE_DOMAIN)).toBeNull()
  });

  it('retorna null quando o domínio base não é configurado', () => {
    expect(detectarSlugPorSubdominio('mercadinho-exemplo.pdv.com.br', undefined)).toBeNull()
  });

  it('retorna null para localhost em dev (base domain não é localhost)', () => {
    expect(detectarSlugPorSubdominio('localhost', BASE_DOMAIN)).toBeNull()
  });

  it('retorna null para um host de outro domínio', () => {
    expect(detectarSlugPorSubdominio('exemplo.com', BASE_DOMAIN)).toBeNull()
  });

  it('retorna null para hosts reservados (www, app, api)', () => {
    expect(detectarSlugPorSubdominio('www.pdv.com.br', BASE_DOMAIN)).toBeNull()
    expect(detectarSlugPorSubdominio('app.pdv.com.br', BASE_DOMAIN)).toBeNull()
    expect(detectarSlugPorSubdominio('api.pdv.com.br', BASE_DOMAIN)).toBeNull()
  });

  it('retorna null para subdomínio aninhado (mais de um nível)', () => {
    expect(detectarSlugPorSubdominio('algo.mercadinho-exemplo.pdv.com.br', BASE_DOMAIN)).toBeNull()
  });
});
