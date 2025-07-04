
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      console.log('[ERP AUTH] Usuario no autenticado');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Solo usuarios autenticados pueden usar la integración ERP
    const body = await request.json();
    const { txtrutempresa, txtusuario, txtpwd } = body;

    console.log('[ERP AUTH] Iniciando autenticación con:', {
      txtrutempresa,
      txtusuario: txtusuario ? '***' : 'undefined',
      txtpwd: txtpwd ? '***' : 'undefined'
    });

    if (!txtrutempresa || !txtusuario || !txtpwd) {
      console.log('[ERP AUTH] Faltan credenciales requeridas');
      return NextResponse.json(
        { error: 'Faltan credenciales requeridas' },
        { status: 400 }
      );
    }

    // Construir el cuerpo como application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('data[txtrutempresa]', txtrutempresa);
    params.append('data[txtusuario]', txtusuario);
    params.append('data[txtpwd]', txtpwd);

    console.log('[ERP AUTH] Enviando petición POST a ERP...');
    console.log('[ERP AUTH] Body params:', params.toString());

    // Realizar la petición POST al ERP con headers apropiados
    const response = await fetch('https://clientes.erpyme.cl/login/login2post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      body: params.toString(),
      redirect: 'manual', // No seguir redirecciones automáticamente
    });

    console.log('[ERP AUTH] Respuesta ERP - Status:', response.status);
    console.log('[ERP AUTH] Respuesta ERP - Headers:', Object.fromEntries(response.headers.entries()));

    // Obtener el cuerpo de la respuesta JSON
    let responseBody;
    let responseText = '';
    
    try {
      responseText = await response.text();
      console.log('[ERP AUTH] Cuerpo de respuesta (texto):', responseText.substring(0, 500));
      
      // Intentar parsear como JSON
      responseBody = JSON.parse(responseText);
      console.log('[ERP AUTH] Cuerpo parseado como JSON:', responseBody);
    } catch (e) {
      console.log('[ERP AUTH] Error parseando respuesta como JSON:', e);
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Respuesta del ERP no es JSON válido',
          debug: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseText.substring(0, 500),
            parseError: e instanceof Error ? e.message : 'Error desconocido'
          }
        },
        { status: 400 }
      );
    }

    // Verificar si el login fue exitoso
    if (responseBody.estado !== 'OK' || responseBody.codigo_respuesta !== 1) {
      console.log('[ERP AUTH] Login falló según respuesta del ERP:', responseBody);
      
      return NextResponse.json(
        { 
          success: false, 
          error: responseBody.detalle || 'Error de autenticación en ERP',
          debug: {
            status: response.status,
            erp_response: responseBody
          }
        },
        { status: 401 }
      );
    }

    // Extraer la URL del campo "url" del body
    const redirectUrl = responseBody.url;
    
    console.log('[ERP AUTH] URL extraída del campo "url":', redirectUrl);
    console.log('[ERP AUTH] Tipo de redirectUrl:', typeof redirectUrl);
    console.log('[ERP AUTH] redirectUrl es truthy:', !!redirectUrl);
    console.log('[ERP AUTH] Campos disponibles:', Object.keys(responseBody));

    // Validación más específica
    if (!redirectUrl || typeof redirectUrl !== 'string' || redirectUrl.trim() === '') {
      console.log('[ERP AUTH] Problema con la URL:');
      console.log('  - redirectUrl:', redirectUrl);
      console.log('  - typeof redirectUrl:', typeof redirectUrl);
      console.log('  - redirectUrl es falsy:', !redirectUrl);
      console.log('  - redirectUrl no es string:', typeof redirectUrl !== 'string');
      console.log('  - redirectUrl es string vacío:', typeof redirectUrl === 'string' && redirectUrl.trim() === '');
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'No se encontró URL de redirección válida en la respuesta del ERP',
          debug: {
            status: response.status,
            erp_response: responseBody,
            available_fields: Object.keys(responseBody),
            redirectUrl_value: redirectUrl,
            redirectUrl_type: typeof redirectUrl,
            redirectUrl_length: typeof redirectUrl === 'string' ? redirectUrl.length : 'N/A'
          }
        },
        { status: 400 }
      );
    }

    console.log('[ERP AUTH] Autenticación exitosa, URL extraída del body');
    return NextResponse.json({
      success: true,
      redirectUrl: redirectUrl,
      erp_response: responseBody // Incluir la respuesta completa para debugging
    });

  } catch (error) {
    console.error('[ERP AUTH] Error en autenticación ERP:', error);
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
