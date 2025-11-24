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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const period = searchParams.get('period');

    if (!date || !period) {
      return NextResponse.json(
        { error: 'Fecha y periodo son requeridos' },
        { status: 400 }
      );
    }

    if (!['AM', 'PM'].includes(period)) {
      return NextResponse.json(
        { error: 'Periodo debe ser AM o PM' },
        { status: 400 }
      );
    }

    // Obtener todos los transportes activos
    const transports = await prisma.transport.findMany({
      where: { activo: true },
      include: {
        dispatches: {
          where: {
            scheduledDate: {
              gte: new Date(date + 'T00:00:00.000Z'),
              lte: new Date(date + 'T23:59:59.999Z')
            },
            scheduledPeriod: period,
            status: 'SCHEDULED'
          }
        }
      }
    });

    // Calcular disponibilidad para cada transporte
    const availability = transports.map(transport => {
      // Usar totalCapacity en lugar de límites por periodo
      const currentLimit = transport.totalCapacity;
      const currentDispatches = transport.dispatches.length;
      const available = currentLimit - currentDispatches;

      return {
        id: transport.id,
        patente: transport.patente,
        nombre: transport.nombre,
        talla: transport.talla,
        maxDispatches: currentLimit,
        currentDispatches: currentDispatches,
        availableSlots: available,
        isAvailable: available > 0
      };
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error al obtener disponibilidad de transportes:', error);
    return NextResponse.json(
      { error: 'Error al obtener disponibilidad de transportes' },
      { status: 500 }
    );
  }
}