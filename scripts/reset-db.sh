#!/bin/bash
set -e

echo "⚠️ Este script eliminará todos los datos de la base de datos y reiniciará las migraciones."
echo "⚠️ Asegúrate de tener una copia de seguridad si hay datos importantes."
read -p "¿Estás seguro de que deseas continuar? (s/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "Operación cancelada."
  exit 1
fi

echo "🔄 Deteniendo los contenedores..."
docker compose down

echo "🔄 Eliminando volúmenes de la base de datos..."
docker volume rm contabilidad-docker_postgres_data contabilidad-docker_pdf_storage || true

echo "🔄 Reiniciando los contenedores..."
docker compose up -d

echo "✅ Base de datos reiniciada. Los contenedores están iniciando."
echo "📝 Puedes verificar el estado con: docker compose logs -f"

