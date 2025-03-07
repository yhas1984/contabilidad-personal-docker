#!/bin/bash
set -e

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Diagnóstico de Tu Envío Express ===${NC}"
echo "Este script verificará y solucionará problemas comunes."
echo ""

# Verificar si Docker está en ejecución
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker no está en ejecución o no tienes permisos.${NC}"
    echo "Por favor, inicia Docker y asegúrate de tener los permisos necesarios."
    exit 1
fi

# Verificar si los contenedores están en ejecución
APP_CONTAINER=$(docker compose ps -q app)
DB_CONTAINER=$(docker compose ps -q db)

if [ -z "$APP_CONTAINER" ] || [ -z "$DB_CONTAINER" ]; then
    echo -e "${YELLOW}Algunos contenedores no están en ejecución.${NC}"
    echo "¿Deseas iniciar los contenedores? (s/n)"
    read -r start_containers
    
    if [[ "$start_containers" == "s" ]]; then
        echo -e "${YELLOW}Iniciando contenedores...${NC}"
        docker compose up -d
    else
        echo "Diagnóstico cancelado. Inicia los contenedores primero."
        exit 0
    fi
fi

# Verificar problemas de permisos
echo -e "${YELLOW}Verificando problemas de permisos...${NC}"
PERMISSION_ISSUES=$(docker compose logs app | grep -i "permission denied" | wc -l)

if [ $PERMISSION_ISSUES -gt 0 ]; then
    echo -e "${RED}Se detectaron problemas de permisos.${NC}"
    echo "¿Deseas ejecutar el script de corrección de permisos? (s/n)"
    read -r fix_permissions
    
    if [[ "$fix_permissions" == "s" ]]; then
        ./scripts/fix-permissions.sh
    else
        echo -e "${YELLOW}Puedes ejecutar ./scripts/fix-permissions.sh más tarde para solucionar este problema.${NC}"
    fi
else
    echo -e "${GREEN}No se detectaron problemas de permisos.${NC}"
fi

# Verificar conexión a la base de datos
echo -e "${YELLOW}Verificando conexión a la base de datos...${NC}"
DB_CONNECTION=$(docker exec $APP_CONTAINER npx prisma migrate status 2>&1 | grep -i "error" | wc -l)

if [ $DB_CONNECTION -gt 0 ]; then
    echo -e "${RED}Se detectaron problemas de conexión a la base de datos.${NC}"
    echo "¿Deseas reiniciar la base de datos? (s/n)"
    read -r reset_db
    
    if [[ "$reset_db" == "s" ]]; then
        ./scripts/reset-db.sh
    else
        echo -e "${YELLOW}Puedes ejecutar ./scripts/reset-db.sh más tarde para solucionar este problema.${NC}"
    fi
else
    echo -e "${GREEN}Conexión a la base de datos correcta.${NC}"
fi

# Verificar configuración de Next.js
echo -e "${YELLOW}Verificando configuración de Next.js...${NC}"
NEXT_CONFIG_ISSUES=$(docker compose logs app | grep -i "configuration is deprecated" | wc -l)

if [ $NEXT_CONFIG_ISSUES -gt 0 ]; then
    echo -e "${RED}Se detectaron problemas en la configuración de Next.js.${NC}"
    echo "Por favor, actualiza el archivo next.config.js según las recomendaciones."
else
    echo -e "${GREEN}Configuración de Next.js correcta.${NC}"
fi

# Mostrar información del sistema
echo -e "${YELLOW}Información del sistema:${NC}"
echo -e "Docker: $(docker --version)"
echo -e "Docker Compose: $(docker compose version)"
echo -e "Espacio en disco: $(df -h . | awk 'NR==2 {print $4}') disponible"

# Mostrar puertos en uso
echo -e "${YELLOW}Puertos en uso:${NC}"
APP_PORT=$(grep -oP '(?<=ports:\s*-\s*")[0-9]+(?=:3000")' docker-compose.yml || echo "3001")
DB_PORT=$(grep -oP '(?<=ports:\s*-\s*")[0-9]+(?=:5432")' docker-compose.yml || echo "5433")

echo -e "Aplicación: ${GREEN}$APP_PORT${NC}"
echo -e "Base de datos: ${GREEN}$DB_PORT${NC}"

echo ""
echo -e "${GREEN}Diagnóstico completado.${NC}"
echo -e "Si sigues teniendo problemas, consulta la documentación en la carpeta docs/ o ejecuta ${YELLOW}docker compose logs -f${NC} para ver los logs en tiempo real."

