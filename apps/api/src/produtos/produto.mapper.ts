// Converte os campos Decimal do Prisma para number nas respostas da API — os
// valores do domínio (preços em centavos, estoque com 3 casas) cabem com folga
// na precisão de float, e o frontend consome number direto (formatarBRL).

function paraNumero(valor: unknown): number {
  if (valor && typeof (valor as { toNumber?: () => number }).toNumber === 'function') {
    return (valor as { toNumber: () => number }).toNumber();
  }
  return Number(valor);
}

interface VariacaoPrisma {
  id: string;
  produtoId: string;
  nome: string;
  sku: string | null;
  codigoBarras: string | null;
  precoVenda: unknown;
  precoCusto: unknown;
  estoqueAtual: unknown;
  estoqueMinimo: unknown;
  ativo: boolean;
}

interface ProdutoPrisma {
  id: string;
  nome: string;
  descricao: string | null;
  categoriaId: string | null;
  categoria?: { id: string; nome: string } | null;
  tipoVenda: string;
  ativo: boolean;
  criadoEm: Date;
  variacoes?: VariacaoPrisma[];
}

export function mapVariacao(v: VariacaoPrisma) {
  const estoqueAtual = paraNumero(v.estoqueAtual);
  const estoqueMinimo = paraNumero(v.estoqueMinimo);
  return {
    id: v.id,
    produtoId: v.produtoId,
    nome: v.nome,
    sku: v.sku,
    codigoBarras: v.codigoBarras,
    precoVenda: paraNumero(v.precoVenda),
    precoCusto: v.precoCusto === null ? null : paraNumero(v.precoCusto),
    estoqueAtual,
    estoqueMinimo,
    // Alerta de ruptura calculado na resposta (sem flag persistida).
    emRuptura: estoqueAtual <= estoqueMinimo,
    ativo: v.ativo,
  };
}

export function mapProduto(p: ProdutoPrisma) {
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    categoriaId: p.categoriaId,
    categoria: p.categoria ? { id: p.categoria.id, nome: p.categoria.nome } : null,
    tipoVenda: p.tipoVenda,
    ativo: p.ativo,
    criadoEm: p.criadoEm,
    variacoes: (p.variacoes ?? []).map(mapVariacao),
  };
}
