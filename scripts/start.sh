#!/bin/bash
set -e

echo "? Esperando a que la base de datos esté lista..."
npx wait-on -t 60000 tcp:db:5432

echo "? Verificando el estado de la base de datos..."
# Intentar resetear la base de datos si hay migraciones fallidas
if npx prisma migrate status | grep -q "failed"; then
  echo "?? Se detectaron migraciones fallidas. Intentando resetear la base de datos..."
  npx prisma migrate reset --force
else
  echo "? Aplicando migraciones existentes..."
  npx prisma migrate deploy
fi

# Regenerar Prisma Client para asegurar compatibilidad
echo "? Regenerando Prisma Client para este entorno..."
npx prisma generate

echo "? Inicializando la base de datos con datos de ejemplo..."
node scripts/init-db.js

echo "? Base de datos configurada correctamente"

echo "? Iniciando la aplicación..."
exec "$@"


