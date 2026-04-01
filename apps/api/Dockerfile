FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

# Build
FROM base AS builder
COPY package.json ./
RUN npm install --ignore-scripts
COPY . .
RUN npm run build

# Runtime
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/migrations ./dist/db/migrations

EXPOSE 3001
CMD ["node", "dist/index.js"]
