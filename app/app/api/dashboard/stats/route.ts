
import { NextResponse } from 'next/server';
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

    // Verificar que el usuario sea administrador
    const user = await prisma.user.findUnique({
      where: { correo: session.user?.email ?? '' }
    });

    if (!user || user.perfil !== 'administrador') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener estadísticas
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { activo: true }
    });
    const totalVendedores = await prisma.user.count({
      where: { perfil: 'vendedor' }
    });

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalVendedores,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
