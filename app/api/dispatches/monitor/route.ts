import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  
  try {
    // No validación de credenciales - acceso público para monitor

    // Obtener todos los despachos con fecha programada desde hace 7 días (para mostrar la semana completa)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    console.log('Monitor API - Fecha weekAgo:', weekAgo.toISOString());
    
    const dispatches = await prisma.dispatch.findMany({
      where: {
        // Solo despachos que tienen fecha programada (no PENDING)
        scheduledDate: {
          gte: weekAgo
        },
        status: {
          in: ['SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']
        }
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
            talla: true
          }
        },
        deliveryPhotos: {
          select: {
            id: true,
            photoUrl: true,
            comment: true,
            createdAt: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // DELIVERED, IN_TRANSIT, SCHEDULED
        { scheduledDate: 'asc' },
        { scheduledPeriod: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    console.log('Monitor API - Total despachos encontrados:', dispatches.length);
    console.log('Monitor API - Despachos 9178 y 9328:', 
      dispatches.filter(d => ['9178', '9328'].includes(d.documentNumber))
        .map(d => ({ doc: d.documentNumber, status: d.status, date: d.scheduledDate }))
    );

    return NextResponse.json(dispatches);
  } catch (error) {
    console.error('Error al obtener despachos para monitor:', error);
    return NextResponse.json(
      { error: 'Error al obtener despachos para monitor' },
      { status: 500 }
    );
  }
}