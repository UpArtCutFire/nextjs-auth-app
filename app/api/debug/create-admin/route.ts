import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { correo: 'admin@test.com' }
    });

    if (existingAdmin) {
      return NextResponse.json({ message: 'Admin already exists', user: existingAdmin });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = await prisma.user.create({
      data: {
        nombre: 'Administrador Test',
        correo: 'admin@test.com',
        rut: '12345678-9',
        activo: true,
        perfil: 'administrador',
        password: hashedPassword,
        name: 'Administrador Test',
        email: 'admin@test.com',
      },
    });

    console.log('[DEBUG] Admin created:', {
      id: admin.id,
      nombre: admin.nombre,
      correo: admin.correo,
      perfil: admin.perfil,
      activo: admin.activo
    });

    return NextResponse.json({ 
      message: 'Admin created successfully', 
      user: {
        id: admin.id,
        nombre: admin.nombre,
        correo: admin.correo,
        perfil: admin.perfil,
        activo: admin.activo
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] Error creating admin:', error);
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
  }
}