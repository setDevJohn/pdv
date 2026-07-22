// Seed mínimo de dados de desenvolvimento: uma empresa em trial, uma loja, um
// usuário Admin e um Vendedor, uma categoria e um produto com estoque inicial.
//
// Idempotente (usa upsert) — pode rodar mais de uma vez sem duplicar dados.
//
// Login de teste: slug "mercadinho-exemplo", admin@exemplo.com / senha123
// (Vendedor: vendedor@exemplo.com / senha123). Código de gerente: 1234.
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

async function main() {
  const senhaHash = await bcrypt.hash('senha123', 12)
  const codigoGerenteHash = await bcrypt.hash('1234', 12)

  const empresa = await prisma.empresa.upsert({
    where: { documento: '00000000000191' },
    update: {},
    create: {
      nome: 'Mercadinho Exemplo',
      slug: 'mercadinho-exemplo',
      documento: '00000000000191',
      assinatura: {
        create: {
          plano: 'MENSAL',
          status: 'TRIAL',
          trialIniciadoEm: new Date(),
          trialLimiteInsercoes: 50,
        },
      },
    },
  })

  const loja = await prisma.loja.upsert({
    where: { id: `${empresa.id}-loja-principal` },
    update: {},
    create: {
      id: `${empresa.id}-loja-principal`,
      empresaId: empresa.id,
      nome: 'Loja Principal',
      codigoGerenteHash,
    },
  })

  const admin = await prisma.usuario.upsert({
    where: { empresaId_email: { empresaId: empresa.id, email: 'admin@exemplo.com' } },
    update: {},
    create: {
      empresaId: empresa.id,
      nome: 'Admin Exemplo',
      email: 'admin@exemplo.com',
      senhaHash,
      lojas: { create: { lojaId: loja.id, perfil: 'ADMIN' } },
    },
  })

  await prisma.usuario.upsert({
    where: { empresaId_email: { empresaId: empresa.id, email: 'vendedor@exemplo.com' } },
    update: {},
    create: {
      empresaId: empresa.id,
      nome: 'Vendedor Exemplo',
      email: 'vendedor@exemplo.com',
      senhaHash,
      lojas: { create: { lojaId: loja.id, perfil: 'VENDEDOR' } },
    },
  })

  const categoria = await prisma.categoria.upsert({
    where: { lojaId_nome: { lojaId: loja.id, nome: 'Bebidas' } },
    update: {},
    create: { lojaId: loja.id, nome: 'Bebidas' },
  })

  const produto = await prisma.produto.upsert({
    where: { id: `${loja.id}-produto-refrigerante` },
    update: {},
    create: {
      id: `${loja.id}-produto-refrigerante`,
      lojaId: loja.id,
      categoriaId: categoria.id,
      nome: 'Refrigerante',
      tipoVenda: 'UNIDADE',
    },
  })

  const variacao = await prisma.produtoVariacao.upsert({
    where: { lojaId_codigoBarras: { lojaId: loja.id, codigoBarras: '7891000100103' } },
    update: {},
    create: {
      lojaId: loja.id,
      produtoId: produto.id,
      nome: 'Lata 350ml',
      codigoBarras: '7891000100103',
      precoVenda: 6.5,
      precoCusto: 3.2,
      estoqueMinimo: 10,
    },
  })

  const estoqueExistente = await prisma.movimentacaoEstoque.findFirst({
    where: { produtoVariacaoId: variacao.id, tipo: 'ENTRADA' },
  })

  if (!estoqueExistente) {
    const quantidadeInicial = 50
    await prisma.$transaction([
      prisma.movimentacaoEstoque.create({
        data: {
          lojaId: loja.id,
          produtoVariacaoId: variacao.id,
          usuarioId: admin.id,
          tipo: 'ENTRADA',
          quantidade: quantidadeInicial,
          estoqueResultante: quantidadeInicial,
          observacao: 'Estoque inicial (seed)',
        },
      }),
      prisma.produtoVariacao.update({
        where: { id: variacao.id },
        data: { estoqueAtual: quantidadeInicial },
      }),
    ])
  }

  console.log('Seed concluído:', {
    empresa: empresa.nome,
    loja: loja.nome,
    usuarios: ['admin@exemplo.com', 'vendedor@exemplo.com'],
    produto: produto.nome,
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
