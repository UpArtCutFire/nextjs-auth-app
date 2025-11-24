# Sistema de Gestión Empresarial - NextJS Auth App

Sistema integral de gestión con autenticación basada en roles, gestión de despachos, verificación de pagos, comisiones y múltiples módulos empresariales.

## Características Principales

### Core
- ✅ **Autenticación NextAuth.js** - Sistema de login con sesiones JWT seguras
- ✅ **Separación de Roles** - Administrador, Vendedor y Despachador
- ✅ **Base de Datos PostgreSQL** - Usando Prisma ORM
- ✅ **CRUD Completo** - Gestión de usuarios con permisos por rol
- ✅ **Dashboard Diferenciado** - Interfaz personalizada según el rol
- ✅ **Integración ERP Externa** - Conexión con sistema ERP para documentos

### Módulos de Despachos
- ✅ **Gestión de Transportes** - Mantenedor CRUD de vehículos y capacidades
- ✅ **Sistema de Despachos** - Creación desde documentos ERP con tipos (Retiro Local, Courier, Despacho)
- ✅ **Planificación Inteligente** - Asignación de fechas, horarios AM/PM y transportes
- ✅ **Monitor en Tiempo Real** - Vista de calendario público sin autenticación
- ✅ **Estados Completos** - PENDING → SCHEDULED → IN_TRANSIT → DELIVERED/CANCELLED
- ✅ **Panel de Despachadores** - Interfaz específica para conductores con evidencia fotográfica
- ✅ **Evidencia Obligatoria** - Fotos de entrega requeridas para completar despachos
- ✅ **Gestión de Sucursales** - Mantenedor completo para puntos de retiro
- ✅ **Equivalencias de Tallas** - Sistema parametrizable de capacidades por puntos

### Módulos de Pagos y Comisiones
- ✅ **Verificación de Pagos** - Sistema de validación con evidencia fotográfica
- ✅ **Totalización por Medio de Pago** - Resumen de efectivo, transferencias y tarjetas
- ✅ **Cálculo de Comisiones** - Sistema automático con descuento de transporte sin IVA
- ✅ **Aprobación de Pagos** - Flujo de revisión y aprobación por administradores
- ✅ **Modal de Detalle** - Vista completa de cálculos y evidencias

### Configuración y Administración
- ✅ **Configuración ERP Dinámica** - Credenciales parametrizables desde panel admin
- ✅ **Datos Geográficos de Chile** - 16 regiones y 347 comunas integradas
- ✅ **Sistema de Monitoreo** - Scripts automáticos de salud y recuperación
- ✅ **UI Moderna** - Construida con Tailwind CSS y componentes Radix UI

## Credenciales de Prueba

### Administrador
- **Email:** john@doe.com
- **Password:** 123123
- **Permisos:** Acceso completo al sistema

### Vendedor
- **Email:** maria@vendedor.com
- **Password:** vendedor123
- **Permisos:** Crear despachos, verificar pagos, ver sus comisiones

### Vendedor Inactivo
- **Email:** carlos@vendedor.com
- **Password:** vendedor456

## Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- Yarn
- PostgreSQL
- Git

### Variables de Entorno (.env)
```env
NODE_ENV="production"
DATABASE_URL="postgresql://Underoath:Tb4a872z-Tb4a872z-@localhost:5432/auth_app"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="Cotarola1988--"
```

### Instalación Local

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd nextjs-auth-app
```

2. **Instalar dependencias**
```bash
yarn install
```

3. **Configurar base de datos**
```bash
npx prisma generate
npx prisma db push
```

4. **Ejecutar seeds iniciales (si es necesario)**
```bash
npx tsx scripts/seed-branches.ts
npx tsx scripts/seed-size-equivalences.ts
npx tsx scripts/seed-erp-config.ts
```

5. **Ejecutar aplicación**
```bash
yarn dev
```

La aplicación estará disponible en `http://localhost:3000`

### Comandos de Construcción

```bash
# Desarrollo
yarn dev

# Construcción para producción
yarn build
yarn start

# Verificación de tipos
npx tsc --noEmit

# Linting
yarn lint
```

## Funcionalidades por Rol

### Administrador
- ✅ Dashboard con estadísticas del sistema
- ✅ Gestión completa de usuarios (CRUD)
- ✅ Planificación de despachos con calendario
- ✅ Revisión de evidencias fotográficas de entrega
- ✅ Aprobación/rechazo de verificaciones de pago
- ✅ Vista de todas las comisiones
- ✅ Configuración de conexión ERP
- ✅ Gestión de sucursales y transportes
- ✅ Configuración de equivalencias de tallas
- ✅ Reinicio de despachos a estado inicial

### Vendedor
- ✅ Dashboard personal con métricas
- ✅ Creación y edición de despachos desde documentos ERP
- ✅ Verificación de pagos con evidencia fotográfica
- ✅ Vista de sus propias comisiones
- ✅ Acceso a documentos ERP filtrados por código
- ✅ Totalización de pagos por medio de pago

### Despachador
- ✅ Panel específico de despachos asignados
- ✅ Inicio de rutas de entrega
- ✅ Carga obligatoria de fotos de evidencia
- ✅ Completar entregas con comentarios
- ✅ Vista filtrada por transporte/camión

## API Endpoints

### Autenticación
- `POST /api/auth/signin` - Iniciar sesión
- `POST /api/auth/signout` - Cerrar sesión
- `GET /api/auth/session` - Obtener sesión actual

### Usuarios
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/[id]` - Actualizar usuario
- `DELETE /api/users/[id]` - Eliminar usuario
- `GET /api/users/vendors` - Listar vendedores activos

### Despachos
- `GET /api/dispatches` - Listar despachos
- `POST /api/dispatches` - Crear despacho
- `PUT /api/dispatches/[id]` - Actualizar despacho
- `POST /api/dispatches/plan` - Planificar despacho
- `POST /api/dispatches/[id]/start` - Iniciar despacho
- `POST /api/dispatches/complete` - Completar con fotos
- `POST /api/dispatches/reset` - Reiniciar a PENDING
- `GET /api/dispatches/monitor` - Monitor público (sin auth)
- `GET /api/dispatches/driver` - Despachos del conductor
- `POST /api/dispatches/export-pdf` - Exportar a PDF

### Transportes
- `GET /api/transports` - Listar transportes
- `POST /api/transports` - Crear transporte
- `PUT /api/transports` - Actualizar transporte
- `DELETE /api/transports` - Eliminar transporte
- `GET /api/transports/config` - Obtener configuración

### Sucursales
- `GET /api/branches` - Listar sucursales activas
- `POST /api/branches` - Crear sucursal
- `PUT /api/branches` - Actualizar sucursal
- `DELETE /api/branches` - Eliminar sucursal

### Verificación de Pagos
- `GET /api/payment-verifications` - Listar verificaciones
- `POST /api/payment-verifications` - Crear verificación
- `GET /api/payment-verifications/[id]` - Obtener detalle
- `POST /api/payment-verification/details` - Detalles de pago
- `GET /api/payment-consolidation` - Consolidación de pagos

### Comisiones
- `GET /api/dashboard/cotizaciones-stats` - Estadísticas de comisiones

### ERP
- `POST /api/erp/auth` - Autenticación ERP
- `GET /api/erp/documents` - Obtener documentos
- `GET /api/erp/session` - Sesión ERP
- `GET /api/erp-credentials` - Obtener credenciales
- `POST /api/erp-config` - Configurar conexión

### Sistema
- `GET /api/health` - Health check
- `GET /api/dashboard/stats` - Estadísticas generales
- `GET /api/dashboard/user-info` - Información del usuario
- `GET /api/size-equivalences` - Obtener equivalencias de tallas
- `PUT /api/size-equivalences` - Actualizar equivalencias

## Estructura del Proyecto

```
nextjs-auth-app/
├── app/                          # Aplicación Next.js
│   ├── admin/                   # Páginas de administración
│   ├── api/                     # API routes
│   ├── comisiones/              # Módulo de comisiones
│   ├── components/              # Componentes React
│   │   ├── ui/                  # Componentes base UI
│   │   └── dashboard-layout.tsx # Layout principal con menús
│   ├── dashboard/               # Dashboard principal
│   ├── dashboard-despachos/     # Dashboard de despachos
│   ├── despachadores/           # Panel de despachadores
│   ├── documentos/              # Documentos ERP
│   ├── equivalencias-tallas/    # Configuración de tallas
│   ├── lib/                     # Utilidades y helpers
│   ├── login/                   # Página de login
│   ├── monitor-despachos/       # Monitor público
│   ├── plan-despachos/          # Planificación de despachos
│   ├── sucursales/              # Gestión de sucursales
│   ├── transportes/             # Gestión de transportes
│   └── verificacion-pagos/      # Verificación de pagos
├── prisma/                      # Schema de base de datos
│   └── schema.prisma            # Modelos de datos
├── scripts/                     # Scripts de utilidad
│   ├── seed-branches.ts         # Seed de sucursales
│   ├── seed-erp-config.ts       # Seed de config ERP
│   └── seed-size-equivalences.ts # Seed de equivalencias
├── public/                      # Archivos estáticos
├── Dockerfile                   # Configuración Docker
├── docker-compose.yml          # Orquestación Docker
├── start-app.sh                # Script de inicio
├── stop-app.sh                 # Script de detención
├── monitor.sh                  # Script de monitoreo
├── health-check.sh             # Script de health check
├── CLAUDE.md                   # Documentación técnica detallada
└── README.md                   # Esta documentación
```

## Arquitectura Técnica

### Frontend
- **Next.js 14** - App Router con Server Components
- **React 18** - Componentes server y client
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos utilitarios
- **Radix UI** - Componentes accesibles
- **Lucide React** - Iconografía moderna

### Backend
- **NextAuth.js** - Autenticación y sesiones JWT
- **Prisma ORM** - Manejo de base de datos
- **PostgreSQL** - Base de datos relacional
- **bcryptjs** - Hash de contraseñas
- **API Routes** - Endpoints RESTful

### Infraestructura
- **Docker** - Contenedorización
- **SystemD** - Gestión de servicios
- **Nginx** - Proxy reverso (opcional)
- **Yarn** - Gestión de dependencias

## Modelos de Base de Datos Principales

### User
- Gestión de usuarios con roles y permisos
- Campos de vendedor: código, comisión base, porcentaje

### Dispatch
- Sistema completo de despachos
- Estados: PENDING, SCHEDULED, IN_TRANSIT, DELIVERED, CANCELLED
- Tipos: RETIRO_LOCAL, COURIER, DESPACHO
- Relaciones con Transport, Branch, User

### Transport
- Vehículos y capacidades
- Sistema de puntos para capacidad total
- Límites por horario AM/PM

### Branch
- Sucursales para retiro y despacho
- Información de contacto y dirección

### PaymentVerification
- Verificaciones con evidencia fotográfica
- Estados de aprobación/rechazo
- Relación con documentos ERP

### SizeEquivalence
- Equivalencias parametrizables de tallas
- Sistema de puntos flexible

### ERPConfig
- Configuración dinámica de conexión ERP
- Credenciales encriptadas

## Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Sesiones JWT seguras con secret
- ✅ Middleware de autorización por rol
- ✅ Validación de permisos en API
- ✅ Protección CSRF integrada
- ✅ Variables de entorno para secretos
- ✅ Validaciones en frontend y backend
- ✅ Sanitización de inputs

## Monitoreo y Mantenimiento

### Scripts de Sistema
- `start-app.sh` - Inicio automático con verificación de build
- `stop-app.sh` - Detención segura del servicio
- `monitor.sh` - Monitoreo continuo de salud
- `health-check.sh` - Verificación de estado HTTP

### Comandos Útiles
```bash
# Ver estado del servicio
systemctl status nextjs-auth-app

# Ver logs en tiempo real
journalctl -u nextjs-auth-app -f
tail -f /var/log/nextjs-auth-app.log

# Verificar puerto
ss -tlnp | grep :3000

# Reiniciar servicio
systemctl restart nextjs-auth-app
```

### Solución de Problemas Comunes

**Aplicación no inicia:**
```bash
# Detener servicios conflictivos
systemctl stop nextjs-auth-app
pkill -f monitor.sh

# Reconstruir aplicación
rm -rf .next
yarn build
yarn dev
```

**Error de BUILD_ID:**
```bash
# Verificar y regenerar build
ls -la .next/BUILD_ID
yarn build
```

## Características Avanzadas

### Sistema de Estados de Despacho
```
PENDING → SCHEDULED → IN_TRANSIT → DELIVERED
    ↓         ↓           ↓           
CANCELLED  CANCELLED   CANCELLED    
```

### Flujo de Verificación de Pagos
1. Vendedor crea verificación con foto
2. Sistema totaliza por medio de pago
3. Administrador revisa y aprueba/rechaza
4. Registro de auditoría completo

### Cálculo de Comisiones
- Base: Monto Neto - (Flete Bruto ÷ 1.19)
- Comisión: (Base × % comisión) + comisión base
- Considera transporte/flete sin IVA

## Roadmap y Mejoras Futuras

- 🔄 Integración con múltiples sistemas ERP
- 🔄 Aplicación móvil para despachadores
- 🔄 Sistema de notificaciones push
- 🔄 Reportes avanzados y analytics
- 🔄 Integración con sistemas de tracking GPS
- 🔄 API pública para integraciones externas
- 🔄 Sistema de facturación electrónica
- 🔄 Multi-tenancy para múltiples empresas

## Solución de Problemas Recientes

### Monitor de Despachos no muestra despachos del día actual (08-09-2025)

**Problema identificado:**
- El monitor de despachos estaba configurado para mostrar la semana anterior por defecto
- Los despachos programados para el día actual no aparecían en el calendario

**Solución aplicada:**
1. Se modificó `/app/monitor-despachos/page.tsx` línea 117 para mostrar la semana actual
2. Se cambió de `setCurrentWeekStart(previousWeek)` a `setCurrentWeekStart(currentWeek)`
3. Se agregaron directivas para evitar cache en la API del monitor
4. Se corrigió error de TypeScript en la verificación de `scheduledDate`

**Archivos modificados:**
- `/app/monitor-despachos/page.tsx` - Cambio de semana por defecto
- `/app/api/dispatches/monitor/route.ts` - Agregadas directivas anti-cache

**Verificación:**
```bash
# Verificar que el despacho aparece en la API
curl -s "http://localhost:3000/api/dispatches/monitor" | \
  python3 -c "import sys, json; data = json.load(sys.stdin); \
  print(f'Total: {len(data)} despachos'); \
  d9328 = [d for d in data if d['documentNumber'] == '9328']; \
  print(f'Despacho 9328: {\"Encontrado\" if d9328 else \"NO encontrado\"}')"
```

## Soporte y Documentación

Para información técnica detallada y registro de cambios, consultar:
- `CLAUDE.md` - Documentación técnica completa y registro de cambios
- `/api/health` - Endpoint de verificación de salud
- Logs del sistema en `/var/log/nextjs-auth-app.log`

---

**Última actualización:** 08 de Septiembre 2025  
**Versión:** 2.0.1  
**Estado:** Producción estable - Problema del monitor resuelto