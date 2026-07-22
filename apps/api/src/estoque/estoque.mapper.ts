function paraNumero(valor: unknown): number {
  if (valor && typeof (valor as { toNumber?: () => number }).toNumber === 'function') {
    return (valor as { toNumber: () => number }).toNumber();
  }
  return Number(valor);
}

interface MovimentacaoPrisma {
  id: string;
  produtoVariacaoId: string;
  tipo: string;
  quantidade: unknown;
  estoqueResultante: unknown;
  observacao: string | null;
  criadoEm: Date;
  usuario?: { id: string; nome: string } | null;
  produtoVariacao?: { nome: string; produto?: { nome: string } | null } | null;
}

export function mapMovimentacao(m: MovimentacaoPrisma) {
  return {
    id: m.id,
    produtoVariacaoId: m.produtoVariacaoId,
    tipo: m.tipo,
    quantidade: paraNumero(m.quantidade),
    estoqueResultante: paraNumero(m.estoqueResultante),
    observacao: m.observacao,
    criadoEm: m.criadoEm,
    usuario: m.usuario ? { id: m.usuario.id, nome: m.usuario.nome } : null,
    produtoNome: m.produtoVariacao?.produto?.nome ?? null,
    variacaoNome: m.produtoVariacao?.nome ?? null,
  };
}
