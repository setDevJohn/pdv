// Tipos mínimos do WebUSB — a lib.dom.d.ts do TypeScript não inclui a API
// (é uma spec WICG, não W3C REC). Só o que a impressora térmica usa; não é
// uma definição completa da spec.

interface USBDeviceFilter {
  vendorId?: number
  productId?: number
}

interface USBDeviceRequestOptions {
  filters: USBDeviceFilter[]
}

interface USBEndpoint {
  endpointNumber: number
  direction: 'in' | 'out'
}

interface USBAlternateInterface {
  endpoints: USBEndpoint[]
}

interface USBInterface {
  interfaceNumber: number
  alternate: USBAlternateInterface
}

interface USBConfiguration {
  interfaces: USBInterface[]
}

interface USBOutTransferResult {
  status: 'ok' | 'stall' | 'babble'
  bytesWritten: number
}

interface USBDevice {
  readonly configuration: USBConfiguration | null
  open(): Promise<void>
  close(): Promise<void>
  selectConfiguration(configurationValue: number): Promise<void>
  claimInterface(interfaceNumber: number): Promise<void>
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>
}

interface USB {
  getDevices(): Promise<USBDevice[]>
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>
}

interface Navigator {
  readonly usb?: USB
}
