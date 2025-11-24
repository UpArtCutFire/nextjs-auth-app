
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
    
    // Solo vendedores, planificadores y administradores pueden acceder
    if (user.perfil !== 'vendedor' && user.perfil !== 'planificador' && user.perfil !== 'administrador') {
      return NextResponse.json(
        { success: false, error: 'Solo vendedores, planificadores y administradores pueden acceder a verificaciones' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const documentNumber = searchParams.get('documentNumber');
    const documentNumbers = searchParams.get('documentNumbers');
    const documentType = searchParams.get('documentType');

    // Construir filtros
    const where: any = {};
    
    // Los vendedores y planificadores solo ven sus propias verificaciones
    // Los administradores ven todas las verificaciones
    if (user.perfil === 'vendedor' || user.perfil === 'planificador') {
      where.userId = user.id;
    }

    // Soporte para múltiples números de documento
    if (documentNumbers) {
      const numbersArray = documentNumbers.split(',').filter(n => n.trim());
      where.documentNumber = {
        in: numbersArray
      };
    } else if (documentNumber) {
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      verifications,
    });

  } catch (error) {
    console.error('Error obteniendo verificaciones:', {
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
    
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al obtener verificaciones' },
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
    
    // Solo vendedores, planificadores y administradores pueden crear verificaciones
    if (user.perfil !== 'vendedor' && user.perfil !== 'planificador' && user.perfil !== 'administrador') {
      return NextResponse.json(
        { success: false, error: 'Solo vendedores, planificadores y administradores pueden crear verificaciones' },
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

    // Validar código de vendedor según el perfil del usuario
    if ((user.perfil === 'vendedor' || user.perfil === 'planificador') && !user.codigo_vendedor) {
      console.log('❌ ERROR - Vendedor/Planificador sin código de vendedor:', {
        userId: user.id,
        nombre: user.nombre,
        perfil: user.perfil,
        codigo_vendedor: user.codigo_vendedor
      });
      return NextResponse.json(
        { success: false, error: 'Los vendedores requieren tener un código de vendedor asignado' },
        { status: 400 }
      );
    }

    // Para administradores, usar un código genérico si no tienen uno asignado
    const vendorCodeToUse = user.codigo_vendedor || (user.perfil === 'administrador' ? 'ADMIN' : null);
    
    if (!vendorCodeToUse) {
      return NextResponse.json(
        { success: false, error: 'No se pudo determinar el código de vendedor para el usuario' },
        { status: 400 }
      );
    }

    console.log('✅ Usuario válido con código de vendedor:', vendorCodeToUse);

    const formData = await request.formData();
    const documentNumber = formData.get('documentNumber') as string;
    const documentType = formData.get('documentType') as string;
    const comment = formData.get('comment') as string;
    const documentInfo = formData.get('documentInfo') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const amount = formData.get('amount') as string;
    const photo = formData.get('photo') as File;

    // Validaciones básicas
    if (!documentNumber || !documentType || !comment || !paymentMethod || !amount) {
      return NextResponse.json(
        { success: false, error: 'Los campos documento, comentario, método de pago y monto son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el monto sea un número válido
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'El monto debe ser un número válido mayor a 0' },
        { status: 400 }
      );
    }

    // Validar método de pago
    const validPaymentMethods = ['efectivo', 'transferencia', 'webpay', 'flete'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Método de pago no válido' },
        { status: 400 }
      );
    }

    // Para transferencia y webpay, la foto es obligatoria
    // Para efectivo y flete, la foto es opcional
    const isPhotoRequired = paymentMethod !== 'efectivo' && paymentMethod !== 'flete';
    
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

    // Crear verificación en base de datos usando el código de vendedor determinado
    const verification = await prisma.paymentVerification.create({
      data: {
        documentNumber,
        documentType,
        vendorCode: vendorCodeToUse, // Usar el código determinado según el perfil
        comment,
        documentInfo,
        paymentMethod: paymentMethod as any, // Cast to enum
        photoUrl, // Puede ser null para efectivo
        userId: user.id,
        amount: numericAmount, // Usar el monto validado del formulario
        status: 'PENDING', // Estado inicial pendiente
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            codigo_vendedor: true,
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
      verification,
      message: 'Verificación de pago creada exitosamente',
    });

  } catch (error) {
    console.error('Error creando verificación:', {
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Categorizar errores para mejor experiencia de usuario
    if (error instanceof Error) {
      if (error.message.includes('unique constraint') || error.message.includes('UNIQUE constraint')) {
        return NextResponse.json(
          { success: false, error: 'Ya existe una verificación para este documento' },
          { status: 409 }
        );
      }
      
      if (error.message.includes('foreign key') || error.message.includes('FOREIGN KEY')) {
        return NextResponse.json(
          { success: false, error: 'Error de referencia en base de datos' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al crear la verificación' },
      { status: 500 }
    );
  }
}
