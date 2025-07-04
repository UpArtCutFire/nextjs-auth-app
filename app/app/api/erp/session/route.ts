
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      console.log('[ERP SESSION] Usuario no autenticado');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { redirectUrl } = body;

    console.log('[ERP SESSION] Obteniendo sesión desde URL:', redirectUrl);

    if (!redirectUrl) {
      console.log('[ERP SESSION] URL de redirección no proporcionada');
      return NextResponse.json(
        { error: 'URL de redirección requerida' },
        { status: 400 }
      );
    }

    // Realizar GET a la URL obtenida para rescatar ci_session
    console.log('[ERP SESSION] Realizando GET a la URL de redirección...');
    const response = await fetch(redirectUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      redirect: 'manual',
    });

    console.log('[ERP SESSION] Respuesta - Status:', response.status);
    console.log('[ERP SESSION] Respuesta - Headers:', Object.fromEntries(response.headers.entries()));

    // Buscar la cookie ci_session en los headers
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    let setCookieHeader = response.headers.get('set-cookie');
    let ci_session = null;

    console.log('[ERP SESSION] Set-Cookie header:', setCookieHeader);
    console.log('[ERP SESSION] Set-Cookie headers array:', setCookieHeaders);

    // Intentar múltiples métodos para extraer ci_session
    
    // Método 1: Usar getSetCookie() si está disponible
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      for (const cookieHeader of setCookieHeaders) {
        console.log('[ERP SESSION] Procesando cookie header:', cookieHeader);
        if (cookieHeader.includes('ci_session=')) {
          const match = cookieHeader.match(/ci_session=([^;]+)/);
          if (match) {
            ci_session = match[1];
            console.log('[ERP SESSION] ci_session encontrada (método 1):', ci_session?.substring(0, 20) + '...');
            break;
          }
        }
      }
    }

    // Método 2: Usar set-cookie header tradicional
    if (!ci_session && setCookieHeader) {
      console.log('[ERP SESSION] Intentando extraer ci_session con método 2...');
      
      // Dividir por comas, pero tener cuidado con las fechas que también contienen comas
      const cookieParts = setCookieHeader.split(/(?=\w+=)/);
      
      for (const part of cookieParts) {
        const trimmedPart = part.trim().replace(/^,\s*/, '');
        console.log('[ERP SESSION] Procesando parte de cookie:', trimmedPart.substring(0, 50));
        
        if (trimmedPart.startsWith('ci_session=')) {
          ci_session = trimmedPart.split('=')[1]?.split(';')[0];
          console.log('[ERP SESSION] ci_session encontrada (método 2):', ci_session?.substring(0, 20) + '...');
          break;
        }
      }
    }

    // Método 3: Buscar en el cuerpo de la respuesta si las cookies no están en headers
    if (!ci_session) {
      console.log('[ERP SESSION] No se encontró ci_session en headers, buscando en el cuerpo...');
      try {
        const responseText = await response.text();
        console.log('[ERP SESSION] Cuerpo de respuesta (primeros 500 chars):', responseText.substring(0, 500));
        
        // Buscar patrones de JavaScript que establezcan cookies
        const jsSetCookieMatch = responseText.match(/document\.cookie\s*=\s*["']ci_session=([^"';]+)/);
        if (jsSetCookieMatch) {
          ci_session = jsSetCookieMatch[1];
          console.log('[ERP SESSION] ci_session encontrada en JS:', ci_session?.substring(0, 20) + '...');
        }
      } catch (e) {
        console.log('[ERP SESSION] Error leyendo cuerpo de respuesta:', e);
      }
    }

    if (!ci_session) {
      console.log('[ERP SESSION] No se pudo extraer ci_session');
      return NextResponse.json(
        { 
          success: false, 
          error: 'No se pudo obtener la sesión del ERP',
          debug: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            setCookieHeaders: setCookieHeaders,
            setCookieHeader: setCookieHeader
          }
        },
        { status: 400 }
      );
    }

    console.log('[ERP SESSION] Sesión obtenida exitosamente');
    return NextResponse.json({
      success: true,
      ci_session: ci_session
    });

  } catch (error) {
    console.error('[ERP SESSION] Error obteniendo sesión ERP:', error);
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
