#!/bin/bash
set -e

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Corrigiendo configuración de Prisma ===${NC}"

# Verificar si el archivo schema.prisma existe
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${RED}Error: No se encontró el archivo prisma/schema.prisma${NC}"
    exit 1
fi

# Verificar si ya tiene la configuración correcta
if grep -q "linux-musl-openssl-3.0.x" prisma/schema.prisma; then
    echo -e "${GREEN}El archivo schema.prisma ya tiene la configuración correcta.${NC}"
else
    echo -e "${YELLOW}Actualizando schema.prisma...${NC}"
    # Hacer una copia de seguridad
    cp prisma/schema.prisma prisma/schema.prisma.bak
    
    # Actualizar el archivo
    sed -i 's/provider *= *"prisma-client-js"/provider = "prisma-client-js"\n  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]/' prisma/schema.prisma
    
    echo -e "${GREEN}Archivo schema.prisma actualizado.${NC}"
fi

# Detener los contenedores
echo -e "${YELLOW}Deteniendo contenedores...${NC}"
docker compose down

# Modificar el Dockerfile para regenerar Prisma
echo -e "${YELLOW}Actualizando Dockerfile...${NC}"
if grep -q "RUN npx prisma generate" Dockerfile; then
    echo -e "${GREEN}El Dockerfile ya incluye la generación de Prisma.${NC}"
else
    # Hacer una copia de seguridad del Dockerfile original
    cp Dockerfile Dockerfile.bak
    
    # Añadir el comando para generar Prisma antes de la construcción
    sed -i '/RUN npm run build/i RUN npx prisma generate' Dockerfile
    
    echo -e "${GREEN}Dockerfile actualizado.${NC}"
fi

# Reconstruir e iniciar los contenedores
echo -e "${YELLOW}Reconstruyendo e iniciando contenedores...${NC}"
docker compose up -d --build

echo -e "${GREEN}¡Configuración de Prisma corregida!${NC}"
echo -e "La aplicación debería funcionar correctamente ahora."
echo -e "Puedes verificar los logs con: ${YELLOW}docker compose logs -f${NC}"

