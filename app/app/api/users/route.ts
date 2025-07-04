
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function GET() {
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

    const users = await prisma.user.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Validar campos requeridos
    if (!nombre || !correo || !rut || !perfil || !password) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar si el correo ya existe
    const existingUser = await prisma.user.findUnique({
      where: { correo }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El correo ya está en uso' },
        { status: 400 }
      );
    }

    // Verificar si el RUT ya existe
    const existingRut = await prisma.user.findUnique({
      where: { rut }
    });

    if (existingRut) {
      return NextResponse.json(
        { error: 'El RUT ya está en uso' },
        { status: 400 }
      );
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear el nuevo usuario
    const newUser = await prisma.user.create({
      data: {
        nombre,
        correo,
        rut,
        activo: activo ?? true,
        perfil,
        codigo_vendedor: codigo_vendedor || null,
        porcentaje_comision: porcentaje_comision || null,
        comision_base: comision_base || null,
        password: hashedPassword,
        // Campos NextAuth
        name: nombre,
        email: correo,
      },
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

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
