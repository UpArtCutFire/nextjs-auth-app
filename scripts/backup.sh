
#!/bin/bash

# Script de backup para NextJS Authentication App
# Uso: ./scripts/backup.sh [backup_name]

set -e

BACKUP_NAME=${1:-"backup-$(date +%Y%m%d-%H%M%S)"}
BACKUP_DIR="./backups"
PROJECT_NAME="nextjs-auth-app"

echo "💾 Iniciando backup de $PROJECT_NAME"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Backup de la base de datos
echo "🗃️ Creando backup de la base de datos..."
docker-compose exec -T postgres pg_dump -U nextjs_user nextjs_auth_db > "$BACKUP_DIR/$BACKUP_NAME-database.sql"

# Backup de archivos subidos
echo "📁 Creando backup de archivos subidos..."
if [ -d "./uploads" ]; then
    tar -czf "$BACKUP_DIR/$BACKUP_NAME-uploads.tar.gz" -C . uploads/
fi

# Backup de configuración
echo "⚙️ Creando backup de configuración..."
tar -czf "$BACKUP_DIR/$BACKUP_NAME-config.tar.gz" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='*.log' \
    --exclude='backups' \
    .

echo "✅ Backup completado:"
echo "   📊 Base de datos: $BACKUP_DIR/$BACKUP_NAME-database.sql"
echo "   📁 Archivos: $BACKUP_DIR/$BACKUP_NAME-uploads.tar.gz"
echo "   ⚙️ Configuración: $BACKUP_DIR/$BACKUP_NAME-config.tar.gz"
