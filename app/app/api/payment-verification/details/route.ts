
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

    // Buscar la verificación de pago en la base de datos
    const paymentVerification = await prisma.paymentVerification.findFirst({
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
      }
    });

    if (!paymentVerification) {
      return NextResponse.json(
        { error: 'No se encontró verificación de pago para este documento' }, 
        { status: 404 }
      );
    }

    // Parsear la información del documento si existe
    let documentInfo = null;
    try {
      if (paymentVerification.documentInfo) {
        documentInfo = JSON.parse(paymentVerification.documentInfo);
      }
    } catch (error) {
      console.error('Error parseando documentInfo:', error);
      documentInfo = null;
    }

    // Preparar la respuesta con todos los detalles
    const response = {
      success: true,
      paymentVerification: {
        id: paymentVerification.id,
        documentNumber: paymentVerification.documentNumber,
        documentType: paymentVerification.documentType,
        vendorCode: paymentVerification.vendorCode,
        paymentMethod: paymentVerification.paymentMethod,
        comment: paymentVerification.comment,
        photoUrl: paymentVerification.photoUrl,
        createdAt: paymentVerification.createdAt,
        updatedAt: paymentVerification.updatedAt,
        documentInfo: documentInfo,
        registeredBy: {
          id: paymentVerification.user.id,
          nombre: paymentVerification.user.nombre,
          correo: paymentVerification.user.correo,
          codigoVendedor: paymentVerification.user.codigo_vendedor
        }
      }
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
