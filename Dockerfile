FROM node:24-slim AS build

WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source (includes pre-built dev.db from Git LFS)
COPY . .

# Set DATABASE_URL for Prisma
ENV DATABASE_URL="file:./dev.db"

# Generate Prisma client + build Next.js
RUN npx prisma generate
RUN npm run build

# --- Production image ---
FROM node:24-slim AS production

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_URL="file:./dev.db"

# Copy standalone build output
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Copy Prisma client + engine (not included in standalone trace)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy database + schema
COPY --from=build /app/prisma ./prisma

EXPOSE 8080

CMD ["node", "server.js"]
