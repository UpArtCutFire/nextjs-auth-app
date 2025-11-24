
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// GET - Obtener una verificación específica
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    const verification = await prisma.paymentVerification.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            codigo_vendedor: true,
            perfil: true,
          },
        },
        approver: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (!verification) {
      return NextResponse.json(
        { success: false, error: 'Verificación no encontrada' },
        { status: 404 }
      );
    }

    // Los vendedores y planificadores solo pueden ver sus propias verificaciones
    if ((user.perfil === 'vendedor' || user.perfil === 'planificador') && verification.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para ver esta verificación' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      verification,
    });

  } catch (error) {
    console.error('Error obteniendo verificación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar una verificación (aprobar/rechazar)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    
    // Solo administradores pueden aprobar/rechazar pagos
    if (user.perfil !== 'administrador') {
      return NextResponse.json(
        { success: false, error: 'Solo administradores pueden aprobar o rechazar pagos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, rejectionReason, status } = body;

    // Nuevo flujo: editar estado directamente
    if (status && ['APPROVED', 'REJECTED'].includes(status)) {
      // Validar motivo de rechazo si es necesario
      if (status === 'REJECTED' && !rejectionReason) {
        return NextResponse.json(
          { success: false, error: 'Se requiere una razón para rechazar el pago' },
          { status: 400 }
        );
      }

      // Verificar que la verificación existe
      const existingVerification = await prisma.paymentVerification.findUnique({
        where: { id: params.id },
      });

      if (!existingVerification) {
        return NextResponse.json(
          { success: false, error: 'Verificación no encontrada' },
          { status: 404 }
        );
      }

      // Actualizar verificación
      const updateData: any = {
        status: status,
        approvedBy: user.id,
        approvedAt: new Date(),
      };

      if (status === 'REJECTED') {
        updateData.rejectionReason = rejectionReason;
      } else {
        updateData.rejectionReason = null; // Limpiar motivo si se aprueba
      }

      const updatedVerification = await prisma.paymentVerification.update({
        where: { id: params.id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              codigo_vendedor: true,
              perfil: true,
            },
          },
          approver: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        verification: updatedVerification,
        message: status === 'APPROVED' 
          ? 'Pago aprobado exitosamente' 
          : 'Pago rechazado exitosamente',
      });
    }

    // Flujo original con action
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Acción no válida. Use "approve" o "reject" o proporcione "status"' },
        { status: 400 }
      );
    }

    // Si es rechazo, requiere razón
    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json(
        { success: false, error: 'Se requiere una razón para rechazar el pago' },
        { status: 400 }
      );
    }

    // Verificar que la verificación existe y está pendiente
    const existingVerification = await prisma.paymentVerification.findUnique({
      where: { id: params.id },
    });

    if (!existingVerification) {
      return NextResponse.json(
        { success: false, error: 'Verificación no encontrada' },
        { status: 404 }
      );
    }

    if (existingVerification.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Esta verificación ya fue ${existingVerification.status === 'APPROVED' ? 'aprobada' : 'rechazada'}` },
        { status: 400 }
      );
    }

    // Actualizar verificación
    const updateData: any = {
      status: action === 'approve' ? 'APPROVED' : 'REJECTED',
      approvedBy: user.id,
      approvedAt: new Date(),
    };

    if (action === 'reject') {
      updateData.rejectionReason = rejectionReason;
    }

    const updatedVerification = await prisma.paymentVerification.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            codigo_vendedor: true,
            perfil: true,
          },
        },
        approver: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      verification: updatedVerification,
      message: action === 'approve' 
        ? 'Pago aprobado exitosamente' 
        : 'Pago rechazado exitosamente',
    });

  } catch (error) {
    console.error('Error actualizando verificación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar verificación de pago
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    
    // Solo vendedores pueden actualizar verificaciones
    if (user.perfil !== 'vendedor') {
      return NextResponse.json(
        { success: false, error: 'Solo vendedores pueden actualizar verificaciones' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Verificar que la verificación existe y pertenece al usuario
    const existingVerification = await prisma.paymentVerification.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingVerification) {
      return NextResponse.json(
        { success: false, error: 'Verificación no encontrada' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const comment = formData.get('comment') as string;
    const documentInfo = formData.get('documentInfo') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const photo = formData.get('photo') as File | null;

    // Validar método de pago si se proporciona
    if (paymentMethod) {
      const validPaymentMethods = ['efectivo', 'transferencia', 'webpay', 'flete'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        return NextResponse.json(
          { success: false, error: 'Método de pago no válido' },
          { status: 400 }
        );
      }
    }

    let photoUrl = existingVerification.photoUrl;

    // Si hay nueva foto, procesarla
    if (photo && photo.size > 0) {
      // Validar que el archivo sea una imagen
      if (!photo.type.startsWith('image/')) {
        return NextResponse.json(
          { success: false, error: 'El archivo debe ser una imagen' },
          { status: 400 }
        );
      }

      // Validar tamaño del archivo (máximo 5MB)
      if (photo.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'La imagen no puede superar los 5MB' },
          { status: 400 }
        );
      }

      // Crear directorio para uploads si no existe
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'payment-verifications');
      try {
        await mkdir(uploadsDir, { recursive: true });
      } catch (error) {
        // Directorio ya existe
      }

      // Generar nombre único para el archivo
      const fileExtension = photo.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = join(uploadsDir, fileName);

      // Guardar archivo
      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Eliminar foto anterior si existe
      if (existingVerification.photoUrl) {
        const oldFilePath = join(process.cwd(), 'public', existingVerification.photoUrl);
        try {
          await unlink(oldFilePath);
        } catch (error) {
          console.log('No se pudo eliminar foto anterior:', error);
        }
      }

      // URL relativa para almacenar en BD
      photoUrl = `/uploads/payment-verifications/${fileName}`;
    }

    // Actualizar verificación
    const verification = await prisma.paymentVerification.update({
      where: { id },
      data: {
        ...(comment && { comment }),
        ...(documentInfo && { documentInfo }),
        ...(paymentMethod && { paymentMethod: paymentMethod as any }),
        photoUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            codigo_vendedor: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      verification,
      message: 'Verificación actualizada exitosamente',
    });

  } catch (error) {
    console.error('Error actualizando verificación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar verificación de pago
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    // Obtener la verificación
    const verification = await prisma.paymentVerification.findUnique({
      where: { id: params.id },
    });

    if (!verification) {
      return NextResponse.json(
        { success: false, error: 'Verificación no encontrada' },
        { status: 404 }
      );
    }

    // Solo el creador o un administrador puede eliminar
    if (verification.userId !== user.id && user.perfil !== 'administrador') {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para eliminar esta verificación' },
        { status: 403 }
      );
    }

    // Los vendedores y planificadores solo pueden eliminar verificaciones pendientes
    // Los administradores pueden eliminar cualquier verificación
    if ((user.perfil === 'vendedor' || user.perfil === 'planificador') && verification.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden eliminar verificaciones pendientes' },
        { status: 400 }
      );
    }

    // Eliminar archivo de foto si existe
    if (verification.photoUrl) {
      const filePath = join(process.cwd(), 'public', verification.photoUrl);
      try {
        await unlink(filePath);
      } catch (error) {
        console.log('No se pudo eliminar foto:', error);
      }
    }

    // Eliminar verificación de base de datos
    await prisma.paymentVerification.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Verificación eliminada exitosamente',
    });

  } catch (error) {
    console.error('Error eliminando verificación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
