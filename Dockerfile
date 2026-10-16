# FYNN — whitelabel AI chatplatform
# Build:  docker build -t fynn .
# Run:    docker run -p 3000:3000 -v fynn-data:/app/data --env-file .env fynn

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# build tools voor better-sqlite3 als er geen prebuilt is
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# git voor repo-sync, tools voor better-sqlite3-fallback
RUN apt-get update && apt-get install -y --no-install-recommends git python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./
COPY --from=builder /app/package.json ./

RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3000

# migrate + start; seed optioneel met RUN_SEED=1
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$RUN_SEED\" = \"1\" ]; then npx prisma db seed; fi && node server.js"]
