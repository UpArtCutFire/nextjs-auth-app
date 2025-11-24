import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentNumber = searchParams.get('documentNumber');
    const documentType = searchParams.get('documentType');

    if (!documentNumber || !documentType) {
      return NextResponse.json(
        { error: 'Número y tipo de documento son requeridos' },
        { status: 400 }
      );
    }

    const dispatch = await prisma.dispatch.findFirst({
      where: {
        documentNumber,
        documentType
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            correo: true
          }
        },
        branch: {
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true
          }
        }
      }
    });

    return NextResponse.json(dispatch);
  } catch (error) {
    console.error('Error al obtener despacho:', error);
    return NextResponse.json(
      { error: 'Error al obtener despacho' },
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
    const {
      documentNumber,
      documentType,
      vendorCode,
      direccion,
      comuna,
      region,
      telefono,
      correo,
      tamanoDespacho,
      tipoDespacho,
      branchId,
      clienteNombre,
      suggestedDeliveryDate,
      documentInfo
    } = body;

    // Validaciones base
    if (!documentNumber || !documentType || !vendorCode || !tamanoDespacho || !tipoDespacho || !clienteNombre) {
      return NextResponse.json(
        { error: 'Los campos básicos son requeridos' },
        { status: 400 }
      );
    }

    // Validar que se seleccione sucursal para RETIRO_LOCAL y DESPACHO
    if ((tipoDespacho === 'RETIRO_LOCAL' || tipoDespacho === 'DESPACHO') && !branchId) {
      return NextResponse.json(
        { error: 'Debe seleccionar una sucursal para retiro local o despacho' },
        { status: 400 }
      );
    }

    // Para Courier y Despacho, la dirección es obligatoria
    if (tipoDespacho !== 'RETIRO_LOCAL') {
      if (!direccion || !comuna || !region) {
        return NextResponse.json(
          { error: 'Dirección, comuna y región son obligatorios para courier y despacho' },
          { status: 400 }
        );
      }
    }

    // Verificar si ya existe un despacho para este documento
    const existingDispatch = await prisma.dispatch.findFirst({
      where: {
        documentNumber,
        documentType
      }
    });

    if (existingDispatch) {
      return NextResponse.json(
        { error: 'Ya existe un despacho para este documento' },
        { status: 400 }
      );
    }

    const dispatch = await prisma.dispatch.create({
      data: {
        documentNumber,
        documentType,
        vendorCode,
        direccion,
        comuna,
        region,
        telefono,
        correo,
        tamanoDespacho,
        tipoDespacho,
        branchId: branchId || null,
        clienteNombre,
        userId: session.user.id,
        documentInfo: documentInfo || null,
        ...(suggestedDeliveryDate && { 
          suggestedDeliveryDate: (() => {
            // Handle date properly to avoid timezone issues
            if (suggestedDeliveryDate.includes('T')) {
              return new Date(suggestedDeliveryDate);
            } else {
              // Parse YYYY-MM-DD format using local time
              const [year, month, day] = suggestedDeliveryDate.split('-').map(Number);
              return new Date(year, month - 1, day, 12, 0, 0); // Set to noon to avoid date shifts
            }
          })()
        })
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            correo: true
          }
        },
        branch: {
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true
          }
        }
      }
    });

    return NextResponse.json(dispatch, { status: 201 });
  } catch (error) {
    console.error('Error al crear despacho:', error);
    return NextResponse.json(
      { error: 'Error al crear despacho' },
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
    const {
      id,
      direccion,
      comuna,
      region,
      telefono,
      correo,
      tamanoDespacho,
      tipoDespacho,
      branchId,
      suggestedDeliveryDate
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del despacho es requerido' },
        { status: 400 }
      );
    }

    const existingDispatch = await prisma.dispatch.findUnique({
      where: { id }
    });

    if (!existingDispatch) {
      return NextResponse.json(
        { error: 'Despacho no encontrado' },
        { status: 404 }
      );
    }

    // Solo el usuario que creó el despacho puede editarlo (o administradores)
    const userProfile = (session.user as any)?.perfil;
    const isAdmin = userProfile === 'administrador' || session.user?.email === 'john@doe.com';
    
    if (!isAdmin && existingDispatch.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar este despacho' },
        { status: 403 }
      );
    }

    // Los administradores solo pueden ver, no editar
    if (isAdmin && existingDispatch.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Los administradores solo pueden visualizar despachos' },
        { status: 403 }
      );
    }

    const updatedDispatch = await prisma.dispatch.update({
      where: { id },
      data: {
        ...(direccion && { direccion }),
        ...(comuna && { comuna }),
        ...(region && { region }),
        ...(telefono !== undefined && { telefono }),
        ...(correo !== undefined && { correo }),
        ...(tamanoDespacho && { tamanoDespacho }),
        ...(tipoDespacho && { tipoDespacho }),
        ...(branchId !== undefined && { branchId: branchId || null }),
        ...(suggestedDeliveryDate !== undefined && { 
          suggestedDeliveryDate: suggestedDeliveryDate ? (() => {
            // Handle date properly to avoid timezone issues
            if (suggestedDeliveryDate.includes('T')) {
              return new Date(suggestedDeliveryDate);
            } else {
              // Parse YYYY-MM-DD format using local time
              const [year, month, day] = suggestedDeliveryDate.split('-').map(Number);
              return new Date(year, month - 1, day, 12, 0, 0); // Set to noon to avoid date shifts
            }
          })() : null 
        })
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            correo: true
          }
        },
        branch: {
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true
          }
        }
      }
    });

    return NextResponse.json(updatedDispatch);
  } catch (error) {
    console.error('Error al actualizar despacho:', error);
    return NextResponse.json(
      { error: 'Error al actualizar despacho' },
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID del despacho es requerido' },
        { status: 400 }
      );
    }

    const existingDispatch = await prisma.dispatch.findUnique({
      where: { id }
    });

    if (!existingDispatch) {
      return NextResponse.json(
        { error: 'Despacho no encontrado' },
        { status: 404 }
      );
    }

    // Solo administradores pueden eliminar despachos
    const userProfile = (session.user as any)?.perfil;
    const isAdmin = userProfile === 'administrador' || session.user?.email === 'john@doe.com';
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Solo los administradores pueden eliminar despachos' },
        { status: 403 }
      );
    }

    await prisma.dispatch.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Despacho eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar despacho:', error);
    return NextResponse.json(
      { error: 'Error al eliminar despacho' },
      { status: 500 }
    );
  }
}