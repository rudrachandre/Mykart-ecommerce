# Stage 1: Build
# Build from the REPOSITORY ROOT so the root-level /prisma schema is in context:
#   docker build -f apps/api/Dockerfile -t mykart-api .
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY apps/api/package*.json ./
COPY apps/api/tsconfig*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

COPY apps/api/src ./src/

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
