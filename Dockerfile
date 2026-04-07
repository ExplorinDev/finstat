FROM node:24-slim AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source (includes pre-built dev.db from Git LFS)
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Apply any pending migrations
RUN npx prisma migrate deploy

# Build Next.js
RUN npm run build

# --- Production image ---
FROM node:24-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/public ./public
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/next.config.ts ./next.config.ts
COPY --from=base /app/tsconfig.json ./tsconfig.json
COPY --from=base /app/.env ./.env

EXPOSE 8080

CMD ["npm", "start", "--", "-p", "8080"]
