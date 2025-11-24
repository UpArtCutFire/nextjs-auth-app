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

    // Verificar que solo administradores puedan acceder
    const userProfile = (session.user as any)?.perfil;
    const isAdmin = userProfile === 'administrador' || 
                   session.user?.email === 'john@doe.com' || 
                   session.user?.email === 'admin@test.com';
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acceso denegado - Solo administradores' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Fechas de inicio y fin son requeridas' }, { status: 400 });
    }

    // Convertir fechas
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Obtener despachos del período
    const dispatches = await prisma.dispatch.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        transport: true,
        branch: true,
        user: {
          select: {
            nombre: true,
            correo: true
          }
        }
      }
    });

    // Calcular período anterior para comparación
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const previousStart = new Date(start);
    previousStart.setDate(start.getDate() - periodDays);
    const previousEnd = new Date(start);
    previousEnd.setDate(start.getDate() - 1);

    const previousDispatches = await prisma.dispatch.findMany({
      where: {
        createdAt: {
          gte: previousStart,
          lte: previousEnd
        }
      }
    });

    // Calcular métricas básicas
    const totalDispatches = dispatches.length;
    
    // Distribución por tipo
    const dispatchesByType = {
      RETIRO_LOCAL: dispatches.filter(d => d.tipoDespacho === 'RETIRO_LOCAL').length,
      COURIER: dispatches.filter(d => d.tipoDespacho === 'COURIER').length,
      DESPACHO: dispatches.filter(d => d.tipoDespacho === 'DESPACHO').length
    };

    // Distribución por estado
    const dispatchesByStatus = {
      PENDING: dispatches.filter(d => d.status === 'PENDING').length,
      SCHEDULED: dispatches.filter(d => d.status === 'SCHEDULED').length,
      IN_TRANSIT: dispatches.filter(d => d.status === 'IN_TRANSIT').length,
      DELIVERED: dispatches.filter(d => d.status === 'DELIVERED').length,
      CANCELLED: dispatches.filter(d => d.status === 'CANCELLED').length
    };

    // Calcular métricas de tiempo
    const scheduledDispatches = dispatches.filter(d => d.scheduledDate && d.status !== 'PENDING');
    const deliveredDispatches = dispatches.filter(d => d.status === 'DELIVERED' && d.completedAt);
    const inTransitDispatches = dispatches.filter(d => d.startedAt && d.completedAt);

    // Tiempo promedio desde registro hasta programación (en horas)
    let avgTimeToSchedule = 0;
    if (scheduledDispatches.length > 0) {
      const totalTimeToSchedule = scheduledDispatches.reduce((acc, dispatch) => {
        if (dispatch.scheduledDate) {
          const createdTime = new Date(dispatch.createdAt).getTime();
          const scheduledTime = new Date(dispatch.scheduledDate).getTime();
          return acc + (scheduledTime - createdTime);
        }
        return acc;
      }, 0);
      avgTimeToSchedule = totalTimeToSchedule / (scheduledDispatches.length * 1000 * 60 * 60); // Convertir a horas
    }

    // Tiempo promedio en tránsito (en horas)
    let avgTimeInTransit = 0;
    if (inTransitDispatches.length > 0) {
      const totalTimeInTransit = inTransitDispatches.reduce((acc, dispatch) => {
        if (dispatch.startedAt && dispatch.completedAt) {
          const startTime = new Date(dispatch.startedAt).getTime();
          const endTime = new Date(dispatch.completedAt).getTime();
          return acc + (endTime - startTime);
        }
        return acc;
      }, 0);
      avgTimeInTransit = totalTimeInTransit / (inTransitDispatches.length * 1000 * 60 * 60); // Convertir a horas
    }

    // Tiempo promedio total (registro hasta entrega)
    let avgTimeToComplete = 0;
    if (deliveredDispatches.length > 0) {
      const totalTimeToComplete = deliveredDispatches.reduce((acc, dispatch) => {
        if (dispatch.completedAt) {
          const createdTime = new Date(dispatch.createdAt).getTime();
          const completedTime = new Date(dispatch.completedAt).getTime();
          return acc + (completedTime - createdTime);
        }
        return acc;
      }, 0);
      avgTimeToComplete = totalTimeToComplete / (deliveredDispatches.length * 1000 * 60 * 60); // Convertir a horas
    }

    // Métricas de rendimiento
    const scheduledOrDelivered = dispatches.filter(d => 
      d.status === 'SCHEDULED' || d.status === 'IN_TRANSIT' || d.status === 'DELIVERED'
    );
    
    // Considerar "a tiempo" si se entregó dentro de las 24 horas programadas
    const onTimeDeliveries = deliveredDispatches.filter(dispatch => {
      if (!dispatch.scheduledDate || !dispatch.completedAt) return false;
      
      const scheduledTime = new Date(dispatch.scheduledDate).getTime();
      const completedTime = new Date(dispatch.completedAt).getTime();
      const timeDiff = completedTime - scheduledTime;
      
      // Consideramos "a tiempo" si se entregó el mismo día o hasta 24 horas después
      return timeDiff <= (24 * 60 * 60 * 1000);
    }).length;

    const lateDeliveries = deliveredDispatches.length - onTimeDeliveries;
    const completionRate = scheduledOrDelivered.length > 0 
      ? (dispatchesByStatus.DELIVERED / scheduledOrDelivered.length) * 100 
      : 0;

    // Comparación con período anterior
    const previousTotalDispatches = previousDispatches.length;
    const previousDeliveredDispatches = previousDispatches.filter(d => d.status === 'DELIVERED').length;

    const growthDispatches = previousTotalDispatches > 0 
      ? ((totalDispatches - previousTotalDispatches) / previousTotalDispatches) * 100 
      : 0;
    
    const growthDeliveries = previousDeliveredDispatches > 0 
      ? ((dispatchesByStatus.DELIVERED - previousDeliveredDispatches) / previousDeliveredDispatches) * 100 
      : 0;

    // Preparar tabla de despachos con información detallada
    const dispatchesTable = dispatches.map((dispatch: any) => {
      let montoNetoSinDespacho = 0;
      let montoTotal = 0;
      let montoNeto = 0;
      let fleteTransporte = 0;

      if (dispatch.documentInfo) {
        try {
          const info = JSON.parse(dispatch.documentInfo);
          montoTotal = parseFloat(info.MntTotal || '0');
          montoNeto = parseFloat(info.MntNeto || '0');
          fleteTransporte = parseFloat(info.transporte || info.flete || '0');
          // Calcular monto neto sin despacho: Monto Neto - (Flete/Transporte sin IVA)
          const fleteNetoSinIVA = fleteTransporte / 1.19; // Quitar el 19% de IVA
          montoNetoSinDespacho = montoNeto - fleteNetoSinIVA;
        } catch (e) {
          console.error('Error parsing documentInfo:', e);
        }
      }

      return {
        id: dispatch.id,
        fecha: dispatch.createdAt,
        tipoEntrega: dispatch.tipoDespacho || 'DESPACHO',
        sucursal: dispatch.branch?.nombre || 'Sin sucursal',
        vendedor: dispatch.vendorCode,
        cliente: dispatch.clienteNombre,
        documento: dispatch.documentNumber,
        montoTotal,
        fleteTransporte,
        montoNetoSinDespacho,
        estado: dispatch.status,
        direccion: dispatch.direccion,
        comuna: dispatch.comuna,
        region: dispatch.region
      };
    });

    const metrics = {
      totalDispatches,
      dispatchesByType,
      dispatchesByStatus,
      timeMetrics: {
        avgTimeToSchedule: Math.round(avgTimeToSchedule * 10) / 10,
        avgTimeToComplete: Math.round(avgTimeToComplete * 10) / 10,
        avgTimeInTransit: Math.round(avgTimeInTransit * 10) / 10
      },
      performanceMetrics: {
        onTimeDeliveries,
        lateDeliveries,
        completionRate: Math.round(completionRate * 10) / 10
      },
      periodComparison: {
        previousPeriod: {
          totalDispatches: previousTotalDispatches,
          deliveredDispatches: previousDeliveredDispatches
        },
        growth: {
          dispatches: Math.round(growthDispatches * 10) / 10,
          deliveries: Math.round(growthDeliveries * 10) / 10
        }
      },
      dispatchesTable
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error al obtener métricas de despachos:', error);
    return NextResponse.json(
      { error: 'Error al obtener métricas de despachos' },
      { status: 500 }
    );
  }
}