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

## [Caixa: abertura, sangria e fechamento] - 2026-07-22
### Adicionado
- Backend `CaixaModule`: `POST /caixa/abrir` (valor inicial declarado; bloqueia se já há
  caixa aberto na loja), `GET /caixa/atual` (caixa aberto + resumo, ou vazio), `POST
  /caixa/sangria`, `POST /caixa/fechar` e `GET /caixa/historico`. Abertura/sangria/fechamento
  para Admin e Vendedor.
- Saldo em dinheiro calculado (`valorInicial + vendas em dinheiro − sangrias`); sangria não
  pode exceder o saldo. Fechamento devolve valor esperado × contado e a diferença (sobra/falta).
- Abertura, sangria e fechamento registrados em `LogAuditoria`.
- Frontend: seção **Caixa** na sidebar — abre caixa quando não há um aberto; com caixa aberto,
  mostra cards (inicial/sangrias/saldo), lista de sangrias e diálogos de sangria e fechamento
  (este exibindo a diferença apurada antes de encerrar).
- 5 testes de backend + 3 de frontend novos.
### Decisões técnicas
- Um caixa aberto por loja por vez (índice `(lojaId, status)`); a venda (feature 5) anexará
  ao caixa aberto. Evolui para caixa-por-operador se necessário.
- Saldo já consulta `PagamentoVenda` (forma DINHEIRO, venda FINALIZADA): hoje soma 0, mas
  passa a incluir vendas automaticamente quando as features 5/6 chegarem, sem mudar o cálculo.
- **Correção de UX pega no teste de browser**: o fechamento não invalida a query no sucesso —
  isso desmontaria o componente do caixa antes de exibir a diferença. A invalidação acontece
  ao clicar em "Concluir", mantendo a tela de resultado visível.
### Critério de aceite
- `npm test` verde (`apps/api`: 77, `apps/web`: 48); `build`/`lint` limpos.
- Backend validado por `curl`: abrir, 409 no segundo abrir, sangria com/sem saldo (400),
  fechar com diferença, histórico e caixa atual null após fechar.
- Fluxo completo em Chrome headless: abrir (R$100) → sangria (saldo R$70) → fechar contando
  a menos → tela de diferença "Falta -R$10,00" → concluir → sem caixa aberto.

## [Estoque: entrada, saída, ajuste e histórico] - 2026-07-22
### Adicionado
- Backend `EstoqueModule`: `POST /estoque/entrada`, `/saida`, `/ajuste`, `GET /movimentacoes`
  (histórico paginado) e `GET /ruptura`. Cada movimentação atualiza o estoque da variação e
  grava a `MovimentacaoEstoque` (com `estoqueResultante`) numa transação. Saída valida
  estoque suficiente; ajuste define o valor absoluto contado e registra a diferença.
- Ajuste manual exige código de gerente para Vendedor (`@RequerGerente('AJUSTE_ESTOQUE')`);
  Admin passa direto.
- Alerta de ruptura (`estoqueAtual <= estoqueMinimo`) por variação ativa.
- Frontend: seção **Estoque** na sidebar — alertas de ruptura no topo, busca de produto e
  diálogo de movimentação (entrada/saída/ajuste). No ajuste por Vendedor, o diálogo coleta o
  código de gerente e o valida antes. Diálogo de histórico por variação.
- 6 testes de backend + 3 de frontend novos (incluindo o fluxo de código de gerente).
### Decisões técnicas
- **Mudança no `GerenteGuard` (Fase 2a)**: agora libera automaticamente para ADMIN em vez de
  exigir o gerente-token de qualquer perfil. O Admin já é totalmente privilegiado; o código de
  gerente existe para autorizar um Vendedor. Regra consistente com toda a matriz (vale também
  para o cancelamento de venda, feature 6).
- Movimentação atômica via `$transaction` interativa (lê atual → calcula → atualiza → grava),
  com `estoqueResultante` exato. Trade-off assumido: sob read-committed, movimentações
  concorrentes na mesma variação poderiam causar lost-update — desprezível no volume do MVP;
  migrar para decremento condicional/optimistic lock se necessário.
- Estoque inicial de produto novo continua entrando por aqui (movimentação registrada), não
  pelo cadastro — uma única fonte de verdade e trilha de auditoria completa.
- Hooks de mutação envolvem o serviço (`(input) => fn(input)`) porque o react-query v5 passa
  um 2º argumento de contexto ao `mutationFn` — pego por teste antes de vazar pra assinatura.
### Critério de aceite
- `npm test` verde (`apps/api`: 69, `apps/web`: 45); `build`/`lint` limpos.
- Backend validado por `curl`: entrada, saída insuficiente (400), ajuste de Vendedor sem
  código (403) e com código (200), ajuste de Admin sem código (200), ruptura e histórico
  encadeado com `estoqueResultante`.
- Fluxo completo em Chrome headless como Vendedor: Estoque → ruptura → entrada → ajuste
  exigindo código de gerente → estoque atualizado.

## [Catálogo: produtos, variações e categorias] - 2026-07-22
### Adicionado
- Backend `CategoriasModule`: CRUD de categorias por loja (leitura Admin+Vendedor, escrita
  Admin), com nome único por loja (409 em duplicado).
- Backend `ProdutosModule`: CRUD de produtos com variações. Criar produto cria produto +
  variações numa transação; listagem paginada com busca por nome/código de barras/SKU;
  edição de produto e gestão de variações (adicionar/editar/remover). Soft-delete de produto
  e de variação (não remove a última ativa). Alerta de ruptura (`estoqueAtual <= estoqueMinimo`)
  calculado na resposta.
- Primeiro uso real de `@ContarInsercaoTrial()`: criar produto consome uma inserção do trial.
- Decorator `@LojaAtiva()` (garante e tipa o `lojaAtivaId` do token) e helper
  `common/prisma-errors` (traduz P2002/P2025).
- Frontend: layout admin com sidebar (shadcn) e navegação por perfil; página de produtos
  (tabela com busca debounced, paginação, badge de ruptura, faixa de preço); formulário de
  produto (criar/editar) com diálogo de variação; página de categorias (CRUD inline).
- 15 testes de backend + 11 de frontend novos.
### Decisões técnicas
- Isolamento por loja em toda query (`where: { lojaId }`); `@Roles()` já garante o perfil —
  que só existe junto do `lojaAtivaId` no token — então nenhuma rota de negócio vaza entre lojas.
- Valores `Decimal` do Prisma convertidos para `number` na borda da API (mapper), já que os
  valores do domínio cabem com folga em float e o frontend consome `number` direto.
- Estoque inicial não é definido no cadastro do produto: entra pela feature de Estoque (2b),
  via movimentação registrada — mantém uma única fonte de verdade e trilha de auditoria.
- Soft-delete (produto/variação `ativo=false`) em vez de exclusão física, para preservar a
  integridade do histórico de vendas/relatórios.
- Select de categoria via elemento nativo estilizado, evitando puxar o componente de Select
  do Radix para um caso simples.
### Critério de aceite
- `npm test` verde (`apps/api`: 62, `apps/web`: 42); `npm run build`/`lint` limpos.
- Backend validado por `curl`: RBAC (Vendedor 403 ao criar), 409 em nome/código duplicado,
  400 em preço inválido, criação com múltiplas variações, busca paginada.
- Fluxo completo validado em Chrome headless: login Admin → sidebar Produtos → Novo produto →
  variação com preço → cadastrar → produto aparece na busca com badge de ruptura.

## [Trial de 7 dias com inserções limitadas] - 2026-07-22
### Adicionado
- Coluna `Assinatura.trialInsercoesUsadas` (contador) + migration.
- `AssinaturaService`: calcula o status do trial (dias restantes, inserções usadas/limite,
  expirado por tempo ou por cota) e consome inserções de forma atômica.
- `GET /assinatura` (protegido, qualquer perfil): status do trial para o banner do front.
- `TrialGuard` + decorator `@ContarInsercaoTrial()`: guard global que, em rotas marcadas,
  consome uma inserção da assinatura em TRIAL e bloqueia (403) quando o prazo/cota estoura;
  fora do trial não afeta nada. Mecanismo pronto para as features que criam registro
  (produto, venda) o decorarem.
- Frontend: `TrialBanner` na home (níveis info/alerta/expirado usando os tokens do design
  system), com a lógica de exibição isolada em `montarConteudoTrial` para ser testável.
- 14 testes novos de backend + 7 de frontend cobrindo os cálculos e regras do trial.
### Decisões técnicas
- Consumo de inserção é atômico via `updateMany` com condição `trialInsercoesUsadas < limite`
  na própria query: se `count` volta 0, uma requisição concorrente já esgotou a cota e a
  inserção é barrada — evita ultrapassar o limite sob concorrência.
- Trade-off assumido: a inserção é consumida no guard (antes do handler), então uma criação
  que falhe por outro motivo ainda gasta cota. Aceitável no MVP; migrar para interceptor
  (só em sucesso) se incomodar na prática.
- `GET /assinatura` calcula tudo on-the-fly e não persiste transição de status
  (TRIAL→expirado) — isso é responsabilidade da futura feature de Cobrança/planos.
- Escopo consciente: nenhuma rota decora `@ContarInsercaoTrial()` ainda porque as telas que
  criam registro (produtos, vendas) só chegam nas próximas features — o mecanismo é entregue
  testado, como foi feito com os guards de RBAC na Fase 2a antes de existir rota restrita.
### Critério de aceite
- `npm test` verde em ambos (`apps/api`: 47, `apps/web`: 31) e `npm run build`/`lint` limpos.
- Validado ponta a ponta via `docker compose`: login completo pela UI num Chrome headless
  real exibindo o banner "Período de teste — 7 dias restantes · 0/50 inserções usadas".

## [Login e multiempresa (frontend)] - 2026-07-22
### Adicionado
- Tela de login em dois passos: identificação da empresa (detecção automática por
  subdomínio via `VITE_BASE_DOMAIN`, com fallback manual de slug) e depois e-mail/senha.
- Tela de seleção de loja (`/selecionar-loja`), para usuários com acesso a mais de uma
  loja — login já entra direto quando só há uma.
- Home autenticada (placeholder): saudação, loja/perfil ativos, botão de sair. Base para as
  próximas features (frente de caixa, estoque, caixa) entrarem atrás da mesma rota protegida.
- Sessão restaurada automaticamente após F5 (`SessionBootstrap`, via `/auth/refresh`), já
  que o access token vive só em memória (decisão da Fase 2a contra XSS).
- Infra de app: React Router (rotas públicas/protegidas), Zustand (`authStore`), TanStack
  Query (mutations de login/logout/trocar-loja), Axios com interceptor de header
  `Authorization` + retry automático em 401 via refresh (uma renovação por vez).
- 24 testes de frontend (subdomínio, authStore, fluxo completo do LoginPage).
### Decisões técnicas
- Cliente HTTP: Axios (troca do wrapper `fetch` inicialmente cogitado, a pedido do usuário).
- **Correção de bug da Fase 0**: `VITE_API_URL` estava como env de *runtime* do container
  `web` no `docker-compose.yml`, mas o build do Vite é estático — isso nunca teve efeito
  algum. Corrigido para build arg (`args:` no compose + `ARG`/`ENV` no Dockerfile), mesmo
  tratamento dado a `VITE_BASE_DOMAIN`.
- **Ajuste de backend da Fase 2a**: `POST /auth/refresh` passou a devolver o mesmo formato do
  login (`usuario`, `lojas`, `lojaAtivaId`), não só o token — o bootstrap de sessão no front
  precisa dessa informação para reconstruir a UI após um F5, e antes só existia a Fase 2a
  tinha isso disponível via login. Testes do backend atualizados (33 passam).
- Detecção de subdomínio compara contra um domínio-base configurado (`VITE_BASE_DOMAIN`) em
  vez de tentar inferir a estrutura de qualquer TLD — heurística por contagem de labels
  quebra com TLDs compostos como `.com.br`, pego por teste antes de ir pra produção.
- Sem `react-hook-form`/`zod` por ora: formulário de login é pequeno o bastante para
  `useState` simples: reavaliar quando cadastro de produto (formulário maior) chegar.
### Critério de aceite
- `npm run build`, `npm test` e `npm run lint` verdes em `apps/web` e `apps/api`.
- Validado ponta a ponta via `docker compose` completo: CORS + cookie httpOnly checados com
  `curl` simulando um browser (Origin cross-port), e renderização real via Chrome headless
  confirmando o redirecionamento para `/login` e o formulário renderizado.

## [Design system] - 2026-07-22
### Adicionado
- Tokens de tema em `apps/web/src/index.css`: azul Fluent (`#0F6CBD`/`#479EF5`) como cor
  primária sobre a base neutra shadcn "Nova", mais `--success`/`--warning` (semânticas de
  sucesso/alerta; erro já existia via `--destructive`), light e dark.
- Primitivos shadcn instalados: `input`, `label`, `card`, `dialog`, `table`, `badge`,
  `skeleton`, `separator`, `sonner` (toasts), `tooltip`, `sidebar`.
- Padrões de estado reutilizáveis em `apps/web/src/components/estado/`: `EstadoCarregando`,
  `EstadoVazio`, `EstadoErro`; sucesso via `toast.success()` (sonner), já conectado no root
  junto com `TooltipProvider`.
- `apps/web/src/lib/format.ts`: `formatarBRL` e `formatarQuantidade` — helpers centrais para
  valores em R$ (com `tabular-nums`) e quantidade (unidade vs. peso/volume).
- `packages/shared-types` ganhou seu primeiro conteúdo real (`PerfilAcesso`, `TipoVenda`),
  consumido por `apps/web` como dependência de workspace.
- Vitest + Testing Library configurados em `apps/web`; 6 testes cobrindo `format.ts`.
- Vitrine dos componentes em `apps/web/src/App.tsx` (substituída pela primeira tela real
  na Fase 3) e documento de referência em `docs/08-design-system.md`.
### Decisões técnicas
- Cores semânticas aplicadas via composição de classe (`bg-success/10 text-success`) em vez
  de alterar os componentes gerados pelo shadcn, para não perder compatibilidade com
  `npx shadcn update` no futuro.
- Componentes de produto específicos (teclado numérico, card de venda, gráficos) ficam para
  a feature que os usa (Fase 3) — evita construir UI especulativa sem tela real por trás.
- `--ring` (foco visível) usa a mesma cor primária em vez de cinza genérico, por consistência
  de marca; contraste dos pares cor/texto checado para AA (mín. 4.5:1 texto normal).
### Critério de aceite
- `npm run build`, `npm test` e `npm run lint` verdes em `apps/web`; build também validado
  via `docker compose build web` e `docker compose up` (stack completo).
- Vitrine em `App.tsx` demonstra todas as variantes de botão, card de produto com preço
  formatado, badges semânticas e os 4 padrões de estado.

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
