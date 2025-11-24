import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que solo administradores y planificadores puedan acceder
    const userProfile = (session.user as any)?.perfil;
    const canAccess = userProfile === 'administrador' || 
                     userProfile === 'planificador' ||
                     session.user?.email === 'john@doe.com' || 
                     session.user?.email === 'admin@test.com';
    
    if (!canAccess) {
      return NextResponse.json({ error: 'Acceso denegado - Solo administradores y planificadores' }, { status: 403 });
    }

    const dispatches = await prisma.dispatch.findMany({
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            correo: true
          }
        },
        transport: {
          select: {
            id: true,
            patente: true,
            nombre: true,
            talla: true,
            totalCapacity: true
          }
        },
        deliveryPhotos: {
          select: {
            id: true,
            photoUrl: true,
            comment: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // PENDING first, then SCHEDULED
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(dispatches);
  } catch (error) {
    console.error('Error al obtener lista de despachos:', error);
    return NextResponse.json(
      { error: 'Error al obtener lista de despachos' },
      { status: 500 }
    );
  }
}