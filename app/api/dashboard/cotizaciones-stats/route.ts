
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      console.log('[COTIZACIONES STATS] Usuario no autenticado');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que el usuario sea administrador
    const user = await prisma.user.findUnique({
      where: { correo: session.user?.email ?? '' }
    });

    if (!user || user.perfil !== 'administrador') {
      console.log('[COTIZACIONES STATS] Acceso denegado - no es administrador');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { ci_session } = body;

    console.log('[COTIZACIONES STATS] Datos recibidos:', {
      ci_session: ci_session ? ci_session.substring(0, 20) + '...' : 'null'
    });

    if (!ci_session) {
      console.log('[COTIZACIONES STATS] Sesión ERP no proporcionada');
      return NextResponse.json(
        { error: 'Sesión ERP requerida' },
        { status: 400 }
      );
    }

    // Generar rango de fechas por defecto (mes actual) - copiado exactamente de documents
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };
    
    const defaultDateRange = `${formatDate(startOfMonth)} a ${formatDate(endOfMonth)}`;

    // Preparar el JSON exacto según especificaciones del ERP (copiado de documents)
    const defaultParams = {
      query: "",
      limit: 1000,
      ascending: 0,
      page: "1",
      byColumn: 0,
      orderBy: "NumDoc",
      NumDoc: "",
      NomCliente: "",
      CodCli: "",
      NomContacto: "",
      GlosaDoc: "",
      notificada: "",
      rutCli: "",
      cc: "",
      MntNeto: "",
      MntTotal: "",
      MntTotalMin: "",
      MntTotalMax: "",
      TipoMoneda: "",
      CodVend: "", // No filtrar por vendedor para estadísticas generales
      AfectaCT: "",
      EstadoProcesoDoc: "",
      FchDoc: defaultDateRange,
      TipoDoc: "CT", // Solo cotizaciones
      acno: "",
      losprimeros: ""
    };

    // Preparar el body JSON según especificaciones exactas (copiado de documents)
    const requestBody = {
      params: defaultParams
    };

    console.log('[COTIZACIONES STATS] Filtros finales aplicados:', defaultParams);
    console.log('[COTIZACIONES STATS] Request body:', requestBody);

    console.log('[COTIZACIONES STATS] Enviando petición al ERP...');

    // Realizar petición al ERP con JSON (copiado exactamente de documents)
    const response = await fetch('https://clientes.erpyme.cl/Documentos/get_listado_documentos', {
      method: 'POST',
      headers: {
        'Cookie': `ci_session=${ci_session}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[COTIZACIONES STATS] Respuesta ERP - Status:', response.status);
    console.log('[COTIZACIONES STATS] Respuesta ERP - Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      // Intentar leer el cuerpo de la respuesta para más información (copiado de documents)
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.log('[COTIZACIONES STATS] Error body:', errorBody.substring(0, 500));
      } catch (e) {
        console.log('[COTIZACIONES STATS] No se pudo leer el cuerpo del error');
      }

      return NextResponse.json(
        { 
          success: false, 
          error: `Error del ERP: ${response.status} ${response.statusText}`,
          debug: {
            status: response.status,
            statusText: response.statusText,
            body: errorBody.substring(0, 200)
          },
          stats: {
            totalCotizaciones: 0,
            montoTotal: 0,
            cotizacionesPendientes: 0
          }
        },
        { status: response.status }
      );
    }

    let erpData;
    try {
      erpData = await response.json();
      console.log('[COTIZACIONES STATS] Datos ERP recibidos:', {
        type: typeof erpData,
        keys: erpData ? Object.keys(erpData) : 'null',
        dataType: erpData?.data ? typeof erpData.data : 'undefined'
      });
    } catch (e) {
      console.error('[COTIZACIONES STATS] Error parseando JSON de ERP:', e);
      const responseText = await response.text();
      console.log('[COTIZACIONES STATS] Respuesta no-JSON:', responseText.substring(0, 500));
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Respuesta inválida del ERP',
          debug: {
            error: 'JSON parse error',
            responsePreview: responseText.substring(0, 200)
          },
          stats: {
            totalCotizaciones: 0,
            montoTotal: 0,
            cotizacionesPendientes: 0
          }
        },
        { status: 500 }
      );
    }
    
    // Procesar los documentos de cotizaciones (copiado la lógica de documents)
    let cotizaciones: any[] = [];
    
    if (erpData && Array.isArray(erpData.data)) {
      cotizaciones = erpData.data;
      console.log('[COTIZACIONES STATS] Cotizaciones encontradas (array):', cotizaciones.length);
    } else if (erpData && erpData.data && typeof erpData.data === 'object') {
      // Si la respuesta viene en formato objeto, convertir a array
      cotizaciones = Object.values(erpData.data);
      console.log('[COTIZACIONES STATS] Cotizaciones encontradas (objeto):', cotizaciones.length);
    } else {
      console.log('[COTIZACIONES STATS] Formato de datos ERP no reconocido:', erpData);
    }

    // Calcular estadísticas
    const totalCotizaciones = cotizaciones.length;
    
    // Calcular monto total (mejorado para manejar diferentes formatos)
    const montoTotal = cotizaciones.reduce((total, doc) => {
      const monto = doc.MntTotal || doc.MntNeto || 0;
      let montoNumerico = 0;
      
      if (typeof monto === 'string') {
        // Limpiar el string: remover puntos y comas, mantener solo números
        const montoLimpio = monto.replace(/[^\d.-]/g, '');
        montoNumerico = parseFloat(montoLimpio) || 0;
      } else if (typeof monto === 'number') {
        montoNumerico = monto;
      }
      
      return total + montoNumerico;
    }, 0);

    // Calcular cotizaciones pendientes (EstadoProcesoDoc = "P")
    console.log('[COTIZACIONES STATS] Total documentos obtenidos del ERP:', cotizaciones.length);
    
    const cotizacionesPendientes = cotizaciones.filter(doc => {
      const estado = (doc.EstadoProcesoDoc || '').trim();
      
      // Log de cada estado encontrado para análisis
      console.log('[COTIZACIONES STATS] Documento:', {
        NumDoc: doc.NumDoc,
        EstadoProcesoDoc: `"${estado}"`,
        esPendiente: estado === "P"
      });
      
      // Lógica simple: solo documentos con EstadoProcesoDoc = "P" son pendientes
      return estado === "P";
    }).length;
    
    console.log('[COTIZACIONES STATS] Cotizaciones con EstadoProcesoDoc = "P":', cotizacionesPendientes);

    // Resumen de estados encontrados para análisis
    const estadosResumen = cotizaciones.reduce((acc: Record<string, number>, doc) => {
      const estado = (doc.EstadoProcesoDoc || '').trim() || '(vacío)';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    console.log('[COTIZACIONES STATS] Resumen de estados encontrados:', estadosResumen);
    console.log('[COTIZACIONES STATS] Estadísticas calculadas:', {
      totalCotizaciones,
      montoTotal: Math.round(montoTotal),
      cotizacionesPendientes
    });

    console.log('[COTIZACIONES STATS] Enviando respuesta final con estadísticas');

    return NextResponse.json({
      success: true,
      stats: {
        totalCotizaciones,
        montoTotal: Math.round(montoTotal), // Redondear para evitar decimales largos
        cotizacionesPendientes
      },
      monthRange: defaultDateRange
    });

  } catch (error) {
    console.error('[COTIZACIONES STATS] Error general:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        debug: error instanceof Error ? error.message : 'Error desconocido',
        stats: {
          totalCotizaciones: 0,
          montoTotal: 0,
          cotizacionesPendientes: 0
        }
      },
      { status: 500 }
    );
  }
}
