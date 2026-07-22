# Changelog

Todas as entregas do projeto PDV são registradas aqui, uma feature por entrada, na ordem em
que foram concluídas. Cada entrada deve ser atualizada e commitada junto com o código da
feature correspondente (ver `docs/03-prompt-metodologia-agente.md`).

Formato de cada entrada:

## [Nome da feature] - AAAA-MM-DD
### Adicionado
- O que foi implementado.
### Decisões técnicas
- Resumo de decisões de arquitetura relevantes tomadas nessa feature.
### Critério de aceite
- Como foi validado que a feature está pronta.

---

<!-- Novas entradas entram abaixo desta linha, mais recente no topo -->

## [Autenticação e permissões] - 2026-07-22
### Adicionado
- Login por `slug` da empresa + e-mail + senha (`POST /auth/login`), com refresh token
  em cookie httpOnly e access token curto no corpo da resposta.
- `GET /empresas/resolver?slug=` público: resolve a empresa pelo slug (para o front
  detectar via subdomínio e cair no campo manual como fallback), sem vazar dados internos.
- `POST /auth/refresh` (renova via cookie), `POST /auth/logout`, `POST /auth/trocar-loja`
  (reemite o token com a loja escolhida, validando o vínculo em `UsuarioLoja`).
- `POST /auth/validar-codigo-gerente`: valida o código contra o hash da loja e devolve um
  "gerente-token" de curta duração que autoriza uma ação específica; grava em `LogAuditoria`.
- Guards globais: `JwtAuthGuard` (nega por padrão, exceção via `@Public()`), `RolesGuard`
  (`@Roles(ADMIN|VENDEDOR)`), `GerenteGuard` (`@RequerGerente('ACAO')`); decorator
  `@CurrentUser()`. `HashService` (bcryptjs, custo 12) para senha e código de gerente.
- Campo `slug` (único) em `Empresa` + migration; seed atualizado com hash real
  (login de teste: slug `mercadinho-exemplo`, `admin@exemplo.com` / `senha123`,
  código de gerente `1234`).
- 32 testes unitários (auth service, três guards, empresas service, hash service).
### Decisões técnicas
- Isolamento de login por empresa: e-mail é único por empresa (`@@unique([empresaId, email])`),
  então o login exige o slug — o mesmo e-mail pode existir em empresas diferentes.
- Loja ativa vive como claim no JWT (`lojaAtivaId`/`perfil`), evitando ir ao banco a cada
  request; usuário com uma única loja já entra com ela selecionada, com mais de uma escolhe
  via `trocar-loja`. O refresh revalida o vínculo — acesso revogado cai no próximo refresh.
- Três segredos JWT distintos (access/refresh/gerente), nunca reaproveitados, passados
  explicitamente em cada sign/verify (JwtModule sem secret global).
- `bcryptjs` (JS puro) em vez de `bcrypt` nativo: evita toolchain de compilação nativa na
  imagem Alpine, mantendo o mesmo algoritmo.
- Rate limit global via `@nestjs/throttler` (60/min), com limites mais baixos em login
  (10/min) e código de gerente (5/min, por ser um PIN curto).
- `ValidationPipe` global com `whitelist`+`forbidNonWhitelisted` (rejeita campos não
  esperados no body) e CORS restrito ao `WEB_URL` com credenciais habilitadas (cookie).
### Critério de aceite
- `npm test` (32 passam) e `npm run test:e2e` (1 passa) verdes; `npm run build` compila.
- Fluxo validado ponta a ponta (local e via `docker compose`): resolver empresa, login
  correto/incorreto, rota protegida sem token (401), troca de loja (vínculo válido/inválido),
  código de gerente correto/incorreto, refresh e logout — com entrada em `LogAuditoria`.

## [Bootstrap do monorepo] - 2026-07-21
### Adicionado
- `package.json` raiz com npm workspaces (`apps/*`, `packages/*`).
- `apps/api`: aplicação NestJS inicializada, com Prisma configurado (`prisma.config.ts`,
  `prisma/schema.prisma` vazio, client gerado em `generated/`).
- `apps/web`: aplicação Vite + React + TypeScript, com Tailwind CSS v4 e shadcn/ui
  inicializados (preset Nova, fonte Geist, tokens de tema via CSS variables).
- `packages/shared-types` e `packages/ui`: esqueleto vazio para tipos e componentes
  compartilhados entre `web` e `api`, a serem populados nas próximas fases.
- Repositório git inicializado.
### Decisões técnicas
- Gerenciador de monorepo: npm workspaces (compatível com os Dockerfiles que já usavam
  `npm ci`, sem introduzir ferramenta extra).
- `Dockerfile`s de `apps/api` e `apps/web` ajustados para build a partir da raiz do
  monorepo (contexto `.` no `docker-compose.yml`), já que `npm ci` com workspaces precisa
  do `package-lock.json` e dos `package.json` de todos os workspaces envolvidos.
- `apps/api/tsconfig.json` usa `rootDir: "./src"` (sem `baseUrl`, deprecado a partir do
  TypeScript 6) e `tsconfig.build.json` restringe o build a `src/**/*`, para não incluir
  `prisma.config.ts` e o client gerado do Prisma no bundle da aplicação.
### Critério de aceite
- `npm run build` e `npm test` passam em `apps/api` e `apps/web`.
- `docker compose build && docker compose up -d` sobe os 3 serviços; `GET /` responde
  200 na api (porta 3000) e no web (porta 5173).

## [Modelagem de dados] - 2026-07-22
### Adicionado
- `schema.prisma` completo: `Empresa` → `Loja` (tenant operacional) → `Usuario` (via
  `UsuarioLoja`, perfil Admin/Vendedor por loja); `Assinatura` (plano/trial);
  `Categoria`, `Produto`, `ProdutoVariacao` (tamanho/sabor, já com `tipoVenda` reservado
  para peso/volume); `MovimentacaoEstoque`; `Caixa` e `Sangria`; `Venda`, `ItemVenda`,
  `PagamentoVenda` (com `transacaoGatewayId` reservado para integração futura de
  maquininha); `LogAuditoria`.
- Migration inicial (`prisma/migrations/20260722010815_init`) aplicada e validada contra
  Postgres real (16 tabelas criadas).
- `PrismaService`/`PrismaModule` (NestJS) conectando via driver adapter (`@prisma/adapter-pg`
  + `pg`), exigido pela nova geração do Prisma Client (7.x).
- Seed de desenvolvimento (`prisma/seed.ts`, idempotente) com 1 empresa em trial, 1 loja,
  2 usuários (Admin/Vendedor) e 1 produto com estoque inicial.
- `.dockerignore` na raiz do monorepo (fazia falta desde o bootstrap).
### Decisões técnicas
- Isolamento multiempresa: schema único do Postgres + `lojaId` como tenant operacional em
  toda tabela de domínio (índices compostos começando por `lojaId`), com `Empresa` como
  dona da assinatura e possivelmente múltiplas `Loja`s. Mais barato de operar em VPS
  próprio do que schema-por-tenant; decisão aprovada no checkpoint desta feature.
- Client do Prisma gerado dentro de `src/generated/prisma` (não fora de `src/`), para que
  `nest build` compile o client junto com o resto do app — a nova geração do Prisma (7.x)
  entrega TypeScript-fonte, não mais um pacote pré-compilado.
- Seed roda com `tsx` (não `ts-node`): o client gerado usa import specifiers no padrão
  `nodenext` (`./internal/class.js` apontando para `.ts`), que `tsx` resolve nativamente e
  `ts-node` não resolve fora de um build real.
- Código de gerente e senha de usuário ficam como hash no schema (`codigoGerenteHash`,
  `senhaHash`); o algoritmo de hash concreto é decisão do checkpoint de segurança (Fase 2).
- Corrigido `.dockerignore` ausente: sem ele, `COPY . .` copiava `node_modules`, `dist`,
  `.env` e `tsconfig.build.tsbuildinfo` do host para a imagem — o `tsbuildinfo` chegava a
  fazer o `tsc` incremental pular a compilação e não gerar `dist/` dentro do container.
### Critério de aceite
- `npx prisma migrate dev` roda sem erro e cria as 16 tabelas esperadas no Postgres.
- `npx prisma db seed` roda sem erro (idempotente) e popula os dados de desenvolvimento.
- `npm run build` (api) compila `src/generated/prisma` para `dist/generated/prisma`;
  `node dist/main.js` sobe e loga "Conectado ao banco de dados".
- `docker compose build --no-cache && docker compose up -d` sobe os 3 serviços; log da
  api confirma a conexão com o Postgres do container.
