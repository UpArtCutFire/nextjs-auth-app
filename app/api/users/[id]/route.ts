
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que el usuario sea administrador
    const user = await prisma.user.findUnique({
      where: { correo: session.user?.email ?? '' }
    });

    if (!user || user.perfil !== 'administrador') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      nombre,
      correo,
      rut,
      activo,
      perfil,
      codigo_vendedor,
      porcentaje_comision,
      comision_base,
      password,
    } = body;

    // Verificar si el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el correo ya existe (excepto para el usuario actual)
    if (correo && correo !== existingUser.correo) {
      const emailExists = await prisma.user.findUnique({
        where: { correo }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: 'El correo ya está en uso' },
          { status: 400 }
        );
      }
    }

    // Verificar si el RUT ya existe (excepto para el usuario actual)
    if (rut && rut !== existingUser.rut) {
      const rutExists = await prisma.user.findUnique({
        where: { rut }
      });

      if (rutExists) {
        return NextResponse.json(
          { error: 'El RUT ya está en uso' },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {};

    if (nombre !== undefined) updateData.nombre = nombre;
    if (correo !== undefined) {
      updateData.correo = correo;
      updateData.email = correo; // NextAuth field
    }
    if (rut !== undefined) updateData.rut = rut;
    if (activo !== undefined) updateData.activo = activo;
    if (perfil !== undefined) updateData.perfil = perfil;
    if (codigo_vendedor !== undefined) updateData.codigo_vendedor = codigo_vendedor || null;
    if (porcentaje_comision !== undefined) updateData.porcentaje_comision = porcentaje_comision || null;
    if (comision_base !== undefined) updateData.comision_base = comision_base || null;
    if (nombre !== undefined) updateData.name = nombre; // NextAuth field

    // Si se proporciona una nueva contraseña, hashearla
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Actualizar el usuario
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        nombre: true,
        correo: true,
        rut: true,
        activo: true,
        perfil: true,
        codigo_vendedor: true,
        porcentaje_comision: true,
        comision_base: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que el usuario sea administrador
    const user = await prisma.user.findUnique({
      where: { correo: session.user?.email ?? '' }
    });

    if (!user || user.perfil !== 'administrador') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // No permitir eliminar su propia cuenta
    if (user.id === params.id) {
      return NextResponse.json(
        { error: 'No puede eliminar su propia cuenta' },
        { status: 400 }
      );
    }

    // Verificar si el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar el usuario
    await prisma.user.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
