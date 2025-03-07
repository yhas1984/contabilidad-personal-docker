# Dockerfile actualizado para resolver problemas de Prisma
FROM node:18-alpine AS base

# Instalar dependencias solo necesarias para producción
FROM base AS deps
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci

# Configuración de la aplicación
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generar Prisma Client con los binarios correctos
RUN npx prisma generate

# Construir la aplicación
RUN npm run build

# Configuración de producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Copiar archivos necesarios
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Crear directorios necesarios y establecer permisos
RUN mkdir -p /app/public/pdfs /app/.next/cache && \
    chown -R node:node /app

# Establecer el usuario node para evitar problemas de permisos
USER node

# Comando para iniciar la aplicación
CMD ["node", "server.js"]

