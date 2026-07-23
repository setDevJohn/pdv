// Comandos ESC/POS mínimos pra recibo de venda — só o subconjunto que o
// formatador de recibo usa (não é um encoder genérico).

const codificador = new TextEncoder()

// Impressoras térmicas baratas (a maioria no Brasil) vêm com codepage
// CP437/CP860, não UTF-8 — qualquer byte fora do ASCII imprimível vira
// caractere quebrado (a formatação de moeda, por exemplo, usa espaço
// non-breaking entre "R$" e o valor). Normaliza tudo pra ASCII puro de um
// byte, o único formato garantido em qualquer modelo.
export function removerAcentos(texto: string): string {
  const semAcento = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return semAcento.replace(/[^\x20-\x7e]/g, ' ')
}

export function inicializar(): Uint8Array {
  return new Uint8Array([0x1b, 0x40])
}

export function alinhar(posicao: 'esquerda' | 'centro' | 'direita'): Uint8Array {
  const codigo = { esquerda: 0, centro: 1, direita: 2 }[posicao]
  return new Uint8Array([0x1b, 0x61, codigo])
}

export function negrito(ligado: boolean): Uint8Array {
  return new Uint8Array([0x1b, 0x45, ligado ? 1 : 0])
}

export function texto(linha: string): Uint8Array {
  return codificador.encode(removerAcentos(linha) + '\n')
}

export function pular(linhas = 1): Uint8Array {
  return codificador.encode('\n'.repeat(linhas))
}

// Corte parcial (a maioria das térmicas de balcão suporta; corte total (m=0)
// é mais comum em impressoras de cozinha/produção com guilhotina completa).
export function cortar(): Uint8Array {
  return new Uint8Array([0x1d, 0x56, 0x01])
}

export function concatenarBytes(partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((soma, p) => soma + p.length, 0)
  const resultado = new Uint8Array(total)
  let offset = 0
  for (const parte of partes) {
    resultado.set(parte, offset)
    offset += parte.length
  }
  return resultado
}
