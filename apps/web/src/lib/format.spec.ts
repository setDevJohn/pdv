import { describe, expect, it } from 'vitest'
import { formatarBRL, formatarQuantidade } from './format'

describe('formatarBRL', () => {
  it('formata valores em real com duas casas decimais', () => {
    expect(formatarBRL(6.5)).toBe('R$ 6,50')
  });

  it('formata zero corretamente', () => {
    expect(formatarBRL(0)).toBe('R$ 0,00')
  });

  it('formata valores negativos (ex.: desconto)', () => {
    expect(formatarBRL(-10)).toBe('-R$ 10,00')
  });
});

describe('formatarQuantidade', () => {
  it('formata quantidade por unidade sem casas decimais', () => {
    expect(formatarQuantidade(3)).toBe('3')
  });

  it('formata quantidade por peso com 3 casas decimais', () => {
    expect(formatarQuantidade(1.5, 'PESO')).toBe('1,500')
  });

  it('formata quantidade por volume com 3 casas decimais', () => {
    expect(formatarQuantidade(0.75, 'VOLUME')).toBe('0,750')
  });
});
