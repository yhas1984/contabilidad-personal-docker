#!/bin/bash
set -e

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Actualización de Tu Envío Express ===${NC}"
echo "Este script actualizará la aplicación a la última versión."
echo ""

# Verificar si estamos en un repositorio git
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: No se encontró un repositorio Git.${NC}"
    echo "Este script solo funciona si instalaste la aplicación clonando el repositorio Git."
    exit 1
fi

# Verificar cambios locales
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}¡Advertencia! Tienes cambios locales no guardados.${NC}"
    echo "Se recomienda hacer una copia de seguridad antes de continuar."
    echo "¿Deseas crear una copia de seguridad de tus datos? (s/n)"
    read -r backup_confirm
    
    if [[ "$backup_confirm" == "s" ]]; then
        echo -e "${YELLOW}Creando copia de seguridad...${NC}"
        ./scripts/export-data.sh
    fi
    
    echo "¿Deseas continuar con la actualización? (s/n)"
    read -r continue_update
    
    if [[ "$continue_update" != "s" ]]; then
        echo "Actualización cancelada."
        exit 0
    fi
fi

# Obtener la versión actual
CURRENT_VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "desconocida")
echo -e "Versión actual: ${YELLOW}$CURRENT_VERSION${NC}"

# Guardar la configuración actual
echo -e "${YELLOW}Guardando configuración actual...${NC}"
if [ -f ".env" ]; then
    cp .env .env.backup
fi

# Obtener la última versión
echo -e "${YELLOW}Obteniendo la última versión...${NC}"
git fetch --tags
git pull

# Obtener la nueva versión
NEW_VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "desconocida")
echo -e "Nueva versión: ${GREEN}$NEW_VERSION${NC}"

# Restaurar configuración
echo -e "${YELLOW}Restaurando configuración...${NC}"
if [ -f ".env.backup" ]; then
    cp .env.backup .env
    rm .env.backup
fi

# Reconstruir e iniciar contenedores
echo -e "${YELLOW}Reconstruyendo e iniciando contenedores...${NC}"
docker compose down
docker compose up -d --build

# Verificar si los contenedores están en ejecución
if [ "$(docker compose ps -q | wc -l)" -ge 2 ]; then
    echo -e "${GREEN}¡Actualización completada correctamente!${NC}"
    echo -e "La aplicación ha sido actualizada de ${YELLOW}$CURRENT_VERSION${NC} a ${GREEN}$NEW_VERSION${NC}"
else
    echo -e "${RED}Error al iniciar la aplicación después de la actualización.${NC}"
    echo -e "Verificando logs..."
    docker compose logs
    exit 1
fi

echo ""
echo -e "${YELLOW}Notas de la versión:${NC}"
if [ "$CURRENT_VERSION" != "$NEW_VERSION" ] && [ "$CURRENT_VERSION" != "desconocida" ] && [ "$NEW_VERSION" != "desconocida" ]; then
    git log --pretty=format:"- %s" $CURRENT_VERSION..$NEW_VERSION | head -n 10
    COMMIT_COUNT=$(git log --oneline $CURRENT_VERSION..$NEW_VERSION | wc -l)
    if [ $COMMIT_COUNT -gt 10 ]; then
        echo -e "${YELLOW}... y $(($COMMIT_COUNT - 10)) cambios más.${NC}"
    fi
else
    echo "No hay información disponible sobre los cambios."
fi

echo ""
echo -e "${GREEN}¡Tu Envío Express ha sido actualizado correctamente!${NC}"

