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

interface PagamentoVendaPrisma {
  id: string;
  forma: string;
  valor: unknown;
  transacaoGatewayId: string | null;
}

interface VendaPrisma {
  id: string;
  status: string;
  subtotal: unknown;
  desconto: unknown;
  total: unknown;
  troco: unknown;
  criadoEm: Date;
  finalizadoEm: Date | null;
  canceladoEm: Date | null;
  canceladoMotivo: string | null;
  itens?: ItemVendaPrisma[];
  pagamentos?: PagamentoVendaPrisma[];
  operador?: { nome: string };
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

export function mapPagamento(p: PagamentoVendaPrisma) {
  return {
    id: p.id,
    forma: p.forma,
    valor: paraNumero(p.valor),
    transacaoGatewayId: p.transacaoGatewayId,
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
    troco: paraNumero(v.troco),
    criadoEm: v.criadoEm,
    finalizadoEm: v.finalizadoEm,
    canceladoEm: v.canceladoEm,
    canceladoMotivo: v.canceladoMotivo,
    quantidadeItens: itens.reduce((soma, i) => soma + i.quantidade, 0),
    itens,
    pagamentos: (v.pagamentos ?? []).map(mapPagamento),
    operador: v.operador?.nome ?? null,
  };
}
