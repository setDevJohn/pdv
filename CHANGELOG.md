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
