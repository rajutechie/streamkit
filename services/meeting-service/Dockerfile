# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S rajutechie-streamkit && \
    adduser -S rajutechie-streamkit -u 1001

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER rajutechie-streamkit

EXPOSE 3014

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3014/health || exit 1

CMD ["node", "dist/index.js"]
