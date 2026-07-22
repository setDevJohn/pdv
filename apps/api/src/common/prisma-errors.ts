// Detecta erros conhecidos do Prisma por código sem acoplar ao caminho de
// import da classe de erro (que muda entre versões do client gerado).
// P2002 = violação de constraint única. P2025 = registro não encontrado.
function temCodigo(error: unknown, codigo: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === codigo;
}

export function ehViolacaoDeUnicidade(error: unknown): boolean {
  return temCodigo(error, 'P2002');
}

export function ehRegistroNaoEncontrado(error: unknown): boolean {
  return temCodigo(error, 'P2025');
}
