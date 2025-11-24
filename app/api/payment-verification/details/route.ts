
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea administrador
    if (session.user.perfil !== 'administrador') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url);
    const documentNumber = searchParams.get('documentNumber');
    const documentType = searchParams.get('documentType');

    if (!documentNumber || !documentType) {
      return NextResponse.json(
        { error: 'Parámetros documentNumber y documentType son requeridos' }, 
        { status: 400 }
      );
    }

    // Buscar TODAS las verificaciones de pago para este documento
    const paymentVerifications = await prisma.paymentVerification.findMany({
      where: {
        documentNumber: documentNumber,
        documentType: documentType,
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            correo: true,
            codigo_vendedor: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (!paymentVerifications || paymentVerifications.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron verificaciones de pago para este documento' }, 
        { status: 404 }
      );
    }

    // Procesar todas las verificaciones
    const processedVerifications = paymentVerifications.map(verification => {
      // Parsear la información del documento si existe
      let documentInfo = null;
      try {
        if (verification.documentInfo) {
          documentInfo = JSON.parse(verification.documentInfo);
        }
      } catch (error) {
        console.error('Error parseando documentInfo:', error);
        documentInfo = null;
      }

      return {
        id: verification.id,
        documentNumber: verification.documentNumber,
        documentType: verification.documentType,
        vendorCode: verification.vendorCode,
        paymentMethod: verification.paymentMethod,
        amount: verification.amount,
        comment: verification.comment,
        photoUrl: verification.photoUrl,
        createdAt: verification.createdAt,
        updatedAt: verification.updatedAt,
        documentInfo: documentInfo,
        registeredBy: {
          id: verification.user.id,
          nombre: verification.user.nombre,
          correo: verification.user.correo,
          codigoVendedor: verification.user.codigo_vendedor
        }
      };
    });

    // Preparar la respuesta con todos los detalles
    const response = {
      success: true,
      paymentVerifications: processedVerifications,
      // Para compatibilidad con versión anterior, incluir el primer pago como paymentVerification
      paymentVerification: processedVerifications[0]
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error obteniendo detalles de verificación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}
