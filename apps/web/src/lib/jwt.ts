// Decodifica o payload de um JWT sem verificar assinatura — usado só para o
// front refletir estado (ex.: qual loja ficou ativa depois de um refresh). A
// validação de verdade é sempre feita pelo backend a cada request.
export function decodeJwtPayload<T>(token: string): T {
  const payloadBase64Url = token.split('.')[1]
  const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/')
  const json = atob(payloadBase64)
  return JSON.parse(json) as T
}
