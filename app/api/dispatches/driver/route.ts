import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const transportId = searchParams.get('transportId');

    // Para despachos entregados, solo mostrar los del día actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Construir condiciones de filtro
    const conditions: any[] = [];

    // Despachos programados con transporte
    if (transportId) {
      conditions.push({
        status: 'SCHEDULED',
        transportId: transportId
      });
      conditions.push({
        status: 'IN_TRANSIT',
        transportId: transportId
      });
      conditions.push({
        status: 'DELIVERED',
        transportId: transportId,
        completedAt: {
          gte: today,
          lt: tomorrow
        }
      });
    } else {
      // Sin filtro de transporte: mostrar todos los programados y en tránsito
      conditions.push({
        status: 'SCHEDULED'
      });
      conditions.push({
        status: 'IN_TRANSIT'
      });
      conditions.push({
        status: 'DELIVERED',
        completedAt: {
          gte: today,
          lt: tomorrow
        }
      });
    }

    // Siempre incluir RETIRO_LOCAL en tránsito (no tienen transporte)
    conditions.push({
      status: 'IN_TRANSIT',
      tipoDespacho: 'RETIRO_LOCAL',
      transportId: null
    });

    // Retiros locales entregados hoy
    conditions.push({
      status: 'DELIVERED',
      tipoDespacho: 'RETIRO_LOCAL',
      completedAt: {
        gte: today,
        lt: tomorrow
      }
    });

    const dispatches = await prisma.dispatch.findMany({
      where: {
        OR: conditions
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
        },
        branch: {
          select: {
            id: true,
            nombre: true,
            direccion: true,
          }
        },
        deliveryPhotos: {
          select: {
            id: true,
            photoUrl: true,
            comment: true,
            createdAt: true,
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // SCHEDULED primero, luego IN_TRANSIT, luego DELIVERED
        { scheduledDate: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Eliminar duplicados (pueden aparecer si un retiro local también cumple otras condiciones)
    const uniqueDispatches = dispatches.filter((dispatch, index, self) =>
      index === self.findIndex((d) => d.id === dispatch.id)
    );

    return NextResponse.json(uniqueDispatches);
  } catch (error) {
    console.error('Error al obtener despachos del conductor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}