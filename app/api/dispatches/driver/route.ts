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

    // Filtros base para despachos activos
    const where: any = {
      status: {
        in: ['SCHEDULED', 'IN_TRANSIT', 'DELIVERED']
      }
    };

    // Si se especifica un transporte, filtrar por él
    if (transportId) {
      where.transportId = transportId;
    }

    // Para despachos entregados, solo mostrar los del día actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dispatches = await prisma.dispatch.findMany({
      where: {
        OR: [
          // Despachos programados o en tránsito (sin filtro de fecha)
          {
            ...where,
            status: {
              in: ['SCHEDULED', 'IN_TRANSIT']
            }
          },
          // Despachos entregados solo del día actual
          {
            ...where,
            status: 'DELIVERED',
            completedAt: {
              gte: today,
              lt: tomorrow
            }
          }
        ]
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

    return NextResponse.json(dispatches);
  } catch (error) {
    console.error('Error al obtener despachos del conductor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}