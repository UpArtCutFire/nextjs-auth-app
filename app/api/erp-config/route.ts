import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.perfil !== 'administrador') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener la configuración actual
    const config = await prisma.eRPConfig.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        txtrutempresa: true,
        txtusuario: true,
        txtpwd: true,
      }
    });

    return NextResponse.json(config || null);
  } catch (error) {
    console.error('Error fetching ERP config:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.perfil !== 'administrador') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { txtrutempresa, txtusuario, txtpwd } = body;

    if (!txtrutempresa || !txtusuario || !txtpwd) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe una configuración
    const existingConfig = await prisma.eRPConfig.findFirst();

    let config;
    if (existingConfig) {
      // Actualizar la configuración existente
      config = await prisma.eRPConfig.update({
        where: { id: existingConfig.id },
        data: {
          txtrutempresa,
          txtusuario,
          txtpwd,
        },
      });
    } else {
      // Crear nueva configuración
      config = await prisma.eRPConfig.create({
        data: {
          txtrutempresa,
          txtusuario,
          txtpwd,
        },
      });
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('Error saving ERP config:', error);
    return NextResponse.json(
      { error: 'Error al guardar configuración' },
      { status: 500 }
    );
  }
}