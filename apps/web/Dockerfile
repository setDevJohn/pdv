# Dockerfile — apps/web (React + Tailwind)
# Build context: raiz do monorepo (ver docker-compose.yml) — usa npm workspaces.

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN npm ci

# VITE_* precisa existir no momento do build (Vite embute essas env no bundle
# estático) — env de runtime do container não tem efeito aqui.
FROM deps AS build
ARG VITE_API_URL=http://localhost:3000
ARG VITE_BASE_DOMAIN=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BASE_DOMAIN=$VITE_BASE_DOMAIN
COPY . .
RUN npm run build --workspace=apps/web

FROM nginx:alpine AS runtime
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
