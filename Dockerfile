# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js app. Works on x86_64 and arm64
# (e.g. Oracle Cloud Ampere A1), since the base images are multi-arch.

FROM node:22-alpine AS base
WORKDIR /app
# openssl + libc6-compat are needed by Prisma's engines on Alpine.
RUN apk add --no-cache libc6-compat openssl

# ── deps: install all dependencies (incl. dev, needed to build) ──────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── builder: generate Prisma client + build Next.js ─────────────────
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ── runner: minimal runtime image ──────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Carry node_modules so `next start`, `prisma migrate deploy` and the
# seed (tsx) all work at container start.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000
CMD ["./entrypoint.sh"]
