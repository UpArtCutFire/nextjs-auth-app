# syntax=docker/dockerfile:1
FROM node:18-alpine AS base
# Instalar dependencias necesarias para Prisma
RUN apk add --no-cache libc6-compat openssl

# Stage de dependencias
FROM base AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json yarn.lock ./

# Configurar yarn con timeouts mas largos
RUN yarn config set network-timeout 600000 && \
    yarn install --frozen-lockfile --network-timeout 600000

# Stage de construccion
FROM base AS builder
WORKDIR /app

# Copiar node_modules del stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar todo el codigo fuente
COPY . .

# Generar cliente Prisma
RUN npx prisma generate --schema=prisma/schema.prisma

# Construir la aplicacion Next.js
RUN yarn build

# Stage de produccion
FROM base AS runner
WORKDIR /app

# Configurar entorno de produccion
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar archivos necesarios para produccion
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Copiar archivos de Prisma
COPY --from=builder /app/prisma ./prisma

# Copiar package.json para scripts
COPY --from=builder /app/package.json ./package.json

# Cambiar al usuario no root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando de inicio
CMD ["npm", "start"]