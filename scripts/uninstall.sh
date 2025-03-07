#!/bin/bash
set -e

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}=== Desinstalación de Tu Envío Express ===${NC}"
echo "Este script eliminará la aplicación y todos sus datos."
echo -e "${YELLOW}¡ADVERTENCIA! Esta acción es irreversible.${NC}"
echo ""

# Preguntar si se desea hacer una copia de seguridad
echo "¿Deseas crear una copia de seguridad antes de desinstalar? (s/n)"
read -r backup_confirm

if [[ "$backup_confirm" == "s" ]]; then
    echo -e "${YELLOW}Creando copia de seguridad...${NC}"
    ./scripts/export-data.sh
    echo -e "${GREEN}Copia de seguridad creada. Puedes encontrarla en la carpeta 'exports/'.${NC}"
    echo "Por favor, guarda esta copia en un lugar seguro antes de continuar."
    echo ""
fi

# Confirmar desinstalación
echo -e "${RED}¿Estás ABSOLUTAMENTE SEGURO de que deseas desinstalar Tu Envío Express?${NC}"
echo "Escribe 'DESINSTALAR' para confirmar:"
read -r confirm

if [[ "$confirm" != "DESINSTALAR" ]]; then
    echo "Desinstalación cancelada."
    exit 0
fi

echo -e "${YELLOW}Deteniendo y eliminando contenedores...${NC}"
docker compose down -v

echo -e "${YELLOW}¿Deseas eliminar también los archivos de la aplicación? (s/n)${NC}"
read -r delete_files

if [[ "$delete_files" == "s" ]]; then
    # Obtener el directorio actual
    CURRENT_DIR=$(pwd)
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "docker-compose.yml" ] || [ ! -d "scripts" ]; then
        echo -e "${RED}Error: No parece que estemos en el directorio de la aplicación.${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Eliminando archivos de la aplicación...${NC}"
    
    # Moverse un directorio arriba
    cd ..
    
    # Obtener el nombre del directorio de la aplicación
    APP_DIR=$(basename "$CURRENT_DIR")
    
    # Eliminar el directorio
    rm -rf "$APP_DIR"
    
    echo -e "${GREEN}Archivos eliminados correctamente.${NC}"
else
    echo -e "${YELLOW}Los archivos de la aplicación se han conservado.${NC}"
    echo "Puedes eliminarlos manualmente más tarde si lo deseas."
fi

echo ""
echo -e "${GREEN}¡Tu Envío Express ha sido desinstalado correctamente!${NC}"

