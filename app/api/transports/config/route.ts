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
    const { id, totalCapacity } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del transporte es requerido' },
        { status: 400 }
      );
    }

    // Validar que el valor sea un número válido
    const capacity = parseInt(totalCapacity);

    if (isNaN(capacity) || capacity < 1) {
      return NextResponse.json(
        { error: 'La capacidad debe ser un número entero mayor a 0' },
        { status: 400 }
      );
    }

    if (capacity > 100) {
      return NextResponse.json(
        { error: 'La capacidad no puede ser mayor a 100 puntos' },
        { status: 400 }
      );
    }

    // Verificar que el transporte existe
    const existingTransport = await prisma.transport.findUnique({
      where: { id }
    });

    if (!existingTransport) {
      return NextResponse.json(
        { error: 'Transporte no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar configuración
    const updatedTransport = await prisma.transport.update({
      where: { id },
      data: {
        totalCapacity: capacity
      }
    });

    return NextResponse.json(updatedTransport);
  } catch (error) {
    console.error('Error al actualizar configuración de transporte:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración de transporte' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}