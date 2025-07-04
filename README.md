
# Sistema de Gestión de Usuarios - NextJS Auth App

Una aplicación Next.js con sistema de autenticación basado en roles, gestión de usuarios y base de datos SQLite.

## Características

- ✅ **Autenticación NextAuth.js** - Sistema de login con sesiones
- ✅ **Separación de Roles** - Administrador y Vendedor
- ✅ **Base de Datos SQLite** - Usando Prisma ORM
- ✅ **CRUD Completo** - Gestión de usuarios (solo administradores)
- ✅ **Dashboard Diferenciado** - Interfaz según el rol del usuario
- ✅ **Contenedor Docker** - Listo para despliegue
- ✅ **UI Moderna** - Construida con Tailwind CSS y Radix UI

## Estructura de la Base de Datos

### Tabla `User`
- `id` - Identificador único
- `nombre` - Nombre del usuario
- `correo` - Correo electrónico (único)
- `rut` - RUT chileno (único)
- `activo` - Estado del usuario (boolean)
- `perfil` - Tipo de usuario (administrador/vendedor)
- `codigo_vendedor` - Código único del vendedor
- `porcentaje_comision` - Porcentaje de comisión (vendedores)
- `comision_base` - Comisión base (vendedores)
- `password` - Contraseña hasheada

## Credenciales de Prueba

### Administrador
- **Email:** john@doe.com
- **Password:** johndoe123

### Vendedor
- **Email:** maria@vendedor.com
- **Password:** vendedor123

### Vendedor Inactivo
- **Email:** carlos@vendedor.com
- **Password:** vendedor456

## Instalación Local

### Prerrequisitos
- Node.js 18+
- Yarn
- Git

### Pasos

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd nextjs-auth-app
```

2. **Instalar dependencias**
```bash
cd app
yarn install
```

3. **Configurar base de datos**
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

4. **Ejecutar aplicación**
```bash
yarn dev
```

La aplicación estará disponible en `http://localhost:3000`

## Despliegue con Docker

### Opción 1: Docker Compose (Recomendado)

```bash
# Construir y ejecutar
docker-compose up --build

# Ejecutar en segundo plano
docker-compose up -d --build
```

### Opción 2: Docker Manual

```bash
# Construir imagen
docker build -t nextjs-auth-app .

# Ejecutar contenedor
docker run -p 3000:3000 \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET=your-secret-key \
  nextjs-auth-app
```

## Funcionalidades por Rol

### Administrador
- ✅ Dashboard con estadísticas del sistema
- ✅ Gestión completa de usuarios (CRUD)
- ✅ Activar/desactivar usuarios
- ✅ Asignar roles y configurar comisiones
- ✅ Ver métricas del sistema

### Vendedor
- ✅ Dashboard personal
- ✅ Visualización de información personal
- ✅ Datos de comisión y código de vendedor
- ✅ Preparado para métricas de ventas futuras

## Arquitectura Técnica

### Frontend
- **Next.js 14** - App Router
- **React 18** - Server y Client Components
- **Tailwind CSS** - Estilos utilitarios
- **Radix UI** - Componentes accesibles
- **Lucide React** - Iconografía

### Backend
- **NextAuth.js** - Autenticación y sesiones
- **Prisma** - ORM y manejo de base de datos
- **bcryptjs** - Hash de contraseñas
- **SQLite** - Base de datos embebida

### Deployment
- **Docker** - Contenedorización
- **Docker Compose** - Orquestación
- **Next.js Standalone** - Build optimizado

## API Endpoints

### Autenticación
- `POST /api/auth/signin` - Iniciar sesión
- `POST /api/auth/signout` - Cerrar sesión

### Usuarios (Solo Administradores)
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/[id]` - Actualizar usuario
- `DELETE /api/users/[id]` - Eliminar usuario

### Dashboard
- `GET /api/dashboard/stats` - Estadísticas (admin)
- `GET /api/dashboard/user-info` - Info del usuario

### Sistema
- `GET /api/health` - Health check

## Estructura del Proyecto

```
nextjs-auth-app/
├── app/                          # Aplicación Next.js
│   ├── app/                      # App Router
│   │   ├── login/               # Página de login
│   │   ├── dashboard/           # Dashboard principal
│   │   ├── admin/users/         # Gestión de usuarios
│   │   └── api/                 # API routes
│   ├── components/              # Componentes React
│   │   ├── ui/                  # Componentes base UI
│   │   ├── dashboard-layout.tsx # Layout principal
│   │   └── providers.tsx        # Providers globales
│   ├── lib/                     # Utilidades
│   ├── prisma/                  # Schema de base de datos
│   └── scripts/                 # Scripts de utilidad
├── Dockerfile                   # Configuración Docker
├── docker-compose.yml          # Orquestación Docker
└── README.md                   # Esta documentación
```

## Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Sesiones JWT seguras
- ✅ Middleware de autorización
- ✅ Validación de roles en API
- ✅ Protección CSRF
- ✅ Variables de entorno para secretos

## Futuras Mejoras

- 🔄 Integración con API externa de ventas
- 🔄 Métricas y reportes avanzados
- 🔄 Notificaciones en tiempo real
- 🔄 Exportación de datos
- 🔄 Logs de auditoría
- 🔄 Backup automático de base de datos

## Soporte

Para problemas o consultas sobre la aplicación, por favor contacte al equipo de desarrollo.

---

**Última actualización:** Enero 2025
**Versión:** 1.0.0
