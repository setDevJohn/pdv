// Tipos compartilhados entre apps/web e apps/api. Espelham enums do
// apps/api/prisma/schema.prisma como union types simples — o client do
// Prisma (gerado) não deve vazar como dependência de runtime do frontend.

export type PerfilAcesso = 'ADMIN' | 'VENDEDOR'

// Venda apenas por unidade no MVP; modelagem já preparada para peso/volume
// (ver docs/07-escopo-fechado.md).
export type TipoVenda = 'UNIDADE' | 'PESO' | 'VOLUME'
