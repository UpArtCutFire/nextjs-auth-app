import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const transportes = await prisma.transport.findMany({
      orderBy: {
        nombre: 'asc'
      }
    });

    return NextResponse.json(transportes);
  } catch (error) {
    console.error('Error al obtener transportes:', error);
    return NextResponse.json(
      { error: 'Error al obtener transportes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { patente, nombre, talla } = body;

    if (!patente || !nombre || !talla) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    const existingTransport = await prisma.transport.findUnique({
      where: { patente }
    });

    if (existingTransport) {
      return NextResponse.json(
        { error: 'Ya existe un transporte con esa patente' },
        { status: 400 }
      );
    }

    const transporte = await prisma.transport.create({
      data: {
        patente: patente.toUpperCase(),
        nombre,
        talla
      }
    });

    return NextResponse.json(transporte, { status: 201 });
  } catch (error) {
    console.error('Error al crear transporte:', error);
    return NextResponse.json(
      { error: 'Error al crear transporte' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, patente, nombre, talla, activo, totalCapacity } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      );
    }

    const existingTransport = await prisma.transport.findUnique({
      where: { id }
    });

    if (!existingTransport) {
      return NextResponse.json(
        { error: 'Transporte no encontrado' },
        { status: 404 }
      );
    }

    if (patente && patente !== existingTransport.patente) {
      const duplicatePatente = await prisma.transport.findUnique({
        where: { patente: patente.toUpperCase() }
      });

      if (duplicatePatente) {
        return NextResponse.json(
          { error: 'Ya existe otro transporte con esa patente' },
          { status: 400 }
        );
      }
    }

    const updatedTransport = await prisma.transport.update({
      where: { id },
      data: {
        ...(patente && { patente: patente.toUpperCase() }),
        ...(nombre && { nombre }),
        ...(talla && { talla }),
        ...(activo !== undefined && { activo }),
        ...(totalCapacity !== undefined && { totalCapacity })
      }
    });

    return NextResponse.json(updatedTransport);
  } catch (error) {
    console.error('Error al actualizar transporte:', error);
    return NextResponse.json(
      { error: 'Error al actualizar transporte' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del transporte es requerido' },
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

    // Verificar si el transporte tiene despachos asignados
    const dispatchCount = await prisma.dispatch.count({
      where: { transportId: id }
    });

    if (dispatchCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar el transporte porque tiene ${dispatchCount} despacho${dispatchCount > 1 ? 's' : ''} asignado${dispatchCount > 1 ? 's' : ''}. Primero debes reasignar o eliminar los despachos.` },
        { status: 400 }
      );
    }

    // Eliminar el transporte
    await prisma.transport.delete({
      where: { id }
    });

    return NextResponse.json({ 
      message: 'Transporte eliminado exitosamente',
      deletedTransport: existingTransport 
    });

  } catch (error) {
    console.error('Error al eliminar transporte:', error);
    return NextResponse.json(
      { error: 'Error al eliminar transporte' },
      { status: 500 }
    );
  }
}