// Impressão térmica via WebUSB direto no navegador — sem serviço local
// instalado (ver docs/07-escopo-fechado.md). Só Chrome/Edge implementam
// WebUSB; `impressoraSuportada()` deixa a tela decidir se mostra a ação.

export function impressoraSuportada(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator && navigator.usb !== undefined
}

async function obterDispositivo(): Promise<USBDevice> {
  const usb = navigator.usb!
  // Dispositivo já autorizado numa impressão anterior: reaproveita sem pedir
  // permissão de novo. Sem nenhum, abre o seletor do navegador (exige gesto
  // do usuário — por isso só é chamado a partir de um clique).
  const autorizados = await usb.getDevices()
  if (autorizados[0]) {
    return autorizados[0]
  }
  return usb.requestDevice({ filters: [] })
}

export async function imprimir(bytes: Uint8Array): Promise<void> {
  if (!impressoraSuportada()) {
    throw new Error('Impressão térmica não é suportada neste navegador (use Chrome ou Edge)')
  }

  const dispositivo = await obterDispositivo()
  await dispositivo.open()
  try {
    if (dispositivo.configuration === null) {
      await dispositivo.selectConfiguration(1)
    }
    const interfaceImpressora = dispositivo.configuration?.interfaces[0]
    if (!interfaceImpressora) {
      throw new Error('Dispositivo USB sem interface disponível')
    }
    await dispositivo.claimInterface(interfaceImpressora.interfaceNumber)

    const endpointSaida = interfaceImpressora.alternate.endpoints.find((e) => e.direction === 'out')
    if (!endpointSaida) {
      throw new Error('Impressora sem endpoint de saída — dispositivo selecionado não parece ser uma impressora')
    }

    await dispositivo.transferOut(endpointSaida.endpointNumber, bytes as BufferSource)
  } finally {
    await dispositivo.close()
  }
}
