import { alinhar, concatenarBytes, cortar, inicializar, negrito, pular, texto } from './esc-pos'
import { formatarBRL } from './format'
import type { VendaResumo, FormaPagamento } from '@/services/vendas-service'

// Colunas de uma térmica de 58mm com fonte padrão — o modelo mais comum no
// pequeno varejo brasileiro. Impressoras de 80mm imprimem o mesmo recibo mais
// estreito que o papel, o que é inofensivo (só sobra margem à direita).
const LARGURA = 32

const ROTULO_FORMA: Record<FormaPagamento, string> = {
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartao',
  PIX: 'Pix',
}

function linhaDupla(esquerda: string, direita: string, largura = LARGURA): string {
  const espacos = Math.max(1, largura - esquerda.length - direita.length)
  return `${esquerda}${' '.repeat(espacos)}${direita}`
}

function linhaSeparadora(largura = LARGURA): string {
  return '-'.repeat(largura)
}

// Trunca em vez de quebrar linha — recibo de MVP, item com nome muito longo
// perde o final em vez de ocupar múltiplas linhas (mantém o layout simples).
function truncar(s: string, largura = LARGURA): string {
  return s.length > largura ? s.slice(0, largura) : s
}

export function formatarRecibo(venda: VendaResumo, nomeLoja: string): Uint8Array {
  const partes: Uint8Array[] = [inicializar(), alinhar('centro'), negrito(true), texto(nomeLoja), negrito(false)]

  const dataHora = new Date(venda.finalizadoEm ?? venda.criadoEm).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  partes.push(texto(dataHora), alinhar('esquerda'), texto(linhaSeparadora()))

  for (const item of venda.itens) {
    partes.push(texto(truncar(`${item.quantidade}x ${item.descricao}`)))
    partes.push(texto(linhaDupla('', formatarBRL(item.total))))
  }

  partes.push(
    texto(linhaSeparadora()),
    negrito(true),
    texto(linhaDupla('TOTAL', formatarBRL(venda.total))),
    negrito(false),
  )

  for (const pagamento of venda.pagamentos) {
    partes.push(texto(linhaDupla(ROTULO_FORMA[pagamento.forma], formatarBRL(pagamento.valor))))
  }
  if (venda.troco > 0) {
    partes.push(texto(linhaDupla('Troco', formatarBRL(venda.troco))))
  }

  partes.push(
    texto(linhaSeparadora()),
    alinhar('centro'),
    texto('Obrigado pela preferencia!'),
    pular(3),
    cortar(),
  )

  return concatenarBytes(partes)
}
