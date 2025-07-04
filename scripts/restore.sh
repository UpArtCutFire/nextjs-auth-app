
#!/bin/bash

# Script de restore para NextJS Authentication App
# Uso: ./scripts/restore.sh backup_name

set -e

if [ -z "$1" ]; then
    echo "❌ Por favor especifica el nombre del backup a restaurar"
    echo "📋 Uso: ./scripts/restore.sh backup_name"
    echo "📁 Backups disponibles:"
    ls -la backups/ 2>/dev/null | grep -E "\.(sql|tar\.gz)$" | awk '{print $9}' | sort | uniq || echo "   No hay backups disponibles"
    exit 1
fi

BACKUP_NAME=$1
BACKUP_DIR="./backups"
PROJECT_NAME="nextjs-auth-app"

echo "🔄 Iniciando restore de $PROJECT_NAME desde $BACKUP_NAME"

# Verificar que los archivos de backup existen
if [ ! -f "$BACKUP_DIR/$BACKUP_NAME-database.sql" ]; then
    echo "❌ Archivo de backup de base de datos no encontrado: $BACKUP_DIR/$BACKUP_NAME-database.sql"
    exit 1
fi

# Confirmar restauración
echo "⚠️  ADVERTENCIA: Esta operación sobrescribirá los datos actuales."
read -p "¿Continuar? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operación cancelada"
    exit 1
fi

# Detener servicios
echo "🛑 Deteniendo servicios..."
docker-compose down

# Restaurar base de datos
echo "🗃️ Restaurando base de datos..."
docker-compose up -d postgres
sleep 10

# Recrear base de datos
docker-compose exec postgres psql -U nextjs_user -d postgres -c "DROP DATABASE IF EXISTS nextjs_auth_db;"
docker-compose exec postgres psql -U nextjs_user -d postgres -c "CREATE DATABASE nextjs_auth_db;"

# Restaurar datos
docker-compose exec -T postgres psql -U nextjs_user -d nextjs_auth_db < "$BACKUP_DIR/$BACKUP_NAME-database.sql"

# Restaurar archivos subidos
if [ -f "$BACKUP_DIR/$BACKUP_NAME-uploads.tar.gz" ]; then
    echo "📁 Restaurando archivos subidos..."
    tar -xzf "$BACKUP_DIR/$BACKUP_NAME-uploads.tar.gz"
fi

# Iniciar todos los servicios
echo "🚀 Iniciando servicios..."
docker-compose up -d

echo "✅ Restore completado exitosamente!"
echo "🌐 Aplicación disponible en: http://localhost:3000"
