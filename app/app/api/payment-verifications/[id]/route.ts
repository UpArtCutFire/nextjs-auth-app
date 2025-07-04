
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

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
      const validPaymentMethods = ['efectivo', 'transferencia', 'webpay'];
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
    
    // Solo vendedores pueden eliminar verificaciones
    if (user.perfil !== 'vendedor') {
      return NextResponse.json(
        { success: false, error: 'Solo vendedores pueden eliminar verificaciones' },
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

    // Eliminar archivo de foto
    if (existingVerification.photoUrl) {
      const filePath = join(process.cwd(), 'public', existingVerification.photoUrl);
      try {
        await unlink(filePath);
      } catch (error) {
        console.log('No se pudo eliminar foto:', error);
      }
    }

    // Eliminar verificación de base de datos
    await prisma.paymentVerification.delete({
      where: { id },
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
