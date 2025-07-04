
#!/bin/bash

# Script de deployment para NextJS Authentication App
# Uso: ./scripts/deploy.sh [development|production]

set -e

ENVIRONMENT=${1:-development}
PROJECT_NAME="nextjs-auth-app"

echo "🚀 Iniciando deployment de $PROJECT_NAME en modo $ENVIRONMENT"

# Verificar que Docker esté ejecutándose
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está ejecutándose. Por favor, inicia Docker."
    exit 1
fi

# Verificar que docker-compose esté disponible
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose no está instalado."
    exit 1
fi

# Limpiar contenedores previos
echo "🧹 Limpiando contenedores previos..."
if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f docker-compose.prod.yml down
else
    docker-compose down
fi

# Limpiar imágenes no utilizadas
echo "🧹 Limpiando imágenes no utilizadas..."
docker image prune -f

# Construir y ejecutar
echo "🏗️ Construyendo y ejecutando aplicación..."
if [ "$ENVIRONMENT" = "production" ]; then
    # Verificar que exista el archivo de configuración de producción
    if [ ! -f .env.production ]; then
        echo "❌ Archivo .env.production no encontrado."
        echo "📋 Copia .env.example a .env.production y configura las variables:"
        echo "   cp .env.example .env.production"
        exit 1
    fi
    
    docker-compose -f docker-compose.prod.yml up -d --build
else
    docker-compose up -d --build
fi

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

# Verificar el estado de los servicios
echo "🔍 Verificando estado de los servicios..."
if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f docker-compose.prod.yml ps
else
    docker-compose ps
fi

# Verificar que la aplicación responda
echo "🔍 Verificando que la aplicación responda..."
for i in {1..10}; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ Aplicación disponible en http://localhost:3000"
        break
    fi
    echo "⏳ Esperando respuesta de la aplicación... ($i/10)"
    sleep 5
done

# Mostrar logs recientes
echo "📋 Logs recientes:"
if [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f docker-compose.prod.yml logs --tail=20
else
    docker-compose logs --tail=20
fi

echo "🎉 Deployment completado exitosamente!"
echo "🌐 Aplicación disponible en: http://localhost:3000"
echo "👤 Credenciales de prueba:"
echo "   Email: john@doe.com"
echo "   Password: johndoe123"

# Mostrar comandos útiles
echo ""
echo "📝 Comandos útiles:"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "   Ver logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "   Detener: docker-compose -f docker-compose.prod.yml down"
    echo "   Reiniciar: docker-compose -f docker-compose.prod.yml restart"
else
    echo "   Ver logs: docker-compose logs -f"
    echo "   Detener: docker-compose down"
    echo "   Reiniciar: docker-compose restart"
fi
