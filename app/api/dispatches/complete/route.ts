import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const prisma = new PrismaClient();

// Configuración para App Router (Next.js 14+)
// El límite de body se maneja automáticamente con formData
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos de timeout para uploads grandes

// Límites de validación
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB por archivo
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const dispatchId = formData.get('dispatchId') as string;
    const driverId = formData.get('driverId') as string;
    const comment = formData.get('comment') as string || '';

    if (!dispatchId) {
      return NextResponse.json(
        { error: 'ID de despacho requerido' },
        { status: 400 }
      );
    }

    // Verificar que el despacho existe y está en estado IN_TRANSIT
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId }
    });

    if (!dispatch) {
      return NextResponse.json(
        { error: 'Despacho no encontrado' },
        { status: 404 }
      );
    }

    if (dispatch.status !== 'IN_TRANSIT') {
      return NextResponse.json(
        { error: 'El despacho debe estar en estado EN TRÁNSITO para poder completarse' },
        { status: 400 }
      );
    }

    // Extraer archivos de fotos con validación de tamaño
    const photoFiles: File[] = [];
    let photoIndex = 0;
    let totalSize = 0;

    while (true) {
      const photoFile = formData.get(`photo${photoIndex}`) as File;
      if (!photoFile) break;

      // Validar tamaño individual
      if (photoFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `La foto ${photoIndex + 1} excede el límite de 10MB` },
          { status: 400 }
        );
      }

      totalSize += photoFile.size;
      photoFiles.push(photoFile);
      photoIndex++;
    }

    // Validar tamaño total
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { error: 'El tamaño total de las fotos excede el límite de 50MB' },
        { status: 400 }
      );
    }

    if (photoFiles.length === 0) {
      return NextResponse.json(
        { error: 'Debe subir al menos una foto de evidencia' },
        { status: 400 }
      );
    }

    console.log(`[Complete Dispatch] Procesando ${photoFiles.length} fotos, tamaño total: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

    // Crear directorio para fotos si no existe
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'delivery-photos');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Guardar fotos y crear registros
    const photoPromises = photoFiles.map(async (file, index) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const fileName = `${dispatchId}-${timestamp}-${index}.${file.name.split('.').pop()}`;
      const filePath = join(uploadsDir, fileName);
      
      // Guardar archivo
      await writeFile(filePath, buffer);
      
      // Crear registro en la base de datos
      return prisma.deliveryPhoto.create({
        data: {
          dispatchId: dispatchId,
          photoUrl: `/uploads/delivery-photos/${fileName}`,
          comment: index === 0 ? comment : null // Solo el primer registro tiene el comentario
        }
      });
    });

    // Ejecutar todas las operaciones en paralelo
    const [updatedDispatch, ...photos] = await Promise.all([
      // Actualizar el despacho a DELIVERED
      prisma.dispatch.update({
        where: { id: dispatchId },
        data: {
          status: 'DELIVERED',
          completedAt: new Date(),
          driverId: driverId || session.user.id
        },
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              correo: true,
            }
          },
          transport: {
            select: {
              id: true,
              patente: true,
              nombre: true,
              talla: true,
            }
          },
          deliveryPhotos: {
            select: {
              id: true,
              photoUrl: true,
              comment: true,
              createdAt: true,
            }
          }
        }
      }),
      // Crear registros de fotos
      ...photoPromises
    ]);

    return NextResponse.json({
      message: 'Entrega completada correctamente',
      dispatch: updatedDispatch,
      photosUploaded: photos.length
    });

  } catch (error) {
    console.error('Error al completar entrega:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}