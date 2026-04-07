FROM node:24-slim AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# --- Sync stage: download CSV and populate DB ---
FROM base AS synced

# Create DB and run migration
RUN npx prisma migrate deploy

# Download RES CSV and import into SQLite
RUN npx tsx scripts/sync.ts

# --- Production image ---
FROM node:24-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy built app + node_modules + populated DB
COPY --from=synced /app/.next ./.next
COPY --from=synced /app/node_modules ./node_modules
COPY --from=synced /app/package.json ./package.json
COPY --from=synced /app/public ./public
COPY --from=synced /app/prisma ./prisma
COPY --from=synced /app/next.config.ts ./next.config.ts
COPY --from=synced /app/tsconfig.json ./tsconfig.json
COPY --from=synced /app/.env ./.env

EXPOSE 8080

CMD ["npm", "start", "--", "-p", "8080"]
