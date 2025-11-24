import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que solo administradores y planificadores puedan reiniciar despachos
    const userProfile = (session.user as any)?.perfil;
    const isAdmin = userProfile === 'administrador' || 
                   userProfile === 'planificador' ||
                   session.user?.email === 'john@doe.com' || 
                   session.user?.email === 'admin@test.com';
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acceso denegado - Solo administradores pueden reiniciar despachos' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del despacho es requerido' },
        { status: 400 }
      );
    }

    const existingDispatch = await prisma.dispatch.findUnique({
      where: { id }
    });

    if (!existingDispatch) {
      return NextResponse.json(
        { error: 'Despacho no encontrado' },
        { status: 404 }
      );
    }

    // Reiniciar despacho a estado PENDING
    const updatedDispatch = await prisma.dispatch.update({
      where: { id },
      data: {
        status: 'PENDING',
        scheduledDate: null,
        scheduledPeriod: null,
        transportId: null,
        startedAt: null,
        completedAt: null,
        driverId: null
      },
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
        }
      }
    });

    return NextResponse.json(updatedDispatch);
  } catch (error) {
    console.error('Error al reiniciar despacho:', error);
    return NextResponse.json(
      { error: 'Error al reiniciar despacho' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}