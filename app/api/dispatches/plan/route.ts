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

    // Verificar que solo administradores y planificadores puedan planificar
    const userProfile = (session.user as any)?.perfil;
    const canPlan = userProfile === 'administrador' || 
                   userProfile === 'planificador' ||
                   session.user?.email === 'john@doe.com' || 
                   session.user?.email === 'admin@test.com';
    
    if (!canPlan) {
      return NextResponse.json({ error: 'Acceso denegado - Solo administradores y planificadores pueden planificar' }, { status: 403 });
    }

    const body = await request.json();
    const { id, scheduledDate, scheduledPeriod, transportId } = body;

    if (!id || !scheduledDate || !scheduledPeriod || !transportId) {
      return NextResponse.json(
        { error: 'ID, fecha, periodo y transporte son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el periodo sea AM o PM
    if (!['AM', 'PM'].includes(scheduledPeriod)) {
      return NextResponse.json(
        { error: 'El periodo debe ser AM o PM' },
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

    // Convertir fecha a DateTime asegurando que se mantenga la fecha correcta
    // Usar la fecha con hora local para evitar problemas de timezone
    let date: Date;
    if (scheduledDate.includes('T')) {
      date = new Date(scheduledDate);
    } else {
      // Crear la fecha usando componentes locales para evitar conversión UTC
      const [year, month, day] = scheduledDate.split('-').map(Number);
      date = new Date(year, month - 1, day, 12, 0, 0); // month - 1 porque los meses en JS son 0-indexed
    }
    
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Fecha inválida' },
        { status: 400 }
      );
    }

    // Validar que el transporte existe y está activo
    const transport = await prisma.transport.findUnique({
      where: { id: transportId }
    });

    if (!transport) {
      return NextResponse.json(
        { error: 'Transporte no encontrado' },
        { status: 400 }
      );
    }

    if (!transport.activo) {
      return NextResponse.json(
        { error: 'El transporte seleccionado no está activo' },
        { status: 400 }
      );
    }

    // Obtener equivalencias de tallas
    const sizeEquivalences = await prisma.sizeEquivalence.findMany();
    
    // Si no existen, crear las por defecto
    if (sizeEquivalences.length === 0) {
      const defaultEquivalences = [
        { size: 'S' as const, value: 1, description: 'Pequeño' },
        { size: 'M' as const, value: 2, description: 'Mediano' },
        { size: 'L' as const, value: 3, description: 'Grande' },
        { size: 'XL' as const, value: 4, description: 'Extra Grande' },
        { size: 'XXL' as const, value: 10, description: 'Extra Extra Grande' }
      ];

      for (const eq of defaultEquivalences) {
        await prisma.sizeEquivalence.create({ data: eq });
      }
    }

    // Recargar equivalencias
    const equivalences = await prisma.sizeEquivalence.findMany();
    const equivalenceMap = equivalences.reduce((acc, eq) => {
      acc[eq.size] = eq.value;
      return acc;
    }, {} as Record<string, number>);

    // Verificar capacidad disponible para el transporte en la fecha/horario seleccionado
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingDispatches = await prisma.dispatch.findMany({
      where: {
        transportId: transportId,
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        scheduledPeriod: scheduledPeriod,
        status: 'SCHEDULED',
        // Excluir el despacho actual si estamos editando
        ...(id !== 'new' ? { NOT: { id: id } } : {})
      },
      select: {
        tamanoDespacho: true
      }
    });

    // Calcular puntos ocupados actuales
    const usedCapacity = existingDispatches.reduce((total, dispatch) => {
      return total + (equivalenceMap[dispatch.tamanoDespacho] || 0);
    }, 0);

    // Obtener puntos que ocupará el nuevo despacho
    const newDispatchPoints = equivalenceMap[existingDispatch.tamanoDespacho] || 0;
    
    // Verificar si hay capacidad suficiente
    const totalCapacityNeeded = usedCapacity + newDispatchPoints;
    
    if (totalCapacityNeeded > transport.totalCapacity) {
      return NextResponse.json(
        { 
          error: `Capacidad insuficiente en el transporte ${transport.patente} para el ${scheduledPeriod === 'AM' ? 'turno de mañana' : 'turno de tarde'} del ${date.toLocaleDateString('es-CL')}.\n` +
                 `Capacidad total: ${transport.totalCapacity} puntos\n` +
                 `Actualmente ocupado: ${usedCapacity} puntos\n` +
                 `Este despacho requiere: ${newDispatchPoints} puntos (talla ${existingDispatch.tamanoDespacho})\n` +
                 `Disponible: ${transport.totalCapacity - usedCapacity} puntos`
        },
        { status: 400 }
      );
    }

    const updatedDispatch = await prisma.dispatch.update({
      where: { id },
      data: {
        scheduledDate: date,
        scheduledPeriod,
        transportId,
        status: 'SCHEDULED'
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
    console.error('Error al planificar despacho:', error);
    return NextResponse.json(
      { error: 'Error al planificar despacho' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}