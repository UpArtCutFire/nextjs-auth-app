
export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// GET - Obtener verificaciones de pago
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    
    // Solo vendedores y administradores pueden acceder
    if (user.perfil !== 'vendedor' && user.perfil !== 'administrador') {
      return NextResponse.json(
        { success: false, error: 'Solo vendedores y administradores pueden acceder a verificaciones' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentNumber = searchParams.get('documentNumber');
    const documentType = searchParams.get('documentType');

    // Construir filtros
    const where: any = {};
    
    // Los vendedores solo ven sus propias verificaciones
    // Los administradores ven todas las verificaciones
    if (user.perfil === 'vendedor') {
      where.userId = user.id;
    }

    if (documentNumber) {
      where.documentNumber = documentNumber;
    }

    if (documentType) {
      where.documentType = documentType;
    }

    const verifications = await prisma.paymentVerification.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            codigo_vendedor: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      verifications,
    });

  } catch (error) {
    console.error('Error obteniendo verificaciones:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva verificación de pago
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    
    // Solo vendedores y administradores pueden crear verificaciones
    if (user.perfil !== 'vendedor' && user.perfil !== 'administrador') {
      return NextResponse.json(
        { success: false, error: 'Solo vendedores y administradores pueden crear verificaciones' },
        { status: 403 }
      );
    }

    console.log('🔍 DEBUG - Datos del usuario en sesión:', {
      userId: user.id,
      nombre: user.nombre,
      email: user.email,
      perfil: user.perfil,
      codigo_vendedor: user.codigo_vendedor,
      sessionKeys: Object.keys(user)
    });

    // Validar que el usuario tenga código de vendedor asignado
    if (!user.codigo_vendedor) {
      console.log('❌ ERROR - Usuario sin código de vendedor:', {
        userId: user.id,
        nombre: user.nombre,
        perfil: user.perfil,
        codigo_vendedor: user.codigo_vendedor
      });
      return NextResponse.json(
        { success: false, error: 'Usuario sin código de vendedor asignado' },
        { status: 400 }
      );
    }

    console.log('✅ Usuario válido con código de vendedor:', user.codigo_vendedor);

    const formData = await request.formData();
    const documentNumber = formData.get('documentNumber') as string;
    const documentType = formData.get('documentType') as string;
    const comment = formData.get('comment') as string;
    const documentInfo = formData.get('documentInfo') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const photo = formData.get('photo') as File;

    // Validaciones básicas
    if (!documentNumber || !documentType || !comment || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Los campos documento, comentario y método de pago son requeridos' },
        { status: 400 }
      );
    }

    // Validar método de pago
    const validPaymentMethods = ['efectivo', 'transferencia', 'webpay'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Método de pago no válido' },
        { status: 400 }
      );
    }

    // Para transferencia y webpay, la foto es obligatoria
    // Para efectivo, la foto es opcional
    const isPhotoRequired = paymentMethod !== 'efectivo';
    
    if (isPhotoRequired && !photo) {
      return NextResponse.json(
        { success: false, error: 'Para transferencias y pagos con tarjeta, la foto del comprobante es obligatoria' },
        { status: 400 }
      );
    }

    // Si hay foto, validar que sea imagen válida
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
    }

    let photoUrl = null;

    // Solo procesar foto si existe
    if (photo && photo.size > 0) {
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

      // URL relativa para almacenar en BD
      photoUrl = `/uploads/payment-verifications/${fileName}`;
    }

    // Crear verificación en base de datos usando el código de vendedor del usuario en sesión
    const verification = await prisma.paymentVerification.create({
      data: {
        documentNumber,
        documentType,
        vendorCode: user.codigo_vendedor, // Usar el código del usuario en sesión
        comment,
        documentInfo,
        paymentMethod: paymentMethod as any, // Cast to enum
        photoUrl, // Puede ser null para efectivo
        userId: user.id,
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
      message: 'Verificación de pago creada exitosamente',
    });

  } catch (error) {
    console.error('Error creando verificación:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
