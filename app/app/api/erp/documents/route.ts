
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import { ERPDocument, ERPDocumentFilter } from '@/lib/types';

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      console.log('[ERP DOCS] Usuario no autenticado');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener información del usuario actual
    const user = await prisma.user.findUnique({
      where: { correo: session.user?.email ?? '' }
    });

    if (!user) {
      console.log('[ERP DOCS] Usuario no encontrado:', session.user?.email);
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    console.log('[ERP DOCS] Usuario:', {
      perfil: user.perfil,
      codigo_vendedor: user.codigo_vendedor,
      email: user.correo
    });

    const body = await request.json();
    const { ci_session, filters = {} } = body;

    console.log('[ERP DOCS] Datos recibidos:', {
      ci_session: ci_session ? ci_session.substring(0, 20) + '...' : 'null',
      filters: filters
    });

    if (!ci_session) {
      console.log('[ERP DOCS] Sesión ERP no proporcionada');
      return NextResponse.json(
        { error: 'Sesión ERP requerida' },
        { status: 400 }
      );
    }

    // Generar rango de fechas por defecto (mes actual)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };
    
    const defaultDateRange = `${formatDate(startOfMonth)} a ${formatDate(endOfMonth)}`;

    // Preparar el JSON exacto según especificaciones del ERP
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
      CodVend: "",
      AfectaCT: "",
      EstadoProcesoDoc: "",
      FchDoc: defaultDateRange,
      TipoDoc: "",
      acno: "",
      losprimeros: ""
    };

    // Si el usuario es vendedor, filtrar por su código de vendedor
    if (user.perfil === 'vendedor' && user.codigo_vendedor) {
      defaultParams.CodVend = user.codigo_vendedor;
    }

    // Aplicar filtros personalizados si se proporcionan
    const finalParams = { ...defaultParams };
    
    // Aplicar filtros de la UI si se proporcionan
    if (filters.NumDoc) finalParams.NumDoc = filters.NumDoc;
    if (filters.NomCliente) finalParams.NomCliente = filters.NomCliente;
    if (filters.CodCli) finalParams.CodCli = filters.CodCli;
    if (filters.TipoDoc) finalParams.TipoDoc = filters.TipoDoc;
    if (filters.FchDoc) finalParams.FchDoc = filters.FchDoc;
    if (filters.CodVend && user.perfil === 'administrador') {
      // Solo admin puede filtrar por vendedor específico
      finalParams.CodVend = filters.CodVend;
    }

    // Preparar el body JSON según especificaciones exactas
    const requestBody = {
      params: finalParams
    };

    console.log('[ERP DOCS] Filtros finales aplicados:', finalParams);
    console.log('[ERP DOCS] Request body:', requestBody);

    console.log('[ERP DOCS] Enviando petición al ERP...');

    // Realizar petición al ERP con JSON
    const response = await fetch('https://clientes.erpyme.cl/Documentos/get_listado_documentos', {
      method: 'POST',
      headers: {
        'Cookie': `ci_session=${ci_session}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[ERP DOCS] Respuesta ERP - Status:', response.status);
    console.log('[ERP DOCS] Respuesta ERP - Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      // Intentar leer el cuerpo de la respuesta para más información
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.log('[ERP DOCS] Error body:', errorBody.substring(0, 500));
      } catch (e) {
        console.log('[ERP DOCS] No se pudo leer el cuerpo del error');
      }

      return NextResponse.json(
        { 
          success: false, 
          error: `Error del ERP: ${response.status} ${response.statusText}`,
          debug: {
            status: response.status,
            statusText: response.statusText,
            body: errorBody.substring(0, 200)
          }
        },
        { status: response.status }
      );
    }

    let erpData;
    try {
      erpData = await response.json();
      console.log('[ERP DOCS] Datos ERP recibidos:', {
        type: typeof erpData,
        keys: erpData ? Object.keys(erpData) : 'null',
        dataType: erpData?.data ? typeof erpData.data : 'undefined'
      });
    } catch (e) {
      console.error('[ERP DOCS] Error parseando JSON de ERP:', e);
      const responseText = await response.text();
      console.log('[ERP DOCS] Respuesta no-JSON:', responseText.substring(0, 500));
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Respuesta inválida del ERP',
          debug: {
            error: 'JSON parse error',
            responsePreview: responseText.substring(0, 200)
          }
        },
        { status: 500 }
      );
    }
    
    // Procesar y filtrar los documentos
    let documents: ERPDocument[] = [];
    
    if (erpData && Array.isArray(erpData.data)) {
      documents = erpData.data;
      console.log('[ERP DOCS] Documentos encontrados (array):', documents.length);
      
      // Aplicar filtrado adicional por rol si es necesario
      if (user.perfil === 'vendedor' && user.codigo_vendedor) {
        const beforeFilter = documents.length;
        documents = documents.filter(doc => 
          (doc.CodVend === user.codigo_vendedor || doc.Vendedor === user.codigo_vendedor)
        );
        console.log('[ERP DOCS] Documentos filtrados por vendedor:', beforeFilter, '->', documents.length);
      }
    } else if (erpData && erpData.data && typeof erpData.data === 'object') {
      // Si la respuesta viene en formato objeto, convertir a array
      documents = Object.values(erpData.data);
      console.log('[ERP DOCS] Documentos encontrados (objeto):', documents.length);
      
      if (user.perfil === 'vendedor' && user.codigo_vendedor) {
        const beforeFilter = documents.length;
        documents = documents.filter(doc => 
          (doc.CodVend === user.codigo_vendedor || doc.Vendedor === user.codigo_vendedor)
        );
        console.log('[ERP DOCS] Documentos filtrados por vendedor:', beforeFilter, '->', documents.length);
      }
    } else {
      console.log('[ERP DOCS] Formato de datos ERP no reconocido:', erpData);
    }

    console.log('[ERP DOCS] Enviando respuesta final con', documents.length, 'documentos');

    return NextResponse.json({
      success: true,
      documents: documents,
      totalCount: documents.length,
      userRole: user.perfil,
      userVendorCode: user.codigo_vendedor
    });

  } catch (error) {
    console.error('[ERP DOCS] Error obteniendo documentos ERP:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        debug: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
