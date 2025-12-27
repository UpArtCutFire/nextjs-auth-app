export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Límites de validación (igual que payment-verifications: 5MB por foto)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB por archivo

export async function POST(request: Request) {
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

    while (true) {
      const photoFile = formData.get(`photo${photoIndex}`) as File;
      if (!photoFile || photoFile.size === 0) break;

      // Validar que sea imagen
      if (!photoFile.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `El archivo ${photoIndex + 1} no es una imagen válida` },
          { status: 400 }
        );
      }

      // Validar tamaño individual (5MB como payment-verifications)
      if (photoFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `La foto ${photoIndex + 1} excede el límite de 5MB. Por favor reduce el tamaño de la imagen.` },
          { status: 400 }
        );
      }

      photoFiles.push(photoFile);
      photoIndex++;
    }

    // Para RETIRO_LOCAL las fotos son opcionales (cliente firma en persona)
    // Para otros tipos de despacho, las fotos son obligatorias
    const isRetiroLocal = dispatch.tipoDespacho === 'RETIRO_LOCAL';

    if (photoFiles.length === 0 && !isRetiroLocal) {
      return NextResponse.json(
        { error: 'Debe subir al menos una foto de evidencia' },
        { status: 400 }
      );
    }

    console.log(`[Complete Dispatch] Procesando ${photoFiles.length} fotos (tipoDespacho: ${dispatch.tipoDespacho})`);

    let photoPromises: Promise<any>[] = [];

    // Solo procesar fotos si hay alguna
    if (photoFiles.length > 0) {
      // Crear directorio para fotos si no existe
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'delivery-photos');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      // Guardar fotos y crear registros
      photoPromises = photoFiles.map(async (file, index) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generar nombre único usando UUID (igual que payment-verifications)
        let extension = 'jpg'; // Default para fotos de cámara

        if (file.name && file.name.includes('.')) {
          extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        } else if (file.type) {
          // Usar el tipo MIME para determinar extensión
          const mimeToExt: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/heic': 'heic',
            'image/heif': 'heif'
          };
          extension = mimeToExt[file.type] || 'jpg';
        }

        const fileName = `${uuidv4()}.${extension}`;
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
    }

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
      // Crear registros de fotos (si hay)
      ...photoPromises
    ]);

    const message = isRetiroLocal
      ? 'Retiro completado correctamente'
      : 'Entrega completada correctamente';

    return NextResponse.json({
      message,
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