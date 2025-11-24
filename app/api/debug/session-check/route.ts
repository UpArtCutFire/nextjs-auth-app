export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        error: 'No session found',
        hasSession: false 
      });
    }

    console.log('[SESSION DEBUG] Session data:', {
      user: session.user,
      userEmail: session.user?.email,
      userEmailType: typeof session.user?.email
    });

    // Buscar usuario por correo
    const userByCorreo = await prisma.user.findUnique({
      where: { correo: session.user?.email ?? '' }
    });

    // Buscar usuario por email
    const userByEmail = await prisma.user.findUnique({
      where: { email: session.user?.email ?? '' }
    });

    // Listar todos los usuarios para debug
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        nombre: true,
        correo: true,
        email: true,
        perfil: true,
        activo: true
      }
    });

    return NextResponse.json({
      hasSession: true,
      session: session,
      sessionUserEmail: session.user?.email,
      userByCorreo: userByCorreo,
      userByEmail: userByEmail,
      allUsers: allUsers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SESSION DEBUG] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}