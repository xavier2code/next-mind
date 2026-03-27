# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ---- Stage 2: Builder ----
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

# Install drizzle-kit for migration generation during build (D-01)
RUN npm install drizzle-kit@0.31.10 --save-dev

# Build Next.js with standalone output (D-05: try Turbopack first)
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ---- Stage 3: Runner ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install postgresql-client for pg_isready (used by docker-entrypoint.sh)
RUN apk add --no-cache postgresql-client

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy migration files and drizzle config for entrypoint (D-01)
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Copy entrypoint script (created by Plan 03)
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Install drizzle-kit for runtime migration (D-01: devDependency, not in standalone)
RUN npm install drizzle-kit@0.31.10

# Create uploads directory (D-10: volume mount target)
RUN mkdir -p /app/data/uploads

# Set ownership for non-root execution
RUN chown nextjs:nodejs /app/data/uploads

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
