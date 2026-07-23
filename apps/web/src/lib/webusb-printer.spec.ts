import { afterEach, describe, expect, it, vi } from 'vitest'
import { impressoraSuportada, imprimir } from './webusb-printer'

function dispositivoFalso(overrides: Partial<USBDevice> = {}): USBDevice {
  return {
    configuration: {
      interfaces: [{ interfaceNumber: 0, alternate: { endpoints: [{ endpointNumber: 1, direction: 'out' }] } }],
    },
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    selectConfiguration: vi.fn().mockResolvedValue(undefined),
    claimInterface: vi.fn().mockResolvedValue(undefined),
    transferOut: vi.fn().mockResolvedValue({ status: 'ok', bytesWritten: 0 }),
    ...overrides,
  } as USBDevice
}

describe('impressoraSuportada', () => {
  afterEach(() => {
    // @ts-expect-error -- limpa o mock entre testes
    delete navigator.usb
  });

  it('false quando o navegador não expõe navigator.usb', () => {
    expect(impressoraSuportada()).toBe(false)
  });

  it('true quando navigator.usb existe', () => {
    // @ts-expect-error -- só o suficiente pro type guard
    navigator.usb = {}
    expect(impressoraSuportada()).toBe(true)
  });
});

describe('imprimir', () => {
  afterEach(() => {
    // @ts-expect-error -- limpa o mock entre testes
    delete navigator.usb
    vi.restoreAllMocks()
  });

  it('rejeita quando WebUSB não é suportado', async () => {
    await expect(imprimir(new Uint8Array([1]))).rejects.toThrow(/não é suportad/)
  });

  it('reaproveita um dispositivo já autorizado, sem pedir permissão de novo', async () => {
    const dispositivo = dispositivoFalso()
    const requestDevice = vi.fn()
    // @ts-expect-error -- mock mínimo da API
    navigator.usb = { getDevices: vi.fn().mockResolvedValue([dispositivo]), requestDevice }

    await imprimir(new Uint8Array([1, 2, 3]))

    expect(requestDevice).not.toHaveBeenCalled()
    expect(dispositivo.open).toHaveBeenCalled()
    expect(dispositivo.claimInterface).toHaveBeenCalledWith(0)
    expect(dispositivo.transferOut).toHaveBeenCalledWith(1, new Uint8Array([1, 2, 3]))
    expect(dispositivo.close).toHaveBeenCalled()
  });

  it('pede um dispositivo novo quando nenhum já foi autorizado', async () => {
    const dispositivo = dispositivoFalso()
    const requestDevice = vi.fn().mockResolvedValue(dispositivo)
    // @ts-expect-error -- mock mínimo da API
    navigator.usb = { getDevices: vi.fn().mockResolvedValue([]), requestDevice }

    await imprimir(new Uint8Array([9]))

    expect(requestDevice).toHaveBeenCalledWith({ filters: [] })
    expect(dispositivo.transferOut).toHaveBeenCalled()
  });

  it('seleciona a configuração quando o dispositivo ainda não tem uma', async () => {
    const dispositivo = dispositivoFalso({ configuration: null })
    dispositivo.selectConfiguration = vi.fn().mockImplementation(async () => {
      // simula o efeito real: após selectConfiguration, `configuration` passa a existir
      Object.defineProperty(dispositivo, 'configuration', {
        value: { interfaces: [{ interfaceNumber: 0, alternate: { endpoints: [{ endpointNumber: 1, direction: 'out' }] } }] },
        configurable: true,
      })
    })
    // @ts-expect-error -- mock mínimo da API
    navigator.usb = { getDevices: vi.fn().mockResolvedValue([dispositivo]), requestDevice: vi.fn() }

    await imprimir(new Uint8Array([1]))

    expect(dispositivo.selectConfiguration).toHaveBeenCalledWith(1)
  });

  it('rejeita quando o dispositivo não tem endpoint de saída', async () => {
    const dispositivo = dispositivoFalso({
      configuration: { interfaces: [{ interfaceNumber: 0, alternate: { endpoints: [] } }] },
    })
    // @ts-expect-error -- mock mínimo da API
    navigator.usb = { getDevices: vi.fn().mockResolvedValue([dispositivo]), requestDevice: vi.fn() }

    await expect(imprimir(new Uint8Array([1]))).rejects.toThrow(/endpoint de saída/)
    expect(dispositivo.close).toHaveBeenCalled()
  });

  it('fecha o dispositivo mesmo quando transferOut falha', async () => {
    const dispositivo = dispositivoFalso({ transferOut: vi.fn().mockRejectedValue(new Error('falha de transferência')) })
    // @ts-expect-error -- mock mínimo da API
    navigator.usb = { getDevices: vi.fn().mockResolvedValue([dispositivo]), requestDevice: vi.fn() }

    await expect(imprimir(new Uint8Array([1]))).rejects.toThrow('falha de transferência')
    expect(dispositivo.close).toHaveBeenCalled()
  });
});
