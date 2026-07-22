// Mesma conversão Decimal -> number das demais features (ver produto.mapper).

function paraNumero(valor: unknown): number {
  if (
    valor &&
    typeof (valor as { toNumber?: () => number }).toNumber === 'function'
  ) {
    return (valor as { toNumber: () => number }).toNumber();
  }
  return Number(valor);
}

interface ItemVendaPrisma {
  id: string;
  produtoVariacaoId: string;
  descricao: string;
  quantidade: unknown;
  precoUnitario: unknown;
  total: unknown;
}

interface VendaPrisma {
  id: string;
  status: string;
  subtotal: unknown;
  desconto: unknown;
  total: unknown;
  criadoEm: Date;
  itens?: ItemVendaPrisma[];
}

export function mapItemVenda(i: ItemVendaPrisma) {
  return {
    id: i.id,
    produtoVariacaoId: i.produtoVariacaoId,
    descricao: i.descricao,
    quantidade: paraNumero(i.quantidade),
    precoUnitario: paraNumero(i.precoUnitario),
    total: paraNumero(i.total),
  };
}

export function mapVenda(v: VendaPrisma) {
  const itens = (v.itens ?? []).map(mapItemVenda);
  return {
    id: v.id,
    status: v.status,
    subtotal: paraNumero(v.subtotal),
    desconto: paraNumero(v.desconto),
    total: paraNumero(v.total),
    criadoEm: v.criadoEm,
    quantidadeItens: itens.reduce((soma, i) => soma + i.quantidade, 0),
    itens,
  };
}
