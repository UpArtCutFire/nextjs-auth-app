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

    const body = await request.json();
    const { id, status, driverId } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID y estado son requeridos' },
        { status: 400 }
      );
    }

    // Validar estados permitidos - DELIVERED solo desde panel de despachador
    if (!['IN_TRANSIT', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'Estado no válido. Solo se permite IN_TRANSIT o CANCELLED desde plan de despachos.' },
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

    // Validar transiciones de estado
    if (status === 'IN_TRANSIT' && existingDispatch.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: 'Solo se pueden poner en tránsito despachos programados' },
        { status: 400 }
      );
    }

    // Preparar datos de actualización
    const updateData: any = { status };

    // Si se está marcando como en tránsito, registrar hora de inicio
    if (status === 'IN_TRANSIT') {
      updateData.startedAt = new Date();
      if (driverId) {
        updateData.driverId = driverId;
      }
    }

    const updatedDispatch = await prisma.dispatch.update({
      where: { id },
      data: updateData,
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
        branch: {
          select: {
            id: true,
            nombre: true,
            direccion: true
          }
        }
      }
    });

    return NextResponse.json(updatedDispatch);
  } catch (error) {
    console.error('Error al actualizar estado del despacho:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estado del despacho' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}