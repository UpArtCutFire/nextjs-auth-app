import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Obtener todas las equivalencias de tallas
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener todas las equivalencias
    let equivalences = await prisma.sizeEquivalence.findMany({
      orderBy: { size: 'asc' }
    });

    // Si no existen equivalencias, crear las por defecto
    if (equivalences.length === 0) {
      const defaultEquivalences = [
        { size: 'S' as const, value: 1, description: 'Pequeño' },
        { size: 'M' as const, value: 2, description: 'Mediano' },
        { size: 'L' as const, value: 3, description: 'Grande' },
        { size: 'XL' as const, value: 4, description: 'Extra Grande' },
        { size: 'XXL' as const, value: 10, description: 'Extra Extra Grande' }
      ];

      for (const eq of defaultEquivalences) {
        await prisma.sizeEquivalence.create({
          data: eq
        });
      }

      equivalences = await prisma.sizeEquivalence.findMany({
        orderBy: { size: 'asc' }
      });
    }

    return NextResponse.json(equivalences);
  } catch (error) {
    console.error('Error al obtener equivalencias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar equivalencias de tallas (solo administradores)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea administrador
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    const userProfile = (session.user as any)?.perfil;
    const isAdmin = user?.perfil === 'administrador' || 
                   userProfile === 'administrador' ||
                   session.user?.email === 'john@doe.com' || 
                   session.user?.email === 'admin@test.com';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Acceso denegado - Solo administradores pueden modificar equivalencias' }, { status: 403 });
    }

    const body = await request.json();
    const { equivalences } = body;

    if (!equivalences || !Array.isArray(equivalences)) {
      return NextResponse.json(
        { error: 'Datos de equivalencias inválidos' },
        { status: 400 }
      );
    }

    // Validar que todas las equivalencias tengan los campos requeridos
    const validSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    for (const eq of equivalences) {
      if (!eq.size || !validSizes.includes(eq.size)) {
        return NextResponse.json(
          { error: `Talla inválida: ${eq.size}. Las tallas válidas son: ${validSizes.join(', ')}` },
          { status: 400 }
        );
      }
      
      if (typeof eq.value !== 'number' || eq.value < 1 || eq.value > 50) {
        return NextResponse.json(
          { error: `Valor inválido para talla ${eq.size}. Debe ser un número entre 1 y 50` },
          { status: 400 }
        );
      }
    }

    // Verificar que no haya tallas duplicadas
    const sizes = equivalences.map((eq: any) => eq.size);
    const uniqueSizes = [...new Set(sizes)];
    if (sizes.length !== uniqueSizes.length) {
      return NextResponse.json(
        { error: 'No se pueden tener tallas duplicadas' },
        { status: 400 }
      );
    }

    // Actualizar cada equivalencia
    const updatedEquivalences = [];
    for (const eq of equivalences) {
      const updated = await prisma.sizeEquivalence.upsert({
        where: { size: eq.size },
        update: {
          value: eq.value,
          description: eq.description || null
        },
        create: {
          size: eq.size,
          value: eq.value,
          description: eq.description || null
        }
      });
      updatedEquivalences.push(updated);
    }

    return NextResponse.json(updatedEquivalences);
  } catch (error) {
    console.error('Error al actualizar equivalencias:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}