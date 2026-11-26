# syntax=docker.io/docker/dockerfile:1
# "Gioca e impara" tutorial game (Next.js standalone), listens on port 3001.
FROM node:22-alpine AS base

LABEL org.opencontainers.image.source="https://github.com/aamshaegar/realei-potentissimi-ludi"

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public URL of the site (absolute links in social previews), baked in at build time
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# answers checked by /api/check (not public)
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# LLM settings are RUNTIME secrets (never baked into the image):
#   docker run -e LLM7_API_KEY=... -e OPENROUTER_API_KEY=... -e OPENROUTER_MODEL=... -p 3001:3001 <image>
CMD ["node", "server.js"]
