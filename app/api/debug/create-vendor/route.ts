import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Check if vendor already exists
    const existingVendor = await prisma.user.findUnique({
      where: { correo: 'vendor@test.com' }
    });

    if (existingVendor) {
      return NextResponse.json({ message: 'Vendor already exists', user: existingVendor });
    }

    // Create vendor user
    const hashedPassword = await bcrypt.hash('vendor123', 12);
    
    const vendor = await prisma.user.create({
      data: {
        nombre: 'Vendedor Test',
        correo: 'vendor@test.com',
        rut: '98765432-1',
        activo: true,
        perfil: 'vendedor',
        codigo_vendedor: 'VEN001',
        porcentaje_comision: 5.0,
        comision_base: 50000,
        password: hashedPassword,
        name: 'Vendedor Test',
        email: 'vendor@test.com',
      },
    });

    console.log('[DEBUG] Vendor created:', {
      id: vendor.id,
      nombre: vendor.nombre,
      correo: vendor.correo,
      perfil: vendor.perfil,
      codigo_vendedor: vendor.codigo_vendedor,
      activo: vendor.activo
    });

    return NextResponse.json({ 
      message: 'Vendor created successfully', 
      user: {
        id: vendor.id,
        nombre: vendor.nombre,
        correo: vendor.correo,
        perfil: vendor.perfil,
        codigo_vendedor: vendor.codigo_vendedor,
        activo: vendor.activo
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] Error creating vendor:', error);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}