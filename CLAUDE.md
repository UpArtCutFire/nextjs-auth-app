# CLAUDE.md - Registro de Deploy y Cambios

## Información del Proyecto
- **Nombre**: NextJS Auth App - Sistema de Gestión de Usuarios y Verificación de Pagos
- **Tecnología**: Next.js 14, React 18, TypeScript, PostgreSQL, Prisma ORM
- **Fecha última actualización**: 2025-11-24

## Cambios Implementados - Sesión 2025-11-24

### 15. Corrección de Carga de Fotos desde Móvil en Panel de Despachadores

**Fecha**: 2025-11-24
**Problema Identificado**: Las fotos no se cargan correctamente desde dispositivos móviles al finalizar despachos
**Archivos Afectados**:
- `app/despachadores/page.tsx`
- `app/api/dispatches/complete/route.ts`

**Diagnóstico del Problema:**
1. ❌ Falta atributo `capture="environment"` para abrir cámara en móviles
2. ❌ Sin validación de tamaño de archivos (fotos móviles pueden ser 3-10MB)
3. ❌ Sin límite de body size en API (Next.js default: 4MB)
4. ❌ Sin preview de fotos seleccionadas
5. ❌ Sin compresión de imágenes del lado del cliente

**Código Original (BACKUP para rollback):**

**Archivo: `app/despachadores/page.tsx` - Líneas 83-87 (estados):**
```tsx
// Modal states
const [photoModalOpen, setPhotoModalOpen] = useState(false);
const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
const [photos, setPhotos] = useState<FileList | null>(null);
const [photoComment, setPhotoComment] = useState('');
```

**Archivo: `app/despachadores/page.tsx` - Líneas 160-198 (handlePhotoUpload):**
```tsx
const handlePhotoUpload = async () => {
  if (!selectedDispatch || !photos) {
    toast.error('Debe seleccionar al menos una foto');
    return;
  }

  try {
    setActionLoading(selectedDispatch.id);
    const formData = new FormData();

    // Agregar todas las fotos
    Array.from(photos).forEach((file, index) => {
      formData.append(`photo${index}`, file);
    });

    formData.append('comment', photoComment);
    formData.append('dispatchId', selectedDispatch.id);
    formData.append('driverId', session?.user?.id || '');

    const response = await fetch('/api/dispatches/complete', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      toast.success('Despacho completado correctamente');
      setPhotoModalOpen(false);
      fetchDispatches();
    } else {
      const error = await response.json();
      toast.error(error.message || 'Error al completar despacho');
    }
  } catch (error) {
    console.error('Error:', error);
    toast.error('Error al completar despacho');
  } finally {
    setActionLoading(null);
  }
};
```

**Archivo: `app/despachadores/page.tsx` - Líneas 493-507 (Input de fotos en modal):**
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Fotos de Evidencia *
  </label>
  <Input
    type="file"
    accept="image/*"
    multiple
    onChange={(e) => setPhotos(e.target.files)}
    className="mb-2"
  />
  <p className="text-xs text-gray-500">
    Puedes seleccionar múltiples fotos como evidencia de la entrega
  </p>
</div>
```

**Archivo: `app/api/dispatches/complete/route.ts` - Sin config de body size**

**Soluciones Implementadas:**

1. **Agregar atributo `capture` para móviles:**
   - Permite abrir cámara trasera directamente en dispositivos móviles

2. **Validación de tamaño de archivos:**
   - Límite de 10MB por foto
   - Mensaje de error claro al usuario

3. **Preview de fotos seleccionadas:**
   - Muestra miniaturas de las fotos antes de enviar
   - Permite eliminar fotos individuales

4. **Configuración de límite en API:**
   - Aumentar límite de body a 50MB para múltiples fotos

**Comandos para Rollback (si hay problemas):**
```bash
# Revertir cambios en despachadores/page.tsx
git checkout HEAD -- app/despachadores/page.tsx

# Revertir cambios en API
git checkout HEAD -- app/api/dispatches/complete/route.ts

# O restaurar desde el código de backup documentado arriba
```

**Verificación Post-Cambio:**
```bash
# Probar desde móvil:
# 1. Ir a /despachadores
# 2. Seleccionar despacho en tránsito
# 3. Click en "Completar Entrega"
# 4. Verificar que se abre la cámara
# 5. Tomar foto y verificar preview
# 6. Completar entrega

# Verificar logs si hay errores:
journalctl -u nextjs-auth-app -f
```

---

## Estado del Deploy

### Configuración Actual
- **URL Local**: http://localhost:3000
- **Base de datos**: PostgreSQL
- **Connection String**: postgresql://Underoath:Tb4a872z-Tb4a872z-@localhost:5432/auth_app
- **Environment**: production (NODE_ENV=production)

### Pasos para Levantar en Desarrollo
1. **Instalar dependencias**:
   ```bash
   yarn install
   ```

2. **Configurar base de datos**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Ejecutar aplicación**:
   ```bash
   yarn dev
   ```

4. **En caso de interferencia del monitor del sistema**:
   ```bash
   # Detener servicios del sistema
   systemctl stop nextjs-auth-app
   pkill -f monitor.sh
   pkill -f start-app.sh
   
   # Ejecutar manualmente
   yarn dev > /tmp/nextjs.log 2>&1 &
   ```

### Variables de Entorno (.env)
```env
NODE_ENV="production"
DATABASE_URL="postgresql://Underoath:Tb4a872z-Tb4a872z-@localhost:5432/auth_app"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="Cotarola1988--"
```

## Cambios Implementados - Sesión 2025-08-31

### 14. Solución de Problema de Estabilidad - Caídas Periódicas

**Fecha**: 2025-08-31
**Problema Identificado**: Aplicación en bucle infinito de reinicios cada 10 segundos
**Causa Raíz**: Falta del archivo `.next/BUILD_ID` necesario para modo producción

**Diagnóstico del Problema:**
- ❌ El directorio `.next` existía pero sin el archivo `BUILD_ID`
- ❌ Script `start-app.sh` solo verificaba existencia del directorio, no del build completo
- ❌ SystemD reiniciaba automáticamente cada 10 segundos (Restart=always, RestartSec=10)
- ❌ Error: "Could not find a production build in the '.next' directory"
- ❌ Contador de reinicios: 22+ intentos continuos

**Soluciones Implementadas:**

1. **Corrección de Errores TypeScript:**
   - ✅ Fixed: `/api/dispatches/export-pdf/route.ts` - Type casting para propiedades jsPDF
   - ✅ Fixed: `/components/ui/planning-modal.tsx` - Actualizado tipo Dispatch.status

2. **Reconstrucción Completa:**
   ```bash
   rm -rf .next
   yarn build  # Build exitoso generando BUILD_ID
   ```

3. **Mejora del Script de Inicio** (`start-app.sh`):
   ```bash
   # ANTES (problemático):
   if [ ! -d ".next" ]; then
       npm run build
   fi
   
   # DESPUÉS (corregido):
   if [ ! -f ".next/BUILD_ID" ]; then
       log "BUILD_ID not found, building application..."
       yarn build
       if [ $? -ne 0 ]; then
           log "Error: Build failed"
           exit 1
       fi
   fi
   ```

4. **Verificación de Estabilidad:**
   - ✅ BUILD_ID generado correctamente
   - ✅ Servicio systemd estable sin reinicios
   - ✅ Aplicación respondiendo HTTP 200 OK
   - ✅ Sin bucles de reinicio

**Comandos de Emergencia para Futuras Caídas:**
```bash
# 1. Detener servicio problemático
systemctl stop nextjs-auth-app
pkill -f monitor.sh

# 2. Reconstruir aplicación
cd /opt/nextjs-auth-app
rm -rf .next
yarn build

# 3. Verificar BUILD_ID existe
ls -la .next/BUILD_ID

# 4. Reiniciar servicio
systemctl start nextjs-auth-app

# 5. Verificar estado
systemctl status nextjs-auth-app
curl -I http://localhost:3000
```

**Monitoreo y Logs:**
```bash
# Ver logs del servicio
journalctl -u nextjs-auth-app -f

# Ver logs de aplicación
tail -f /var/log/nextjs-auth-app.log

# Verificar puerto 3000
ss -tlnp | grep :3000

# Ver procesos Node/Next
ps aux | grep -E "node|next"
```

**Prevención Futura:**
- El script ahora verifica específicamente `BUILD_ID` antes de iniciar
- Manejo de errores en el proceso de build
- Uso consistente de `yarn` en lugar de mezclar `npm` y `yarn`
- Verificación de build completo antes de intentar producción

**Estado Final:** ✅ APLICACIÓN ESTABLE Y FUNCIONANDO

## Cambios Implementados - Sesión 2025-08-30

### 13. Sistema de Estados Avanzado y Revisión de Fotos de Entrega

**Fecha**: 2025-08-30
**Cambios realizados**:
- ✅ Implementado sistema completo de estados de despacho (PENDING, SCHEDULED, IN_TRANSIT, DELIVERED, CANCELLED)
- ✅ Separación de responsabilidades entre Plan de Despachos y Panel de Despachador
- ✅ Solo despachadores pueden completar entregas con evidencia fotográfica obligatoria
- ✅ Administradores pueden revisar fotos de evidencia desde Plan de Despachos
- ✅ Tabs organizados por estados en Plan de Despachos
- ✅ Botón "Reiniciar" para volver despachos al estado inicial
- ✅ Control de transiciones de estado con validaciones estrictas

**Archivos creados/modificados**:

**APIs de Control de Estados:**
- `app/api/dispatches/reset/route.ts` - API para reiniciar despachos a estado PENDING
- `app/api/dispatches/status/route.ts` - API actualizada (restringida a IN_TRANSIT/CANCELLED)
- `app/api/dispatches/[id]/start/route.ts` - API específica para iniciar despachos (despachadores)
- `app/api/dispatches/complete/route.ts` - API específica para completar con fotos (despachadores)
- `app/api/dispatches/driver/route.ts` - API para despachos del conductor
- `app/api/dispatches/list/route.ts` - Actualizada para incluir deliveryPhotos

**Interfaces Actualizadas:**
- `app/plan-despachos/page.tsx` - Sistema de tabs por estados y modal de revisión de fotos
- `app/despachadores/page.tsx` - Panel específico para despachadores con flujo completo
- `app/monitor-despachos/page.tsx` - Actualizado para mostrar todos los estados

**Sistema de Tabs por Estados:**
- **PENDING**: Despachos pendientes de planificación
- **SCHEDULED**: Despachos programados con fecha/horario/transporte
- **IN_TRANSIT**: Despachos iniciados por despachadores
- **DELIVERED**: Despachos completados con evidencia fotográfica
- **CANCELLED**: Despachos cancelados

**Funcionalidades Implementadas:**

**1. Control de Estados y Permisos:**
- **Administradores (Plan de Despachos)**: Planificar, reprogramar, iniciar, reiniciar, cancelar
- **Despachadores (Panel)**: Iniciar y completar entregas con fotos obligatorias
- **Restricción**: Solo despachadores pueden marcar como DELIVERED con evidencia

**2. Botón "Reiniciar":**
- Permite volver cualquier despacho al estado PENDING
- Limpia fecha, horario, transporte, driver y timestamps
- Solo disponible para administradores
- Útil para reprogramación completa

**3. Modal de Revisión de Fotos:**
- Disponible para despachos DELIVERED en Plan de Despachos
- Muestra información completa del despacho y entrega
- Grid responsivo de fotos con timestamps
- Fotos clickeables para vista completa
- Comentarios del despachador si existen
- Contador de fotos en botón "Ver Fotos (N)"

**4. Flujo de Estados Completo:**
```
PENDING → [Admin: Planifica] → SCHEDULED → [Admin/Despachador: Inicia] → IN_TRANSIT → [Solo Despachador: Entrega con fotos] → DELIVERED
    ↑                              ↓                                         ↓
[Admin: Reinicia]            [Admin: Cancela]                     [Admin: Cancela]
                                   ↓                                         ↓
                               CANCELLED ←──────────────────────── CANCELLED
```

**5. Panel de Despachador:**
- Vista de 3 columnas: Programados, En Tránsito, Entregados
- Filtro por transporte/camión
- Botones contextuales según estado
- Modal de subida de fotos obligatorias
- Actualización automática

**Validaciones y Seguridad:**
- Solo despachadores pueden completar entregas
- Fotos obligatorias para marcar como DELIVERED
- Transiciones de estado validadas en backend
- Permisos diferenciados por rol
- APIs específicas para cada tipo de usuario

**Beneficios del Sistema:**
- **Trazabilidad completa**: Todas las entregas tienen evidencia fotográfica
- **Separación de roles**: Admins planifican, despachadores ejecutan
- **Control granular**: Estados específicos para cada fase
- **Transparencia**: Revisión de evidencia desde panel administrativo
- **Flexibilidad**: Reinicio para casos especiales
- **Responsabilidad**: Despachadores responsables de completar entregas

### 12. Mejoras al Sistema de Despachos - Tipos y Sucursales

**Fecha**: 2025-08-30
**Cambios realizados**:
- ✅ Agregado campo "Tipo de Despacho" con opciones: Retiro Local, Courier, Despacho
- ✅ Implementado selector de sucursales para Retiro Local y Despacho
- ✅ Creado mantenedor completo de Sucursales con CRUD para administradores
- ✅ Lógica condicional para campos de dirección según tipo de despacho
- ✅ Para "Retiro Local": NO se solicita dirección, solo sucursal de retiro
- ✅ Para "Courier" y "Despacho": dirección obligatoria + sucursal opcional
- ✅ Reorganización del menú lateral con submenús temáticos colapsibles
- ✅ Validaciones diferenciadas según tipo de despacho seleccionado

**Archivos creados/modificados**:

**Nuevos Modelos:**
- `prisma/schema.prisma` - Modelo Branch (sucursales) y enum DispatchType
- `app/lib/seed-branches.ts` - Datos iniciales para sucursales de ejemplo

**Mantenedor de Sucursales:**
- `app/sucursales/page.tsx` - Interfaz CRUD completa para gestión de sucursales
- `app/api/branches/route.ts` - API completa GET/POST/PUT/DELETE para sucursales
- Solo administradores pueden crear, editar o eliminar sucursales
- Validaciones de nombres únicos y referencias en despachos

**Modal de Despacho Mejorado:**
- `app/components/ui/dispatch-modal.tsx` - Lógica condicional por tipo de despacho
- `app/api/dispatches/route.ts` - Validaciones adaptadas según tipo

**Reorganización del Menú:**
- `app/components/dashboard-layout.tsx` - Submenús colapsibles temáticos:
  - 📦 **Despachos**: Transportes, Sucursales, Plan Despachos, Monitor
  - 💰 **Pagos**: Verificación Pagos, Comisiones  
  - ⚙️ **Administración**: Usuarios, Equivalencias Tallas, Configuración ERP

**Funcionalidades Implementadas:**

**1. Tipos de Despacho:**
- **Retiro Local**: Cliente retira en sucursal - NO requiere dirección
- **Courier**: Envío por servicio externo - requiere dirección completa
- **Despacho**: Envío desde sucursal propia - requiere dirección + sucursal origen

**2. Lógica Condicional Inteligente:**
- **Retiro Local**: Oculta campos dirección/región/comuna, solo muestra sucursal
- **Courier**: Muestra dirección completa, sucursal opcional
- **Despacho**: Muestra dirección completa + sucursal obligatoria
- Validaciones adaptan automáticamente según selección

**3. Sistema de Sucursales:**
- CRUD completo: crear, editar, activar/desactivar sucursales
- Campos: nombre, dirección, teléfono, estado activo
- Protección: no se pueden eliminar sucursales con despachos asociados
- Solo administradores tienen acceso de escritura

**4. Interfaz de Usuario Mejorada:**
- Badge visual "📦 El cliente retirará el pedido en esta sucursal" para Retiro Local
- Campos aparecen/desaparecen dinámicamente según tipo seleccionado
- Validaciones en tiempo real con mensajes claros
- Vista de solo lectura muestra información apropiada según tipo

**5. Menú Reorganizado:**
- Submenús colapsibles por área funcional
- Estados persistentes de expansión/colapso
- Iconos temáticos para cada sección
- Mejor organización lógica de funcionalidades

**Validaciones y Seguridad:**
- Campos obligatorios se adaptan según tipo de despacho
- Verificación de sucursales activas en formularios
- Validaciones tanto en frontend como backend
- Permisos diferenciados: vendedores crean/editan, admins gestionan todo

**APIs Disponibles:**
- `GET /api/branches` - Obtener sucursales activas
- `POST /api/branches` - Crear sucursal (solo admins)
- `PUT /api/branches` - Actualizar sucursal (solo admins)  
- `DELETE /api/branches` - Eliminar sucursal (solo admins, sin despachos asociados)

**Base de Datos Actualizada:**
- Modelo `Branch`: id, nombre, direccion, telefono, activo, timestamps
- Modelo `Dispatch`: agregado tipoDespacho y relación con Branch
- Enum `DispatchType`: RETIRO_LOCAL, COURIER, DESPACHO
- Campos dirección en Dispatch ahora nullable para Retiro Local

**Flujo de Uso:**
1. **Vendedor crea despacho** desde documentos ERP
2. **Selecciona tipo**: Retiro Local, Courier o Despacho
3. **Sistema adapta formulario** según tipo seleccionado
4. **Para Retiro Local**: Solo selecciona sucursal (sin dirección)
5. **Para otros tipos**: Completa dirección + sucursal si aplica
6. **Sistema valida** automáticamente campos requeridos
7. **Despacho se guarda** con configuración apropiada

**Beneficios del Sistema:**
- **Flexibilidad**: Maneja todos los tipos de entrega de la empresa
- **Usabilidad**: Interfaz se adapta dinámicamente al contexto
- **Eficiencia**: No solicita datos innecesarios para cada tipo
- **Consistencia**: Validaciones coherentes y mensajes claros
- **Escalabilidad**: Fácil agregar nuevos tipos o sucursales
- **Organización**: Menú temático mejora la navegación

## Cambios Implementados - Sesión 2025-08-22

### 11. Sistema Parametrizable de Equivalencias de Tallas

**Fecha**: 2025-08-22
**Cambios realizados**:
- ✅ Creado mantenedor completo para equivalencias de tallas
- ✅ Sistema totalmente parametrizable desde interfaz de administración
- ✅ Reemplazado límites fijos por capacidad total en puntos
- ✅ API CRUD completa para gestión de equivalencias
- ✅ Integración dinámica en planificador de despachos
- ✅ Validaciones robustas y mensajes informativos
- ✅ Helper utilities para manejo consistente de equivalencias

**Archivos creados/modificados**:

**Modelos actualizados:**
- `prisma/schema.prisma` - Actualizado modelo Transport (totalCapacity), nuevo modelo SizeEquivalence
- `scripts/seed-size-equivalences.ts` - Script para inicializar equivalencias por defecto

**Mantenedor de Equivalencias:**
- `app/equivalencias-tallas/page.tsx` - Interfaz completa para gestionar equivalencias
- `app/api/size-equivalences/route.ts` - API CRUD para equivalencias (GET/PUT)
- `app/lib/size-equivalences.ts` - Utilities y helpers para manejo de equivalencias

**Sistema actualizado:**
- `app/transportes/page.tsx` - Modal actualizado con campo "Capacidad Total" en puntos
- `app/api/transports/config/route.ts` - API actualizada para manejar totalCapacity
- `app/api/dispatches/plan/route.ts` - Lógica de planificación usando equivalencias dinámicas
- `app/components/ui/planning-modal.tsx` - Modal actualizado con equivalencias dinámicas
- `app/components/dashboard-layout.tsx` - Agregado menú "Equivalencias de Tallas"

**Funcionalidades Implementadas:**

**1. Mantenedor de Equivalencias:**
- Interfaz intuitiva solo para administradores
- Edición individual de cada talla con validaciones
- Vista de equivalencias actuales con timestamps
- Información contextual y recomendaciones
- Validaciones: valores entre 1-50 puntos, sin duplicados

**2. Sistema Parametrizable:**
- **Configurables:** Valor en puntos para cada talla (S, M, L, XL, XXL)
- **Por defecto:** S=1, M=2, L=3, XL=4, XXL=10
- **Flexibilidad total:** Administradores pueden ajustar según necesidades
- **Persistencia:** Cambios guardados en base de datos

**3. Capacidad por Puntos:**
- **Eliminado:** maxDispatchesAM/PM fijos
- **Agregado:** totalCapacity configurable por transporte
- **Lógica:** Suma de puntos por horario no puede exceder capacidad total
- **Ejemplo:** Camión 12 puntos puede llevar: 12×S, 6×M, 4×L, 3×XL, 1×XXL+M

**4. Planificador Inteligente:**
- Calcula puntos requeridos según equivalencias actuales
- Verifica capacidad disponible en tiempo real
- Mensajes detallados de error con información de capacidad
- Prevención de sobrecarga por horario

**5. Interfaz Mejorada:**
- Modal de planificación muestra equivalencias actuales
- Información en tiempo real de puntos requeridos
- Transportes muestran capacidad total "(12p)"
- Feedback visual claro para usuarios

**Validaciones y Seguridad:**
- Solo administradores pueden modificar equivalencias
- Validación de rangos (1-50 puntos)
- Verificación de tallas únicas
- Fallbacks en caso de error de API
- Utilities centralizadas para consistencia

**APIs Disponibles:**
- `GET /api/size-equivalences` - Obtener equivalencias actuales
- `PUT /api/size-equivalences` - Actualizar equivalencias (solo admins)
- Integración transparente con APIs existentes

**Flujo Completo:**
1. **Administrador configura** equivalencias desde mantenedor
2. **Sistema usa** equivalencias para validar planificación
3. **Planificador verifica** capacidad en puntos antes de asignar
4. **Usuario ve** información en tiempo real durante planificación
5. **Sistema previene** sobrecarga automáticamente

**Beneficios del Nuevo Sistema:**
- **Flexibilidad total:** Equivalencias ajustables según realidad operativa
- **Mejor optimización:** Capacidad por puntos más precisa que límites fijos
- **Transparencia:** Usuarios ven claramente los cálculos
- **Escalabilidad:** Fácil ajuste cuando cambien tipos de carga
- **Consistencia:** Utilities centralizadas para toda la aplicación

### 10. Módulo de Planificación y Monitor de Despachos

**Fecha**: 2025-08-22
**Cambios realizados**:
- ✅ Creado módulo completo de Transportes con mantenedor CRUD
- ✅ Desarrollado módulo de Despachos con modal desde documentos ERP
- ✅ Implementado sistema de planificación con fechas y horarios AM/PM
- ✅ Creado Monitor de Despachos con vista de calendario en tiempo real
- ✅ Agregados estados PENDING/SCHEDULED para despachos
- ✅ Implementada vista sin autenticación para monitor público
- ✅ Integrados datos geográficos completos de Chile (16 regiones, 347 comunas)

**Archivos creados/modificados**:

**Modelos y Schema:**
- `prisma/schema.prisma` - Modelos Transport, Dispatch, DispatchStatus, DispatchSize
- `app/lib/chile-data.ts` - Datos completos de regiones y comunas de Chile

**Páginas:**
- `app/transportes/page.tsx` - Mantenedor de transportes
- `app/plan-despachos/page.tsx` - Planificación de despachos (solo admins)
- `app/monitor-despachos/page.tsx` - Monitor calendario sin layout lateral
- `app/documentos/page.tsx` - Agregado botón y modal de despacho

**APIs:**
- `app/api/transports/route.ts` - CRUD completo para transportes
- `app/api/dispatches/route.ts` - CRUD para despachos con permisos por rol
- `app/api/dispatches/list/route.ts` - Lista todos los despachos (solo admins)
- `app/api/dispatches/plan/route.ts` - API para planificar despachos
- `app/api/dispatches/monitor/route.ts` - API pública sin auth para monitor

**Componentes UI:**
- `app/components/ui/dispatch-modal.tsx` - Modal de creación/edición de despachos
- `app/components/ui/planning-modal.tsx` - Modal de planificación con fecha/horario
- `app/components/dashboard-layout.tsx` - Agregados menús Transportes, Plan y Monitor

**Funcionalidades Implementadas:**

**1. Mantenedor de Transportes:**
- CRUD completo: crear, editar, activar/desactivar
- Campos: patente, nombre, talla (S/M/L/XL)
- Validaciones y feedback visual
- Accesible para todos los usuarios

**2. Módulo de Despachos:**
- Modal accesible desde botón "Despacho" en documentos ERP
- Formulario completo con datos de cliente y dirección
- Integración con datos geográficos de Chile
- Tamaños de despacho (S/M/L/XL/XXL)
- Permisos: vendedores crean/editan, admins ven/eliminan

**3. Sistema de Planificación:**
- Estados: PENDING (creado) → SCHEDULED (planificado)
- Selección de fecha (no permite fechas pasadas)
- Horarios AM (Mañana) / PM (Tarde)
- Solo administradores pueden planificar
- Reprogramación disponible

**4. Monitor de Despachos:**
- Vista de calendario sin layout lateral
- Organización por días y turnos (AM/PM)
- Colores diferenciados: azul (AM), naranja (PM)
- Actualización automática cada 30 segundos
- Navegación por semanas (anterior/actual/siguiente)
- Acceso público sin autenticación
- Responsive design

**5. Datos Geográficos:**
- 16 regiones de Chile completas
- 347 comunas organizadas por región
- Helper `getComunasByRegion()` para filtrado
- Datos corregidos (se completó región O'Higgins)

**Permisos y Acceso:**
- **Transportes**: Todos los usuarios (crear, editar, activar/desactivar)
- **Despachos**: Vendedores (crear, editar), Admins (ver, eliminar)
- **Plan Despachos**: Solo administradores
- **Monitor Despachos**: Todos los usuarios autenticados + acceso público

**URLs del Sistema:**
- `/transportes` - Mantenedor de transportes
- `/plan-despachos` - Planificación (solo admins)
- `/monitor-despachos` - Monitor público en tiempo real
- `/documentos` - Documentos ERP (con botón Despacho)

**Base de Datos:**
- Modelo `Transport`: patente, nombre, talla, activo
- Modelo `Dispatch`: documento, cliente, dirección, geografía, tamaño, estado, programación
- Enum `DispatchStatus`: PENDING, SCHEDULED
- Enum `DispatchSize`: S, M, L, XL, XXL

**Flujo Completo:**
1. Vendedor crea despacho desde documentos ERP
2. Despacho queda en estado PENDING
3. Administrador ve despacho en Plan Despachos
4. Administrador asigna fecha y horario → estado SCHEDULED
5. Despacho aparece en Monitor público organizado por día/horario
6. Monitor se actualiza en tiempo real cada 30 segundos

## Cambios Implementados - Sesión 2025-07-24

### 7. Configuración ERP Parametrizable

**Fecha**: 2025-07-24
**Cambios realizados**:
- ✅ Creado modelo ERPConfig en Prisma para almacenar credenciales ERP
- ✅ Agregada sección "Configuración de Conexión ERP" en página de usuarios administrador
- ✅ Creada API `/api/erp-config` para guardar/obtener configuración
- ✅ Creada API `/api/erp-credentials` para obtener credenciales dinámicamente
- ✅ Actualizado todas las páginas para usar credenciales dinámicas en lugar de hardcodeadas
- ✅ Creado helper `getERPCredentials()` que obtiene de BD o usa valores por defecto
- ✅ Insertada configuración inicial en base de datos

**Archivos modificados**:
- `prisma/schema.prisma` - Nuevo modelo ERPConfig
- `app/admin/users/page.tsx` - Agregada sección de configuración ERP
- `app/api/erp-config/route.ts` - Nueva API para gestión de config
- `app/api/erp-credentials/route.ts` - Nueva API para obtener credenciales
- `app/lib/erp-config.ts` - Helper para obtener credenciales
- `app/documentos/page.tsx` - Actualizado para usar credenciales dinámicas
- `app/verificacion-pagos/page.tsx` - Actualizado para usar credenciales dinámicas
- `app/comisiones/page.tsx` - Actualizado para usar credenciales dinámicas
- `app/dashboard/page.tsx` - Actualizado para usar credenciales dinámicas

**Funcionalidad**:
- Los administradores pueden configurar RUT empresa, usuario y contraseña ERP
- Las credenciales se almacenan en la base de datos de forma segura
- Todas las integraciones ERP usan las credenciales configuradas
- Si no hay configuración, se usan valores por defecto
- La configuración es accesible solo para administradores

## Cambios Implementados - Sesión 2025-07-22

### 6. Ajuste de Cálculo de Comisiones para Transporte sin IVA

**Fecha**: 2025-07-22
**Cambios realizados**:
- ✅ Modificado cálculo de comisiones para considerar transporte/flete sin IVA
- ✅ Cuando hay verificación de "transporte", el monto se divide por 1.19 para obtener valor neto
- ✅ El monto neto de transporte se resta del monto neto del documento para calcular la base de comisión
- ✅ Actualizado modal de detalle de comisiones para mostrar la nueva lógica de cálculo
- ✅ Mejoradas las etiquetas del grid para mayor claridad

**Archivos modificados**:
- `app/comisiones/page.tsx`
- `app/components/ui/commission-detail-modal.tsx`

**Funcionalidad**:
- Fórmula actualizada: Base Comisión = Monto Neto - (Flete Bruto ÷ 1.19)
- Comisión = (Base Comisión × % comisión) + comisión base
- El sistema considera tanto "flete" como "transporte" en el cálculo
- Modal de detalle muestra "Monto Neto Ajustado" y "Flete Neto (sin IVA)"
- Logging mejorado para mostrar el desglose del cálculo

### 5. Filtro de Documentos ERP por Vendedor

**Fecha**: 2025-07-22
**Cambios realizados**:
- ✅ Modificada página de documentos ERP para establecer automáticamente el código de vendedor
- ✅ Campo "Código Vendedor" ahora es de solo lectura para vendedores
- ✅ Actualizado botón "Limpiar Filtros" para mantener código de vendedor para vendedores
- ✅ Habilitado filtro por vendedor en la API de documentos ERP
- ✅ Implementado doble filtrado (en parámetros ERP y post-procesamiento) para garantizar seguridad

**Archivos modificados**:
- `app/documentos/page.tsx`
- `app/api/erp/documents/route.ts`

**Funcionalidad**:
- Los vendedores solo ven sus propios documentos ERP
- El campo código vendedor se pre-llena automáticamente para vendedores
- Para vendedores, el campo es de solo lectura con estilo visual diferenciado
- Los administradores mantienen acceso completo a todos los documentos
- Filtrado implementado tanto a nivel de consulta ERP como post-procesamiento

## Cambios Implementados - Sesión 2025-07-16

### 4. Filtro de Fecha y Totalización por Medio de Pago en Verificación de Pagos

**Fecha**: 2025-07-16
**Cambios realizados**:
- ✅ Añadido filtro de fecha con valor por defecto del día actual
- ✅ Creado componente PaymentTotalizationCard para totalizar por medio de pago
- ✅ Implementada lógica para filtrar solo documentos con referencia a factura/boleta
- ✅ Adaptado acceso para vendedores con filtros automáticos por código
- ✅ Totalización muestra montos a recaudar en efectivo, transferencia y webpay/tarjeta
- ✅ Corregido modal de "Revisar Pago" para mostrar campo de monto verificado
- ✅ Deshabilitada acción "Verificar Pago" para administradores (solo vendedores pueden verificar)

**Archivos modificados**:
- `app/verificacion-pagos/page.tsx`
- `app/components/ui/payment-totalization-card.tsx` (nuevo)
- `app/api/payment-verification/route.ts`
- `app/api/payment-verifications/route.ts`
- `app/api/payment-verification/details/route.ts`
- `app/components/ui/payment-detail-modal.tsx`

**Funcionalidad**:
- Filtro de fecha por defecto muestra solo documentos del día actual
- Totalización muestra cuánto debe recaudarse por cada medio de pago
- Solo se totalizan documentos CT/NV con verificación de pago y referencia a factura/boleta
- Los vendedores ven automáticamente solo sus documentos
- Los administradores ven todos los documentos
- El código de vendedor se establece automáticamente y es de solo lectura para vendedores

## Cambios Implementados - Sesión 2025-07-15

### Actualización de Contraseña de Administrador

**Fecha**: 2025-07-15 21:58
**Cambio realizado**: 
- ✅ Cambiada contraseña del usuario administrador (john@doe.com)
- ✅ Nueva contraseña: "123123" (anteriormente "johndoe123")
- ✅ Contraseña hasheada con bcrypt y almacenada en base de datos
- ✅ Actualizado registro en CLAUDE.md

**SQL ejecutado**:
```sql
UPDATE "User" SET password = '$2b$10$DUTNdVxsipc8JXy9e2y70OqMAUPhVjk7kmWX1q5X6XKrm8u4z5NHK' WHERE correo = 'john@doe.com';
```

### 1. Campo de Monto en Modal de Verificación de Pago

**Archivo modificado**: `app/components/ui/payment-verification-modal.tsx`

**Cambios realizados**:
- ✅ Agregado estado `amount` para manejar el monto del pago
- ✅ Implementado useEffect para establecer valor por defecto del monto desde `document.MntTotal`
- ✅ Agregado campo numérico con validación en el formulario
- ✅ Incluido símbolo de peso ($) y texto de monto sugerido
- ✅ Validación tanto en frontend como backend para montos válidos (> 0)
- ✅ Campo incluido en el resetForm()
- ✅ Validación agregada al botón submit

**Funcionalidad**:
- Campo numérico obligatorio que se pre-llena con el monto del documento
- Validación de que sea un número válido mayor a 0
- Muestra el monto sugerido basado en el documento ERP
- Se envía correctamente a la API

### 2. API de Verificación de Pagos - Soporte para Monto

**Archivo modificado**: `app/api/payment-verifications/route.ts`

**Cambios realizados**:
- ✅ Agregado procesamiento del campo `amount` del FormData
- ✅ Validación de monto requerido en la API
- ✅ Validación de que el monto sea un número válido > 0
- ✅ Almacenamiento del monto en la base de datos usando `numericAmount`
- ✅ Actualizado mensaje de error para incluir el campo monto

### 3. Vista de Comisiones Filtrada por Vendedor

**Archivo modificado**: `app/comisiones/page.tsx`

**Cambios realizados**:
- ✅ Modificado estado inicial de filtros para establecer automáticamente el código de vendedor
- ✅ Agregado useEffect para establecer filtro cuando la sesión esté disponible
- ✅ Implementado filtrado de comisiones calculadas según el perfil del usuario
- ✅ Campo "Código Vendedor" ahora es de solo lectura para vendedores
- ✅ Agregado mensaje explicativo para vendedores
- ✅ Modificado botón "Limpiar Filtros" para mantener código de vendedor para vendedores

**Funcionalidad**:
- Los vendedores solo ven sus propias comisiones
- El campo código vendedor se pre-llena automáticamente
- Para vendedores, el campo es de solo lectura con estilo visual diferenciado
- Los administradores mantienen acceso completo a todas las comisiones

## Credenciales de Prueba

### Administrador
- **Email**: john@doe.com
- **Password**: 123123
- **Permisos**: Acceso completo, puede ver todas las comisiones

### Vendedor
- **Email**: maria@vendedor.com
- **Password**: vendedor123
- **Permisos**: Solo puede ver sus propias comisiones

### Vendedor Inactivo
- **Email**: carlos@vendedor.com
- **Password**: vendedor456

## Estructura de Base de Datos

### Modelo PaymentVerification
```prisma
model PaymentVerification {
  id             String                 @id @default(cuid())
  documentNumber String
  documentType   String
  vendorCode     String
  photoUrl       String?
  comment        String
  documentInfo   String
  paymentMethod  PaymentMethod
  userId         String
  status         PaymentStatus          @default(PENDING)
  approvedAt     DateTime?
  approvedBy     String?
  rejectionReason String?
  amount         Float?                 // Campo agregado para monto
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt
  user           User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  approver       User?                  @relation("PaymentApprover", fields: [approvedBy], references: [id])
}
```

## Comandos Útiles

### Para verificar que la aplicación esté funcionando:
```bash
curl -I http://localhost:3000
```

### Para ver logs en tiempo real:
```bash
tail -f /tmp/nextjs.log
```

### Para verificar procesos de Node.js:
```bash
ps aux | grep -E "node|next" | grep -v grep
```

### Para verificar tipos TypeScript:
```bash
npx tsc --noEmit
```

### Para ver puerto 3000:
```bash
lsof -i :3000
```

## Notas Importantes

1. **Monitor del Sistema**: Hay un script monitor (`monitor.sh`) del sistema que puede interferir con el desarrollo. Siempre detenerlo antes de levantar manualmente.

2. **Compilación Inicial**: La primera compilación puede tardar 20-30 segundos. Las siguientes son más rápidas.

3. **Validaciones**: Ambos cambios incluyen validaciones tanto en frontend como backend para garantizar la integridad de los datos.

4. **Filtros Automáticos**: Los vendedores ahora tienen restricciones automáticas que no pueden modificar, mejorando la seguridad.

## Scripts del Proyecto

- `yarn dev`: Inicia servidor de desarrollo
- `yarn build`: Construye para producción  
- `yarn start`: Inicia servidor de producción
- `yarn lint`: Ejecuta linter

## Análisis de Problemas de Estabilidad - 2025-08-30

### 🔍 Problema Principal Identificado: Falta de BUILD_ID

**Fecha de análisis**: 2025-08-30
**Estado actual**: ❌ Aplicación en bucle de reinicio constante

### Causa Raíz
El archivo `BUILD_ID` no se está generando correctamente durante el proceso de construcción, causando que Next.js no pueda iniciar en modo producción.

### Errores Detectados

**1. Error Principal en Logs**:
```
Error: Could not find a production build in the '.next' directory. 
Try building your app with 'next build' before starting the production server.
```

**2. Patrón de Fallos**:
- Servicio systemd reinicia cada 10 segundos
- Counter de reintentos: 27+ intentos detectados
- Directorio `.next` existe pero sin archivo `BUILD_ID`

### Análisis Técnico

**Estado del Directorio `.next`**:
```
✅ Directorio existe: /opt/nextjs-auth-app/.next
✅ Contiene archivos: build-manifest.json, app-build-manifest.json
❌ FALTA: BUILD_ID (archivo crítico para producción)
```

**Problemas Identificados**:
1. **Script start-app.sh**: Línea 40 usa `exec npm start` (modo producción)
2. **Construcción incompleta**: Build se ejecuta pero no genera `BUILD_ID`
3. **Variable de entorno**: `NODE_ENV=production` fuerza modo producción
4. **Reinicio automático**: SystemD configurado con `Restart=always`

### Soluciones Implementadas

**1. Problema del Script de Inicio**:
- **Diagnóstico**: Script intenta `npm start` sin verificar build completo
- **Solución**: Forzar construcción completa antes de iniciar

**2. Configuración SystemD**:
- **Diagnóstico**: Restart muy agresivo (cada 10 segundos)
- **Solución**: Aumentar tiempo de reinicio y timeout

### Recomendaciones de Estabilidad

**1. Comandos de Emergencia (Desarrollo)**:
```bash
# Detener servicio problemático
systemctl stop nextjs-auth-app
pkill -f start-app.sh
pkill -f monitor.sh

# Construcción completa y desarrollo
cd /opt/nextjs-auth-app
yarn install
yarn build  # CRÍTICO: Genera BUILD_ID
yarn dev    # Usar desarrollo hasta estabilizar
```

**2. Construcción para Producción**:
```bash
# Proceso completo necesario
yarn install
rm -rf .next node_modules/.cache
yarn build  # Debe generar BUILD_ID
yarn start  # Solo después de build exitoso
```

**3. Verificación del Build**:
```bash
# Verificar que BUILD_ID existe
ls -la /opt/nextjs-auth-app/.next/BUILD_ID
# Si no existe, el build falló
```

### Configuraciones Mejoradas

**Variables de Entorno Recomendadas**:
```env
NODE_ENV="development"  # Cambiar a development hasta estabilizar
DATABASE_URL="postgresql://Underoath:Tb4a872z-Tb4a872z-@localhost:5432/auth_app"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="Cotarola1988--"
```

**Modificación SystemD Recomendada**:
```ini
[Service]
# Aumentar timeouts para builds largos
TimeoutStartSec=300
RestartSec=30  # Menos agresivo
# Agregar pre-build
ExecStartPre=/bin/bash -c 'cd /opt/nextjs-auth-app && yarn build'
```

### Estado de Monitoreo

**Logs a Revisar**:
- `/var/log/syslog` - Errores de systemd
- `/tmp/nextjs.log` - Errores de aplicación  
- `journalctl -u nextjs-auth-app` - Logs detallados

**Comandos de Monitoreo**:
```bash
# Estado del servicio
systemctl status nextjs-auth-app

# Procesos activos
ps aux | grep -E "node|next|yarn"

# Puerto ocupado
ss -tlnp | grep :3000

# Logs en tiempo real
tail -f /var/log/nextjs-auth-app.log
```

### Frecuencia de Problemas

**Patrón identificado**: Caídas constantes desde implementación de funcionalidades complejas
- Sistema de despachos (2025-08-22)
- Equivalencias de tallas (2025-08-22)
- Configuraciones ERP (2025-07-24)

**Probable causa**: Builds complejos fallando por timeout o recursos insuficientes

### Plan de Acción Inmediata

1. **Corto plazo** (Inmediato):
   - Cambiar a modo desarrollo (`yarn dev`)
   - Detener systemd service
   - Monitoreo manual

2. **Mediano plazo** (1-2 días):
   - Optimizar proceso de build
   - Ajustar timeouts de systemd
   - Mejorar scripts de inicio

3. **Largo plazo** (1 semana):
   - Implementar health checks
   - Configurar alertas proactivas
   - Documentar procedimientos de recuperación

## Estado Final
✅ **APLICACIÓN FUNCIONANDO**: Sistema estable en modo desarrollo
✅ Diagnóstico completado y documentado
✅ Soluciones identificadas y documentadas
✅ Plan de acción establecido
✅ Todos los cambios implementados y probados (funcionalidades)
✅ Sin errores de TypeScript
✅ Base de datos conectada y funcionando
✅ Totalización por medio de pago funcional para administradores y vendedores
✅ Configuración ERP parametrizable desde panel de administración
✅ **NUEVO**: Módulo completo de Transportes con mantenedor CRUD
✅ **NUEVO**: Sistema de Despachos con modal integrado en documentos ERP
✅ **NUEVO**: Planificación de despachos con fechas y horarios AM/PM
✅ **NUEVO**: Monitor de despachos en tiempo real con vista de calendario
✅ **NUEVO**: Datos geográficos completos de Chile (16 regiones, 347 comunas)
✅ **NUEVO**: Tipos de despacho (Retiro Local, Courier, Despacho) con sucursales
✅ **NUEVO**: Sistema de estados completo (PENDING/SCHEDULED/IN_TRANSIT/DELIVERED/CANCELLED)
✅ **NUEVO**: Panel de Despachador con evidencia fotográfica obligatoria
✅ **NUEVO**: Tabs organizados por estados en Plan de Despachos
✅ **NUEVO**: Botón "Reiniciar" para resetear despachos
✅ **NUEVO**: Modal de revisión de fotos de entrega para administradores
✅ **NUEVO**: Separación estricta de permisos (Admins vs Despachadores)
✅ **NUEVO**: Trazabilidad completa con evidencia fotográfica obligatoria
✅ **NUEVO**: Vista pública sin autenticación para monitor
✅ **NUEVO**: Sistema parametrizable de equivalencias de tallas