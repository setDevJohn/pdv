import { describe, expect, it } from 'vitest'
import { estoqueTotal, resumoPreco, temRuptura } from './produto-resumo'
import { formatarBRL } from '@/lib/format'
import type { Produto, Variacao } from '@/services/produtos-service'

function variacao(over: Partial<Variacao> = {}): Variacao {
  return {
    id: 'v1',
    produtoId: 'p1',
    nome: 'Padrão',
    sku: null,
    codigoBarras: null,
    precoVenda: 10,
    precoCusto: null,
    estoqueAtual: 5,
    estoqueMinimo: 2,
    emRuptura: false,
    ativo: true,
    ...over,
  }
}

function produto(variacoes: Variacao[]): Produto {
  return {
    id: 'p1',
    nome: 'Produto',
    descricao: null,
    categoriaId: null,
    categoria: null,
    tipoVenda: 'UNIDADE',
    ativo: true,
    criadoEm: '2026-07-22',
    variacoes,
  }
}

describe('resumoPreco', () => {
  it('mostra preço único quando todas as variações têm o mesmo preço', () => {
    expect(resumoPreco(produto([variacao({ precoVenda: 10 })]))).toBe(formatarBRL(10))
  });

  it('mostra faixa quando os preços diferem', () => {
    const p = produto([variacao({ id: 'a', precoVenda: 8.5 }), variacao({ id: 'b', precoVenda: 12 })])
    expect(resumoPreco(p)).toBe(`${formatarBRL(8.5)} – ${formatarBRL(12)}`)
  });

  it('ignora variações inativas', () => {
    const p = produto([variacao({ id: 'a', precoVenda: 10 }), variacao({ id: 'b', precoVenda: 99, ativo: false })])
    expect(resumoPreco(p)).toBe(formatarBRL(10))
  });

  it('retorna traço quando não há variação ativa', () => {
    expect(resumoPreco(produto([variacao({ ativo: false })]))).toBe('—')
  });
});

describe('estoqueTotal', () => {
  it('soma o estoque das variações ativas', () => {
    const p = produto([variacao({ id: 'a', estoqueAtual: 5 }), variacao({ id: 'b', estoqueAtual: 3 })])
    expect(estoqueTotal(p)).toBe(8)
  });
});

describe('temRuptura', () => {
  it('true quando alguma variação ativa está em ruptura', () => {
    const p = produto([variacao({ id: 'a', emRuptura: false }), variacao({ id: 'b', emRuptura: true })])
    expect(temRuptura(p)).toBe(true)
  });

  it('false quando a ruptura é só de variação inativa', () => {
    const p = produto([variacao({ id: 'a', emRuptura: false }), variacao({ id: 'b', emRuptura: true, ativo: false })])
    expect(temRuptura(p)).toBe(false)
  });
});
