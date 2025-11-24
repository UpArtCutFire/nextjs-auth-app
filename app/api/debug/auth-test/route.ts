import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { correo, password } = await request.json();
    
    console.log('[DEBUG] Testing login for:', correo);
    
    const user = await prisma.user.findUnique({
      where: { correo }
    });
    
    console.log('[DEBUG] User found:', {
      id: user?.id,
      nombre: user?.nombre,
      correo: user?.correo,
      perfil: user?.perfil,
      activo: user?.activo
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (!user.activo) {
      return NextResponse.json({ error: 'User inactive' }, { status: 401 });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('[DEBUG] Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        perfil: user.perfil,
        codigo_vendedor: user.codigo_vendedor,
        activo: user.activo
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}