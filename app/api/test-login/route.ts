import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { correo, password } = body;

    console.log('[TEST LOGIN] Intentando login con:', { correo, password: password ? '***' : 'undefined' });

    if (!correo || !password) {
      return NextResponse.json({ 
        success: false, 
        error: 'Faltan credenciales',
        received: { correo: !!correo, password: !!password }
      }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { correo }
    });

    console.log('[TEST LOGIN] Usuario encontrado:', {
      found: !!user,
      active: user?.activo,
      perfil: user?.perfil
    });

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Usuario no encontrado',
        correo 
      }, { status: 404 });
    }

    if (!user.activo) {
      return NextResponse.json({ 
        success: false, 
        error: 'Usuario inactivo' 
      }, { status: 403 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('[TEST LOGIN] Password válido:', isPasswordValid);

    if (!isPasswordValid) {
      return NextResponse.json({ 
        success: false, 
        error: 'Password inválido' 
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        perfil: user.perfil,
        codigo_vendedor: user.codigo_vendedor
      },
      message: 'Credenciales válidas - problema está en NextAuth'
    });

  } catch (error) {
    console.error('[TEST LOGIN] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}