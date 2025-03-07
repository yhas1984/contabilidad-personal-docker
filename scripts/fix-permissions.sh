#!/bin/bash
set -e

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Corrigiendo permisos de la aplicación ===${NC}"

# Detener los contenedores
echo -e "${YELLOW}Deteniendo contenedores...${NC}"
docker compose down

# Crear un volumen temporal para la caché si no existe
echo -e "${YELLOW}Creando volumen para la caché...${NC}"
docker volume create contabilidad-docker_next_cache 2>/dev/null || true

# Modificar el Dockerfile para usar el usuario node
echo -e "${YELLOW}Verificando Dockerfile...${NC}"
if grep -q "USER node" Dockerfile; then
    echo -e "${GREEN}El Dockerfile ya está configurado correctamente.${NC}"
else
    echo -e "${YELLOW}Actualizando Dockerfile...${NC}"
    # Hacer una copia de seguridad del Dockerfile original
    cp Dockerfile Dockerfile.bak
    
    # Añadir la línea USER node antes de CMD
    sed -i '/CMD/i USER node' Dockerfile
    
    echo -e "${GREEN}Dockerfile actualizado.${NC}"
fi

# Reiniciar los contenedores
echo -e "${YELLOW}Reiniciando contenedores...${NC}"
docker compose up -d --build

echo -e "${GREEN}¡Permisos corregidos!${NC}"
echo -e "La aplicación debería funcionar correctamente ahora."
echo -e "Puedes verificar los logs con: ${YELLOW}docker compose logs -f${NC}"

