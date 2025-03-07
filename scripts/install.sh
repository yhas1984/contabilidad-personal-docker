#!/bin/bash
set -e

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Instalación de Tu Envío Express - Aplicación de Contabilidad ===${NC}"
echo "Este script configurará la aplicación en tu sistema."
echo ""

# Verificar requisitos
echo -e "${YELLOW}Verificando requisitos...${NC}"

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker no está instalado.${NC}"
    echo "Por favor, instala Docker antes de continuar:"
    echo "https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose no está instalado.${NC}"
    echo "Por favor, instala Docker Compose antes de continuar:"
    echo "https://docs.docker.com/compose/install/"
    exit 1
fi

# Verificar Git (solo si se clonó el repositorio)
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}Advertencia: Git no está instalado.${NC}"
    echo "No es necesario para la instalación, pero sí para actualizaciones futuras."
fi

echo -e "${GREEN}✓ Todos los requisitos están instalados.${NC}"

# Verificar si estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ] || [ ! -d "scripts" ]; then
    echo -e "${RED}Error: No parece que estemos en el directorio correcto.${NC}"
    echo "Este script debe ejecutarse desde el directorio raíz del proyecto."
    echo "Por favor, navega al directorio donde clonaste el repositorio."
    exit 1
fi

# Configurar la aplicación
echo -e "${YELLOW}Configurando la aplicación...${NC}"

# Verificar si el archivo .env existe
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creando archivo de configuración .env...${NC}"
    cat > .env << EOL
# Configuración de la aplicación
NODE_ENV=production

# Configuración de la base de datos
DATABASE_URL=postgresql://postgres:postgres@db:5432/contabilidad?schema=public
EOL
    echo -e "${GREEN}✓ Archivo .env creado.${NC}"
else
    echo -e "${GREEN}✓ Archivo .env ya existe.${NC}"
fi

# Verificar si los directorios necesarios existen
echo -e "${YELLOW}Verificando directorios...${NC}"
mkdir -p public/pdfs
mkdir -p exports

# Verificar si node_modules existe
if [ ! -d "node_modules" ] && [ -f "package.json" ]; then
    echo -e "${YELLOW}Instalando dependencias...${NC}"
    npm ci
    echo -e "${GREEN}✓ Dependencias instaladas.${NC}"
else
    echo -e "${GREEN}✓ Dependencias ya instaladas.${NC}"
fi

# Verificar permisos de Prisma
echo -e "${YELLOW}Verificando configuración de Prisma...${NC}"
if ! grep -q "linux-musl-openssl-3.0.x" prisma/schema.prisma 2>/dev/null; then
    echo -e "${YELLOW}Configurando Prisma para Docker...${NC}"
    ./scripts/fix-prisma.sh
else
    echo -e "${GREEN}✓ Prisma ya está configurado correctamente.${NC}"
fi

# Construir e iniciar los contenedores
echo -e "${YELLOW}Construyendo e iniciando los contenedores...${NC}"
docker compose up -d --build

# Verificar si los contenedores están en ejecución
if [ "$(docker compose ps -q | wc -l)" -ge 2 ]; then
    echo -e "${GREEN}✓ Contenedores iniciados correctamente.${NC}"
else
    echo -e "${RED}Error al iniciar los contenedores.${NC}"
    echo -e "Verificando logs..."
    docker compose logs
    exit 1
fi

# Obtener la URL de la aplicación
APP_PORT=$(grep -oP '(?<=ports:\s*-\s*")[0-9]+(?=:3000")' docker-compose.yml || echo "3001")
APP_URL="http://localhost:$APP_PORT"

echo ""
echo -e "${GREEN}¡Instalación completada correctamente!${NC}"
echo -e "La aplicación está disponible en: ${BLUE}$APP_URL${NC}"
echo ""
echo -e "${YELLOW}Información útil:${NC}"
echo "- Para ver los logs: docker compose logs -f"
echo "- Para detener la aplicación: docker compose down"
echo "- Para reiniciar la aplicación: docker compose restart"
echo "- Para actualizar la aplicación: ./scripts/update.sh"
echo "- Para solucionar problemas: ./scripts/troubleshoot.sh"
echo ""
echo -e "${GREEN}¡Gracias por instalar Tu Envío Express!${NC}"

