import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { driverId } = await request.json();
    const dispatchId = params.id;

    // Verificar que el despacho existe y está en estado SCHEDULED
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: {
        transport: true
      }
    });

    if (!dispatch) {
      return NextResponse.json(
        { error: 'Despacho no encontrado' },
        { status: 404 }
      );
    }

    if (dispatch.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: 'El despacho debe estar en estado PROGRAMADO para poder iniciarse' },
        { status: 400 }
      );
    }

    // Actualizar el despacho a IN_TRANSIT
    const updatedDispatch = await prisma.dispatch.update({
      where: { id: dispatchId },
      data: {
        status: 'IN_TRANSIT',
        startedAt: new Date(),
        driverId: driverId || session.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            correo: true,
          }
        },
        transport: {
          select: {
            id: true,
            patente: true,
            nombre: true,
            talla: true,
          }
        }
      }
    });

    return NextResponse.json({
      message: 'Despacho iniciado correctamente',
      dispatch: updatedDispatch
    });

  } catch (error) {
    console.error('Error al iniciar despacho:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}