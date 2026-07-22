import { describe, expect, it } from 'vitest'
import { montarConteudoTrial } from './trial-banner-content'
import type { StatusTrial } from '@/services/assinatura-service'

function status(overrides: Partial<StatusTrial> = {}): StatusTrial {
  return {
    status: 'TRIAL',
    plano: 'MENSAL',
    emTrial: true,
    expirado: false,
    diasRestantes: 5,
    insercoesUsadas: 10,
    insercoesLimite: 50,
    ...overrides,
  }
}

describe('montarConteudoTrial', () => {
  it('retorna null quando não está em trial (assinatura ativa)', () => {
    expect(montarConteudoTrial(status({ emTrial: false }))).toBeNull()
  });

  it('nível info quando há folga de tempo e cota', () => {
    const conteudo = montarConteudoTrial(status({ diasRestantes: 5, insercoesUsadas: 10 }))
    expect(conteudo?.nivel).toBe('info')
    expect(conteudo?.titulo).toContain('5 dias restantes')
    expect(conteudo?.descricao).toContain('10/50 inserções usadas')
  });

  it('nível alerta quando faltam 2 dias ou menos', () => {
    expect(montarConteudoTrial(status({ diasRestantes: 2 }))?.nivel).toBe('alerta')
  });

  it('nível alerta quando 80%+ da cota de inserções foi usada', () => {
    expect(montarConteudoTrial(status({ diasRestantes: 5, insercoesUsadas: 45 }))?.nivel).toBe('alerta')
  });

  it('nível expirado quando o trial acabou', () => {
    const conteudo = montarConteudoTrial(status({ expirado: true, diasRestantes: 0 }))
    expect(conteudo?.nivel).toBe('expirado')
    expect(conteudo?.titulo).toContain('terminou')
  });

  it('usa singular para 1 dia restante', () => {
    expect(montarConteudoTrial(status({ diasRestantes: 1 }))?.titulo).toContain('1 dia restante')
  });

  it('não mostra detalhe de inserções quando não há limite definido', () => {
    const conteudo = montarConteudoTrial(status({ insercoesLimite: null, insercoesUsadas: null }))
    expect(conteudo?.descricao).not.toContain('inserções')
  });
});
