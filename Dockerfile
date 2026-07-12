FROM node:22-alpine AS build
WORKDIR /app

# Vite/TS build needs more heap on small VPS (Coolify)
ENV NODE_OPTIONS=--max-old-space-size=3072

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run typecheck && npm run build \
  && mkdir -p dist/downloads \
  && cp -f public/downloads/*.exe dist/downloads/ 2>/dev/null || true
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server ./server
COPY scripts ./scripts

EXPOSE 3000
CMD ["node", "server/index.mjs"]
