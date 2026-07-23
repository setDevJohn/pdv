import { describe, expect, it } from 'vitest'
import { formatarRecibo } from './formatar-recibo'
import type { VendaResumo } from '@/services/vendas-service'

const venda: VendaResumo = {
  id: 'venda-1',
  status: 'FINALIZADA',
  subtotal: 13,
  desconto: 0,
  total: 13,
  troco: 7,
  criadoEm: '2026-07-22T14:00:00',
  finalizadoEm: '2026-07-22T14:05:00',
  canceladoEm: null,
  canceladoMotivo: null,
  quantidadeItens: 2,
  itens: [
    { id: 'i1', produtoVariacaoId: 'v1', descricao: 'Refrigerante Lata 350ml', quantidade: 2, precoUnitario: 6.5, total: 13 },
  ],
  pagamentos: [{ id: 'p1', forma: 'DINHEIRO', valor: 20, transacaoGatewayId: null }],
  operador: 'Admin Exemplo',
}

// Decodifica os bytes gerados de volta pra texto, ignorando os comandos de
// controle ESC/POS — mais fácil de asserir sobre o conteúdo do recibo do que
// sobre a sequência de bytes crua.
function paraTextoLegivel(bytes: Uint8Array): string {
  return new TextDecoder()
    .decode(bytes)
    // ESC+1 byte (ESC @, ESC a n, ESC E n) e GS+2 bytes (corte) primeiro,
    // senão o byte de parâmetro (ex.: 'V' do corte) vaza como texto solto.
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b.|\x1d..|[\x00-\x08\x0b-\x1f\x7f]/gs, '')
}

describe('formatarRecibo', () => {
  it('inclui nome da loja, itens, total, pagamento e troco', () => {
    const bytes = formatarRecibo(venda, 'Mercadinho Exemplo')
    const conteudo = paraTextoLegivel(bytes)

    expect(conteudo).toContain('Mercadinho Exemplo')
    expect(conteudo).toContain('2x Refrigerante Lata 350ml')
    expect(conteudo).toContain('R$ 13,00')
    expect(conteudo).toContain('TOTAL')
    expect(conteudo).toContain('Dinheiro')
    expect(conteudo).toContain('R$ 20,00')
    expect(conteudo).toContain('Troco')
    expect(conteudo).toContain('R$ 7,00')
  })

  it('não inclui a linha de troco quando não há troco', () => {
    const semTroco = { ...venda, troco: 0 }
    const conteudo = paraTextoLegivel(formatarRecibo(semTroco, 'Loja'))
    expect(conteudo).not.toContain('Troco')
  })

  it('remove acento do nome da loja (compatibilidade com codepage da impressora)', () => {
    const conteudo = paraTextoLegivel(formatarRecibo(venda, 'Confeitaria São José'))
    expect(conteudo).toContain('Confeitaria Sao Jose')
  })

  it('termina com o comando de corte de papel', () => {
    const bytes = formatarRecibo(venda, 'Loja')
    expect(bytes.slice(-3)).toEqual(new Uint8Array([0x1d, 0x56, 0x01]))
  })
})
