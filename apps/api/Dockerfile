# Dockerfile — apps/api (NestJS + Prisma)
# Build context: raiz do monorepo (ver docker-compose.yml) — usa npm workspaces,
# por isso o package-lock.json e os package.json dos outros workspaces entram na
# etapa de deps para o `npm ci` resolver corretamente.

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run db:generate --workspace=apps/api
RUN npm run build --workspace=apps/api
RUN npm prune --omit=dev

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
