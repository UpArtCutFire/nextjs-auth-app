
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener usuarios vendedores con información de comisión
    const vendors = await prisma.user.findMany({
      where: {
        activo: true,
        perfil: 'vendedor',
        codigo_vendedor: {
          not: null
        }
      },
      select: {
        id: true,
        nombre: true,
        codigo_vendedor: true,
        porcentaje_comision: true,
        comision_base: true,
        perfil: true,
      },
    });

    return NextResponse.json({ 
      success: true,
      vendors 
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal Server Error' 
      },
      { status: 500 }
    );
  }
}
