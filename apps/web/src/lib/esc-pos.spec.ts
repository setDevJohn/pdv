import { describe, expect, it } from 'vitest'
import { alinhar, concatenarBytes, cortar, inicializar, negrito, pular, removerAcentos, texto } from './esc-pos'

describe('removerAcentos', () => {
  it('troca letras acentuadas pelo equivalente sem acento', () => {
    expect(removerAcentos('Refrigerante à moda São João')).toBe('Refrigerante a moda Sao Joao')
  })

  it('troca o espaço non-breaking (usado por formatarBRL) por espaço normal', () => {
    expect(removerAcentos('R$ 5,00')).toBe('R$ 5,00')
  })

  it('não mexe em texto já ASCII', () => {
    expect(removerAcentos('TOTAL: 12.50')).toBe('TOTAL: 12.50')
  })
})

describe('comandos ESC/POS', () => {
  it('inicializar emite ESC @', () => {
    expect(inicializar()).toEqual(new Uint8Array([0x1b, 0x40]))
  })

  it('alinhar mapeia esquerda/centro/direita pros códigos certos', () => {
    expect(alinhar('esquerda')).toEqual(new Uint8Array([0x1b, 0x61, 0]))
    expect(alinhar('centro')).toEqual(new Uint8Array([0x1b, 0x61, 1]))
    expect(alinhar('direita')).toEqual(new Uint8Array([0x1b, 0x61, 2]))
  })

  it('negrito liga/desliga', () => {
    expect(negrito(true)).toEqual(new Uint8Array([0x1b, 0x45, 1]))
    expect(negrito(false)).toEqual(new Uint8Array([0x1b, 0x45, 0]))
  })

  it('cortar emite o comando de corte parcial', () => {
    expect(cortar()).toEqual(new Uint8Array([0x1d, 0x56, 0x01]))
  })

  it('texto normaliza acento e termina com quebra de linha', () => {
    const bytes = texto('Café')
    expect(new TextDecoder().decode(bytes)).toBe('Cafe\n')
  })

  it('pular repete a quebra de linha N vezes', () => {
    expect(new TextDecoder().decode(pular(3))).toBe('\n\n\n')
  })
})

describe('concatenarBytes', () => {
  it('junta múltiplos Uint8Array preservando a ordem', () => {
    const resultado = concatenarBytes([new Uint8Array([1, 2]), new Uint8Array([3]), new Uint8Array([4, 5])])
    expect(resultado).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
  })

  it('lida com array vazio', () => {
    expect(concatenarBytes([])).toEqual(new Uint8Array([]))
  })
})
